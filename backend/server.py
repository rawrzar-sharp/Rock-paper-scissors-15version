import json
import uuid
import random
import os
import urllib.parse
from typing import List, Dict, Optional
import time

import asyncio
import aio_pika
import redis
import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from fastapi import Request

# 1. Configuration
REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/%2F")

# 2. Setup Clients
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
fastapi_app = FastAPI()
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)
redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)

# 3. Helpers
def _session_key(session_id: str) -> str:
    return f"rps15:session:{session_id}"

def _get_state(session_id: str):
    raw = redis_client.get(_session_key(session_id))
    return json.loads(raw) if raw else None

def _set_state(session_id: str, state: dict) -> None:
    redis_client.set(_session_key(session_id), json.dumps(state))

async def _publish_game_event(session_id: str, event_type: str, payload: dict):
    try:
        connection = await aio_pika.connect_robust(RABBITMQ_URL)
        async with connection:
            channel = await connection.channel()
            exchange = await channel.declare_exchange("game_events", aio_pika.ExchangeType.TOPIC, durable=True)
            
            message_body = json.dumps({
                "session_id": session_id,
                "event_type": event_type,
                "payload": payload,
                "timestamp": time.time()
            })
            
            await exchange.publish(
                aio_pika.Message(body=message_body.encode(), delivery_mode=aio_pika.DeliveryMode.PERSISTENT),
                routing_key=f"game.{event_type}"
            )
    except Exception as e:
        print(f"RabbitMQ Publish Error: {e}")

# Official RPS15 Symmetrical Winning Ruleset Matrix
RPS15_WINS = {
    "Rock": ["Fire", "Scissors", "Snake", "Human", "Tree", "Wolf", "Sponge"],
    "Fire": ["Scissors", "Snake", "Human", "Tree", "Wolf", "Sponge", "Paper"],
    "Scissors": ["Snake", "Human", "Tree", "Wolf", "Sponge", "Paper", "Air"],
    "Snake": ["Human", "Tree", "Wolf", "Sponge", "Paper", "Air", "Water"],
    "Human": ["Tree", "Wolf", "Sponge", "Paper", "Air", "Water", "Dragon"],
    "Tree": ["Wolf", "Sponge", "Paper", "Air", "Water", "Dragon", "Devil"],
    "Wolf": ["Sponge", "Paper", "Air", "Water", "Devil", "Lightning", "Gun"],
    "Sponge": ["Paper", "Air", "Water", "Dragon", "Devil", "Lightning", "Gun"],
    "Paper": ["Air", "Water", "Dragon", "Devil", "Lightning", "Gun", "Rock"],
    "Air": ["Water", "Dragon", "Devil", "Lightning", "Gun", "Rock", "Fire"],
    "Water": ["Dragon", "Devil", "Lightning", "Gun", "Rock", "Fire", "Scissors"],
    "Dragon": ["Wolf", "Devil", "Lightning", "Gun", "Rock", "Fire", "Scissors"],
    "Devil": ["Lightning", "Gun", "Rock", "Fire", "Scissors", "Snake", "Human"],
    "Lightning": ["Gun", "Rock", "Fire", "Scissors", "Snake", "Human", "Tree"],
    "Gun": ["Rock", "Fire", "Scissors", "Snake", "Human", "Tree", "Sponge"]
}

# 4. SocketIO Event Handlers
@sio.event
async def connect(sid, environ):
    query_string = environ.get("QUERY_STRING", "")
    params = dict(urllib.parse.parse_qsl(query_string))
    session_id = params.get("room", "session_1")
    player_marker = params.get("player", "X")
    
    await sio.save_session(sid, {"session_id": session_id, "marker": player_marker})
    await sio.enter_room(sid, session_id)
    
    # --- ADDED CODE: INITIALIZE STATE IF IT DOESN'T EXIST ---
    state = _get_state(session_id)
    if not state:
        state = {
            "session_id": session_id,
            "max_rounds": 5,
            "powerups_enabled": True,
            "players": [],
            "health": {"X": 100, "O": 100},
            "points": {"X": 0, "O": 0},
            "selections": {"X": [], "O": []},
            "powerup_used": {"X": False, "O": False},
            "active_powerup": {"X": None, "O": None},
            "used_powerups_history": {"X": [], "O": []},
            "is_paused": False,
            "paused_by": None,
            "game_over": False,
            "winner": None,
            "is_active": False,
            "status": "WAITING"
        }
    
    # Add the connecting player to the room list
    if player_marker not in state["players"]:
        state["players"].append(player_marker)
        
    _set_state(session_id, state)
    # --------------------------------------------------------
    
    # Tell everyone in the room that someone joined
    await sio.emit('player_joined', {"marker": player_marker}, room=session_id)

    
