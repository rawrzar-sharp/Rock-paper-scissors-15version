import json
import uuid
import random
from datetime import datetime, timezone
from typing import List, Dict, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
import asyncio
import urllib.parse

# 1. Inisialisasi Socket.IO Server (ASGI Async Mode)


sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

fastapi_app = FastAPI()
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Bungkus FastAPI dengan Socket.IO
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)

# ==========================================
#          REDIS + RABBITMQ BACKING         
# ==========================================
import os
import redis
import pika

REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/%2F")

redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)


def _session_key(session_id: str) -> str:
    return f"rps15:session:{session_id}"


def _get_state(session_id: str):
    raw = redis_client.get(_session_key(session_id))
    if not raw:
        return None
    return json.loads(raw)


def _set_state(session_id: str, state: dict) -> None:
    redis_client.set(_session_key(session_id), json.dumps(state))


def _publish_game_event(session_id: str, event_type: str, payload: dict) -> None:
    try:
        params = pika.URLParameters(RABBITMQ_URL)
        connection = pika.BlockingConnection(params)
        channel = connection.channel()
        exchange = "arena_events"
        channel.exchange_declare(exchange=exchange, exchange_type="topic", durable=True)

        routing_key = f"arena.{session_id}.{event_type}"
        body = json.dumps({"session_id": session_id, "event_type": event_type, **payload})

        channel.basic_publish(
            exchange=exchange,
            routing_key=routing_key,
            body=body.encode("utf-8"),
            properties=pika.BasicProperties(delivery_mode=2),
        )
        connection.close()
    except Exception as e:
        # Don't crash the websocket loop if RabbitMQ is momentarily down.
        print(f"[MQ] publish exception: {e}")


# ==========================================
#        RPS-15 CLASH EVALUATOR ENGINE       
# ==========================================
GESTURES_ORDER = [
    'Rock', 'Fire', 'Scissors', 'Snake', 'Human', 
    'Tree', 'Wolf', 'Sponge', 'Paper', 'Air', 
    'Water', 'Dragon', 'Devil', 'Lightning', 'Gun'
]

def evaluate_clash(p1_gestures, p2_gestures) -> str:
    if not p1_gestures or not p2_gestures: return "DRAW"
    g1 = p1_gestures[0] if isinstance(p1_gestures, list) else p1_gestures
    g2 = p2_gestures[0] if isinstance(p2_gestures, list) else p2_gestures
    
    if g1 not in GESTURES_ORDER or g2 not in GESTURES_ORDER or g1 == g2: 
        return "DRAW"
    
    idx1, idx2 = GESTURES_ORDER.index(g1), GESTURES_ORDER.index(g2)
    distance = (idx2 - idx1) % 15
    return "X_win" if 1 <= distance <= 7 else "O_win"

# ==========================================
#         SOCKET.IO EVENT HANDLERS       
# ==========================================

# Inside server.py

# --- CLEANED SOCKET.IO HANDLERS ---

# server.py (Updated)
@sio.event
async def connect(sid, environ):
    # Parse the query string sent by the client connection
    query_string = environ.get("QUERY_STRING", "")
    params = dict(urllib.parse.parse_qsl(query_string))
    
    session_id = params.get("room", "session_1")
    player_marker = params.get("player", "X")
    
    # Store identity and join the room
    await sio.save_session(sid, {"session_id": session_id, "marker": player_marker})
    sio.enter_room(sid, session_id)
    
    print(f"🔌 SID {sid} joined room {session_id} as {player_marker}")
    
    # Send current game state to the newly joined player
    state = _get_state(session_id) or {}
    await sio.emit('sync_state', {"state": state}, room=sid)

@sio.event
async def disconnect(sid):
    print(f"❌ SID {sid} disconnected")

