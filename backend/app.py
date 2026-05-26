# import json
# import os
# import uuid
# import random
# from typing import Dict, Any, List

# import pika
# import redis
# from flask import Flask, request, jsonify
# from flask_cors import CORS

# REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
# RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/%2F")

# app = Flask(__name__)
# CORS(app)

# redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)

# GESTURES = [
#     "Rock",
#     "Fire",
#     "Scissors",
#     "Snake",
#     "Human",
#     "Tree",
#     "Wolf",
#     "Sponge",
#     "Paper",
#     "Air",
#     "Water",
#     "Dragon",
#     "Devil",
#     "Lightning",
#     "Gun",
# ]


# def _session_key(session_id: str) -> str:
#     return f"rps15:session:{session_id}"


# def _get_state(session_id: str) -> Dict[str, Any] | None:
#     raw = redis_client.get(_session_key(session_id))
#     if not raw:
#         return None
#     return json.loads(raw)


# def _set_state(session_id: str, state: Dict[str, Any]) -> None:
#     redis_client.set(_session_key(session_id), json.dumps(state))


# def _publish_game_event(session_id: str, event_type: str, payload: Dict[str, Any]) -> None:
#     try:
#         params = pika.URLParameters(RABBITMQ_URL)
#         connection = pika.BlockingConnection(params)
#         channel = connection.channel()

#         exchange = "arena_events"
#         channel.exchange_declare(exchange=exchange, exchange_type="topic", durable=True)

#         routing_key = f"arena.{session_id}.{event_type}"
#         body = json.dumps({"session_id": session_id, "event_type": event_type, **payload})

#         channel.basic_publish(
#             exchange=exchange,
#             routing_key=routing_key,
#             body=body.encode("utf-8"),
#             properties=pika.BasicProperties(delivery_mode=2),
#         )
#         connection.close()
#     except Exception as e:
#         print(f"MQ Event Delivery Exception: {e}")


# def _evaluate_clash(p1_moves: List[str], p2_moves: List[str]) -> str:
#     """Evaluates vector matchups.

#     Returns 'X_win', 'O_win', or 'tie'.

#     Supports Double Selections by running matching matrices across elements.
#     """

#     p1_wins = 0
#     p2_wins = 0

#     for m1 in p1_moves:
#         for m2 in p2_moves:
#             if m1 == m2:
#                 continue
#             idx1 = GESTURES.index(m1)
#             idx2 = GESTURES.index(m2)
#             diff = (idx2 - idx1 + 15) % 15
#             if 1 <= diff <= 7:
#                 p2_wins += 1
#             else:
#                 p1_wins += 1

#     if p1_wins > p2_wins:
#         return "X_win"
#     elif p2_wins > p1_wins:
#         return "O_win"
#     return "tie"


# @app.post("/api/rps15/sessions")
# def create_arena_session():
#     data = request.json or {}
#     session_id = str(uuid.uuid4())
#     max_rounds = int(data.get("max_rounds", 5))
#     powerups_enabled = bool(data.get("powerups_enabled", True))
#     active_powerup = data.get("active_powerup", "Double Selection")

#     # Inverse points logic: Lower target rounds = higher high-stakes payout point values
#     win_points_pool = 500 if max_rounds == 1 else (100 * max_rounds)
#     _ = win_points_pool

#     state = {
#         "session_id": session_id,
#         "max_rounds": max_rounds,
#         "powerups_enabled": powerups_enabled,
#         "active_powerup_type": active_powerup,
#         "players": {},
#         "health": {"X": 100, "O": 100},
#         "points": {"X": 0, "O": 0},
#         "selections": {"X": [], "O": []},
#         "powerup_used": {"X": False, "O": False},
#         "is_paused": False,
#         "paused_by": None,
#         "game_over": False,
#         "winner": None,
#     }
#     _set_state(session_id, state)
#     return jsonify({"session_id": session_id, "state": state})


# @app.post("/api/rps15/sessions/<session_id>/join")
# def join_arena_session(session_id: str):
#     state = _get_state(session_id)
#     if not state:
#         return jsonify({"error": "Arena instance tracking record not found"}), 404

#     player_name = request.json.get("player_name") if request.is_json else None
#     if not player_name:
#         player_name = f"gladiator-{uuid.uuid4().hex[:4]}"

#     if "X" not in state["players"]:
#         state["players"]["X"] = player_name
#         marker = "X"
#     elif "O" not in state["players"]:
#         state["players"]["O"] = player_name
#         marker = "O"
#     else:
#         return jsonify({"error": "Arena instance session full"}), 400

#     _set_state(session_id, state)
#     _publish_game_event(session_id, "player_joined", {"player": player_name, "marker": marker})
#     return jsonify({"marker": marker, "state": state})


# @app.post("/api/rps15/sessions/<session_id>/move")
# def submit_arena_move(session_id: str):
#     state = _get_state(session_id)
#     if not state or state["game_over"] or state["is_paused"]:
#         return jsonify({"error": "Action rejected: Arena inactive or locked"}), 400