@sio.event
async def disconnect(sid):
    # Safely lookup socket mapping without destroying game state
    mapping = redis_client.hget("rps15:active_sids", sid)
    if mapping:
        session_id, player_marker = mapping.split(":")
        redis_client.hdel("rps15:active_sids", sid)
        print(f"⚠️ Socket {sid} (Player {player_marker}) dropped connection.")
        
        # Broadcast a network alert instead of dropping the database key
        await sio.emit('sync_state', {
            "log": f"⚠️ Alert: Player {player_marker} lost connection context."
        }, room=session_id)

@sio.event
async def start_match(sid, data):
    session_id = data.get("session_id")
    if not session_id:
        return
        
    state = _get_state(session_id)
    if state:
        state["is_active"] = True
        state["status"] = "RUNNING"
        
        rounds = int(data.get("round_count", 5))
        state["max_rounds"] = rounds
        state["powerups_enabled"] = data.get("powerups", True)
        
        # FIX: Health now maps exactly to round count (1 HP = 1 Round Segment)
        state["health"] = {"X": rounds, "O": rounds}
        
        _set_state(session_id, state)
        
        init_log = f"🚀 ARENA INITIALIZED: Match started with {rounds} maximum health per competitor."
        await _publish_game_event(session_id, "match_started", {"status": "RUNNING", "log": init_log})
        
        await sio.emit('match_started', {"state": state}, room=session_id)
        await sio.emit('sync_state', {"state": state, "log": init_log}, room=session_id)