@sio.on('join_room')
async def handle_join_room(sid, data):
    session_id = data.get("session_id")
    player_marker = data.get("marker")

    if not session_id or player_marker not in ("X", "O"):
        return

    sio.enter_room(sid, session_id)

    async with sio.session(sid) as session:
        session['session_id'] = session_id
        session['marker'] = player_marker

    state = _get_state(session_id)

    # If missing, create initial session state
    if not state:
        state = {
            "session_id": session_id,
            "max_rounds": 5,
            "powerups_enabled": True,
            "active_powerup_type": "Double Selection",
            "players": {"X": None, "O": None},
            "health": {"X": 100, "O": 100},
            "points": {"X": 0, "O": 0},
            "selections": {"X": [], "O": []},
            "powerup_used": {"X": False, "O": False},
            "game_over": False,
            "is_paused": False,
            "paused_by": None,
            "winner": None,
        }
        _set_state(session_id, state)

    # Assign marker slot (keep idempotent)
    if state["players"].get(player_marker) is None:
        state["players"][player_marker] = player_marker
        _set_state(session_id, state)

    await sio.emit(
        'sync_state',
        {"state": state, "log": f"SYSTEM: Player {player_marker} joined room {session_id}."},
        room=session_id,
    )


@sio.on('player_action')
async def handle_player_action(sid, payload):
    async with sio.session(sid) as session:
        session_id = session.get('session_id')
        player_marker = session.get('marker')
        
    if not session_id: return

    action = payload.get("action")
    state = _get_state(session_id)

    if not state or state.get("game_over") or state.get("is_paused"):
        return

    if action == "MOVE":
        gestures = payload.get("gestures", [])
        state["selections"][player_marker] = gestures
        _set_state(session_id, state)

        # Both players locked -> evaluate
        if state["selections"].get("X") and state["selections"].get("O"):
            result = evaluate_clash(state["selections"]["X"], state["selections"]["O"])
            damage_value = 100 if state.get("max_rounds") == 1 else 20

            clash_log = {
                "p1_selection": state["selections"]["X"],
                "p2_selection": state["selections"]["O"],
                "outcome": result,
            }

            if result == "X_win":
                state["health"]["O"] = max(0, state["health"]["O"] - damage_value)
            elif result == "O_win":
                state["health"]["X"] = max(0, state["health"]["X"] - damage_value)

            state["selections"] = {"X": [], "O": []}

            if state["health"]["X"] <= 0 or state["health"]["O"] <= 0:
                state["game_over"] = True
                if state["health"]["X"] == state["health"]["O"]:
                    state["winner"] = "DRAW"
                else:
                    state["winner"] = "X" if state["health"]["O"] <= 0 else "O"

            _set_state(session_id, state)
            _publish_game_event(session_id, "round_clash", {"clash": clash_log})

            await sio.emit('sync_state', {"state": state, "clash": clash_log}, room=session_id)
        else:
            _publish_game_event(session_id, "move_locked", {"marker": player_marker})
            await sio.emit(
                'sync_state',
                {"state": state, "log": f"Player {player_marker} locked their move. Waiting for opponent..."},
                room=session_id,
            )

    elif action == "FORFEIT":
        rival_marker = "O" if player_marker == "X" else "X"
        state["game_over"] = True
        state["winner"] = rival_marker
        state["health"][player_marker] = 0

        _set_state(session_id, state)
        _publish_game_event(session_id, "player_forfeit", {"quitter": player_marker, "winner": rival_marker})

        await sio.emit(
            'sync_state',
            {
                "state": state,
                "log": f"Player {player_marker} cowardly fled the arena! {rival_marker} wins!",
            },
            room=session_id,
        )

    elif action == "PAUSE":
        # Toggle pause for this session.
        if state.get("paused_by") == player_marker and state.get("is_paused"):
            state["is_paused"] = False
            state["paused_by"] = None
        elif not state.get("is_paused"):
            state["is_paused"] = True
            state["paused_by"] = player_marker

        _set_state(session_id, state)
        _publish_game_event(session_id, "pause_toggled", {"is_paused": state["is_paused"], "by": player_marker})
        await sio.emit('sync_state', {"state": state, "log": "SYSTEM: pause updated"}, room=session_id)


if __name__ == "__main__":
    import uvicorn
    print("Starting Socket.IO backend on http://localhost:8000")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)