#     data = request.json or {}
#     marker = data.get("marker")
#     gestures = data.get("gestures", [])
#     uses_powerup = bool(data.get("use_powerup", False))

#     if marker not in ("X", "O"):
#         return jsonify({"error": "Unauthorized identity marker"}), 400

#     # Validation constraints: normal limits capped at 1 element; Double Selection parameter grants 2
#     max_allowed = (
#         2
#         if (
#             uses_powerup
#             and state["active_powerup_type"] == "Double Selection"
#             and state["powerups_enabled"]
#         )
#         else 1
#     )

#     if not gestures or len(gestures) > max_allowed:
#         return jsonify({"error": f"Invalid move input: Max allowed inputs is {max_allowed}"}), 400

#     for g in gestures:
#         if g not in GESTURES:
#             return jsonify({"error": f"Unknown matrix token item: {g}"}), 400

#     state["selections"][marker] = gestures
#     if uses_powerup:
#         state["powerup_used"][marker] = True

#     # If handling Bot Matchups (Single Player Mode simulation fallback)
#     if "O" not in state["players"] or state["players"].get("O") == "BOT_AGENT":
#         state["players"]["O"] = "BOT_AGENT"
#         bot_count = 2 if (state["powerups_enabled"] and random.random() > 0.6) else 1
#         state["selections"]["O"] = random.sample(GESTURES, bot_count)

#     # Process round matrix evaluation loop if both selections are locked
#     if state["selections"]["X"] and state["selections"]["O"]:
#         result = _evaluate_clash(state["selections"]["X"], state["selections"]["O"])

#         damage_value = 100 if state["max_rounds"] == 1 else 20
#         points_per_hit = 500 if state["max_rounds"] == 1 else 100

#         clash_log = {
#             "p1_selection": state["selections"]["X"],
#             "p2_selection": state["selections"]["O"],
#             "outcome": result,
#         }

#         if result == "X_win":
#             state["health"]["O"] = max(0, state["health"]["O"] - damage_value)
#             state["points"]["X"] += points_per_hit
#         elif result == "O_win":
#             state["health"]["X"] = max(0, state["health"]["X"] - damage_value)
#             state["points"]["O"] += points_per_hit

#         # Flush transaction caches for the upcoming round
#         state["selections"]["X"] = []
#         state["selections"]["O"] = []

#         # Check health states to determine match conditions
#         if state["health"]["X"] <= 0 or state["health"]["O"] <= 0:
#             state["game_over"] = True
#             if state["health"]["X"] == state["health"]["O"]:
#                 state["winner"] = "DRAW"
#             else:
#                 state["winner"] = "X" if state["health"]["O"] <= 0 else "O"
#             clash_log["match_terminated"] = True
#             clash_log["winner"] = state["winner"]

#         _set_state(session_id, state)
#         _publish_game_event(session_id, "round_clash", clash_log)
#         return jsonify({"state": state, "clash": clash_log})

#     _set_state(session_id, state)
#     _publish_game_event(session_id, "move_locked", {"marker": marker})
#     return jsonify({"state": state, "message": "Move registered successfully"})


# @app.post("/api/rps15/sessions/<session_id>/pause")
# def toggle_arena_pause(session_id: str):
#     state = _get_state(session_id)
#     if not state or state["game_over"]:
#         return jsonify({"error": "Active session context target unavailable"}), 404

#     data = request.json or {}
#     marker = data.get("marker")

#     if state["is_paused"] and state["paused_by"] == marker:
#         state["is_paused"] = False
#         state["paused_by"] = None
#     elif not state["is_paused"]:
#         state["is_paused"] = True
#         state["paused_by"] = marker

#     _set_state(session_id, state)
#     _publish_game_event(
#         session_id,
#         "pause_toggled",
#         {"is_paused": state["is_paused"], "by": marker},
#     )
#     return jsonify({"state": state})


# @app.post("/api/rps15/sessions/<session_id>/forfeit")
# def execute_arena_forfeit(session_id: str):
#     state = _get_state(session_id)
#     if not state or state["game_over"]:
#         return jsonify({"error": "Active session context target unavailable"}), 404

#     data = request.json or {}
#     quitter_marker = data.get("marker")

#     rival_marker = "O" if quitter_marker == "X" else "X"

#     state["game_over"] = True
#     state["winner"] = rival_marker
#     state["health"][quitter_marker] = 0

#     payout_points = 500 if state["max_rounds"] == 1 else (100 * state["max_rounds"])
#     state["points"][rival_marker] += payout_points

#     _set_state(session_id, state)
#     _publish_game_event(
#         session_id,
#         "player_forfeit",
#         {"quitter": quitter_marker, "winner": rival_marker},
#     )
#     return jsonify({"state": state, "message": "Forfeit cascading processed successfully"})

# if __name__ == "__main__":
#     app.run(host="0.0.0.0", port=5000, debug=True)