@sio.event
async def player_action(sid, data):
    # Safe data extraction from request and Socket session context
    session_data = await sio.get_session(sid) or {}
    session_id = data.get("sessionId") or data.get("session_id") or session_data.get("session_id")
    
    if not session_id:
        client_rooms = await sio.get_rooms(sid)
        game_rooms = [r for r in client_rooms if r != sid]
        session_id = game_rooms[0] if game_rooms else None
        
    player_marker = data.get("marker") or session_data.get("marker")
    
    if not session_id or not player_marker:
        return

    action = data.get("action")
    state = _get_state(session_id)
    if not state or state.get("game_over"):
        return

    # --- 1. POWERUP ACQUISITION ---
    if action == "PICKUP_POWERUP":
        p_type = data.get("powerup")
        if p_type not in state.get("used_powerups_history", {}).get(player_marker, []):
            state["active_powerup"][player_marker] = p_type
            _set_state(session_id, state)
            
            log_msg = f"🔋 TACTICAL OVERRIDE: Player {player_marker} has equipped the [{p_type.upper()}] module!"
            await _publish_game_event(session_id, "powerup_armed", {"marker": player_marker, "powerup": p_type, "log": log_msg})
            await sio.emit('sync_state', {"state": state, "log": log_msg}, room=session_id)
        return

    # --- 2. FORFEIT HANDLER ---
    elif action == "FORFEIT":
        rival = "O" if player_marker == "X" else "X"
        state["game_over"] = True
        state["winner"] = rival
        state["health"][player_marker] = 0
        _set_state(session_id, state)
        
        forfeit_log = f"🏳️ COWARD'S WAY OUT: Player {player_marker} has abandoned the arena! Player {rival} claims default victory!"
        await _publish_game_event(session_id, "forfeit", {"marker": player_marker, "winner": rival, "log": forfeit_log})
        await sio.emit('sync_state', {"state": state, "log": forfeit_log}, room=session_id)
        return

    # --- 3. COMBAT SELECTION ENGINE (MOVE / TIMEOUT) ---
    timeout_log_prefix = ""
    
    if action == "TIMEOUT":
        # System enforces a randomized pick to push the turn loop forward instead of killing the app state
        random_gesture = random.choice(list(RPS15_WINS.keys()))
        gestures = [random_gesture]
        uses_powerup = False
        timeout_log_prefix = f"⏳ TIMEOUT: Player {player_marker} ran out of time! System deployed [{random_gesture.upper()}]. "
    elif action == "MOVE":
        gestures = data.get("gestures", [])
        uses_powerup = data.get("use_powerup", False)
    else:
        return

    # Save intent tracking details to state
    state["selections"][player_marker] = gestures
    state["powerup_used"][player_marker] = uses_powerup

    # Process active instant-cast items (Heal) right away
    if uses_powerup and state["active_powerup"].get(player_marker) == "Heal":
        if "Heal" not in state["used_powerups_history"][player_marker]:
            state["health"][player_marker] = min(state["max_rounds"], state["health"][player_marker] + 1)
            state["used_powerups_history"][player_marker].append("Heal")
            state["active_powerup"][player_marker] = None
            state["powerup_used"][player_marker] = False
            
            heal_log = f"💉 SYSTEM REPAIR: Player {player_marker} consumed HEAL and restored 1 HP!"
            if timeout_log_prefix:
                timeout_log_prefix += f"\n{heal_log}"
            else:
                await sio.emit('sync_state', {"state": state, "log": heal_log}, room=session_id)

    _set_state(session_id, state)

    # --- 4. CLASH RESOLUTION LOOP (Triggers when BOTH choices register) ---
    if state["selections"].get("X") and state["selections"].get("O"):
        move_x = state["selections"]["X"][0]
        move_o = state["selections"]["O"][0]

        if move_x == move_o:
            outcome = "tie"
        elif move_o in RPS15_WINS.get(move_x, []):
            outcome = "X_win"
        else:
            outcome = "O_win"

        powerup_x = state["active_powerup"].get("X")
        powerup_o = state["active_powerup"].get("O")

        # Evaluate powerup multipliers and protective barriers
        mult_x = 2 if (powerup_x == "Double Damage" and state["powerup_used"].get("X")) else 1
        mult_o = 2 if (powerup_o == "Double Damage" and state["powerup_used"].get("O")) else 1

        shield_x = (powerup_x == "Shield" and state["powerup_used"].get("X"))
        shield_o = (powerup_o == "Shield" and state["powerup_used"].get("O"))

        damage_to_x = 0
        damage_to_o = 0

        # Turn-based damage mapping (Missed / Defeated player takes damage, Hitting player stays safe)
        if outcome == "X_win":
            damage_to_o = 0 if shield_o else (1 * mult_x)
        elif outcome == "O_win":
            damage_to_x = 0 if shield_x else (1 * mult_o)

        state["health"]["X"] = max(0, state["health"]["X"] - damage_to_x)
        state["health"]["O"] = max(0, state["health"]["O"] - damage_to_o)

        # Dynamic battle narrative compilation
        if outcome == "X_win":
            if shield_o:
                clash_log = f"🛡️ NULLIFIED: Player X unleashes [{move_x.upper()}], but Player O's SHIELD absorbs the impact entirely!"
            else:
                clash_log = f"💥 DEVASTATING BLOW: Player X strikes with [{move_x.upper()}], conquering Player O's [{move_o.upper()}]! Player O takes {damage_to_o} HP damage!"
        elif outcome == "O_win":
            if shield_x:
                clash_log = f"🛡️ NULLIFIED: Player O unleashes [{move_o.upper()}], but Player X's SHIELD absorbs the impact entirely!"
            else:
                clash_log = f"💥 DEVASTATING BLOW: Player O strikes with [{move_o.upper()}], conquering Player X's [{move_x.upper()}]! Player X takes {damage_to_x} HP damage!"
        else:
            clash_log = f"⚔️ SYMMETRICAL DEADLOCK: Both deployed [{move_x.upper()}]. Weapons clashed harmlessly. NO DAMAGE SUSTAINED."

        if timeout_log_prefix:
            clash_log = timeout_log_prefix + "\n" + clash_log

        if powerup_x and state["powerup_used"].get("X"):
             clash_log += f" [Player X consumed {powerup_x.upper()}]"
        if powerup_o and state["powerup_used"].get("O"):
             clash_log += f" [Player O consumed {powerup_o.upper()}]"

        # Wipe modifiers and clear active actions to push to NEXT ROUND
        for m in ["X", "O"]:
            if state["powerup_used"].get(m) and state["active_powerup"].get(m):
                state["used_powerups_history"][m].append(state["active_powerup"][m])
            state["active_powerup"][m] = None
            state["powerup_used"][m] = False

        state["selections"] = {"X": [], "O": []}

        # Terminal conditions check
        if state["health"]["X"] <= 0 or state["health"]["O"] <= 0:
            state["game_over"] = True
            if state["health"]["X"] == state["health"]["O"]:
                state["winner"] = "DRAW"
            else:
                state["winner"] = "X" if state["health"]["X"] > state["health"]["O"] else "O"
            clash_log += f" 🏆 MATCH TERMINATED: Player {state['winner']} reigns victorious!"

        _set_state(session_id, state)
        
        clash_payload = {"outcome": outcome, "move_x": move_x, "move_o": move_o, "description": clash_log}
        await _publish_game_event(session_id, "clash_resolved", clash_payload)
        await sio.emit('sync_state', {"state": state, "log": clash_log, "clash": clash_payload}, room=session_id)
    
    else:
        # Acknowledge single player locking in commitment
        p_text = f" armed with [{state['active_powerup'][player_marker].upper()}]" if uses_powerup and state["active_powerup"].get(player_marker) else ""
        waiting_log = (timeout_log_prefix + "Awaiting opponent action...") if timeout_log_prefix else f"🔒 COMBAT READINESS: Player {player_marker} has locked their choice{p_text} and is awaiting engagement."
        
        await _publish_game_event(session_id, "player_locked", {"marker": player_marker, "log": waiting_log})
        await sio.emit('sync_state', {"state": state, "log": waiting_log}, room=session_id)