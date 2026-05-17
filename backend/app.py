import json
import os
import uuid
from typing import Dict, Any

import pika
import redis
from flask import Flask, request, jsonify
from flask_cors import CORS


REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
RABBITMQ_URL = os.environ.get(
    "RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/%2F"
)

app = Flask(__name__)
CORS(app)

redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)


def _session_key(session_id: str) -> str:
    return f"ttt:session:{session_id}"


def _get_state(session_id: str) -> Dict[str, Any] | None:
    raw = redis_client.get(_session_key(session_id))
    if not raw:
        return None
    return json.loads(raw)


def _set_state(session_id: str, state: Dict[str, Any]) -> None:
    redis_client.set(_session_key(session_id), json.dumps(state))


def _publish_move(session_id: str, payload: Dict[str, Any]) -> None:
    params = pika.URLParameters(RABBITMQ_URL)
    connection = pika.BlockingConnection(params)
    channel = connection.channel()

    # Simple topic-less exchange + per-session queue pattern.
    # (Real implementation may refine this.)
    exchange = "moves"
    channel.exchange_declare(exchange=exchange, exchange_type="direct", durable=True)

    routing_key = f"session.{session_id}"

    body = json.dumps({"session_id": session_id, **payload}).encode("utf-8")
    channel.basic_publish(
        exchange=exchange,
        routing_key=routing_key,
        body=body,
        properties=pika.BasicProperties(delivery_mode=2),
    )

    connection.close()


@app.post("/api/sessions")
def create_session():
    session_id = str(uuid.uuid4())
    state = {
        "session_id": session_id,
        "board": ["" for _ in range(9)],
        "players": {},
        "turn": None,
        "winner": None,
    }
    _set_state(session_id, state)

    return jsonify({"session_id": session_id})


@app.post("/api/sessions/<session_id>/join")
def join_session(session_id: str):
    state = _get_state(session_id)
    if not state:
        return jsonify({"error": "session not found"}), 404

    player_name = request.json.get("player_name") if request.is_json else None
    if not player_name:
        player_name = f"player-{uuid.uuid4().hex[:6]}"

    # Assign player X then O
    if "X" not in state["players"]:
        state["players"]["X"] = player_name
    elif "O" not in state["players"]:
        state["players"]["O"] = player_name
    else:
        return jsonify({"error": "session full"}), 400

    if state["turn"] is None:
        state["turn"] = "X"

    _set_state(session_id, state)

    # Return what the player should use to identify themselves
    marker = "X" if state["players"].get("X") == player_name else "O"
    return jsonify({"marker": marker, "state": state})


@app.post("/api/sessions/<session_id>/move")
def make_move(session_id: str):
    state = _get_state(session_id)
    if not state:
        return jsonify({"error": "session not found"}), 404

    data = request.json or {}
    marker = data.get("marker")  # "X" or "O"
    index = data.get("index")  # 0..8

    if marker not in ("X", "O"):
        return jsonify({"error": "invalid marker"}), 400
    if not isinstance(index, int) or index < 0 or index > 8:
        return jsonify({"error": "invalid index"}), 400
    if state["winner"] is not None:
        return jsonify({"error": "game already finished"}), 400

    # Turn verification
    if state["turn"] != marker:
        return jsonify({"error": "not your turn"}), 400

    if state["board"][index] != "":
        return jsonify({"error": "cell already taken"}), 400

    # Publish move; worker would apply + update state.
    # For now, enqueue and also apply immediately to keep it functional.
    payload = {"marker": marker, "index": index}
    _publish_move(session_id, payload)

    state["board"][index] = marker

    # Winner check
    lines = [
        (0, 1, 2), (3, 4, 5), (6, 7, 8),
        (0, 3, 6), (1, 4, 7), (2, 5, 8),
        (0, 4, 8), (2, 4, 6)
    ]
    for a, b, c in lines:
        if state["board"][a] and state["board"][a] == state["board"][b] == state["board"][c]:
            state["winner"] = state["board"][a]
            break

    if state["winner"] is None and all(cell != "" for cell in state["board"]):
        state["winner"] = "draw"

    if state["winner"] is None:
        state["turn"] = "O" if marker == "X" else "X"

    _set_state(session_id, state)

    # Note: real-time updates via WebSockets will be added next.
    return jsonify({"state": state})


@app.get("/api/sessions/<session_id>")
def get_session(session_id: str):
    state = _get_state(session_id)
    if not state:
        return jsonify({"error": "session not found"}), 404
    return jsonify({"state": state})


def _rps15_winner(user_gesture: str, computer_gesture: str) -> Dict[str, Any]:
    # Same rule as game.py:
    # Each gesture beats the next 7 gestures in the circle direction.
    # diff is clockwise steps from user to computer.
    gestures = [
        "Rock", "Fire", "Scissors", "Snake", "Human",
        "Tree", "Wolf", "Sponge", "Paper", "Air",
        "Water", "Dragon", "Devil", "Lightning", "Gun",
    ]
    idx_user = gestures.index(user_gesture)
    idx_comp = gestures.index(computer_gesture)

    if user_gesture == computer_gesture:
        return {"winner": "tie", "message": "It’s a tie!"}

    diff = (idx_comp - idx_user + 15) % 15  # 0..14 steps from user to computer
    if 1 <= diff <= 7:
        # computer is within 7 gestures that the user beats => computer beats user
        return {
            "winner": "computer",
            "message": f"{computer_gesture} beats {user_gesture}. You lose!",
        }
    return {
        "winner": "user",
        "message": f"{user_gesture} beats {computer_gesture}. You win!",
    }


@app.post("/api/rps15/session")
def create_rps15_session():
    session_id = str(uuid.uuid4())
    state = {
        "session_id": session_id,
        "user_gesture": None,
        "computer_gesture": None,
        "winner": None,
    }
    _set_state(session_id, state)
    return jsonify({"session_id": session_id})


@app.post("/api/rps15/move")
def rps15_move():
    data = request.json or {}
    session_id = data.get("session_id")
    user_gesture = data.get("user_gesture")

    if not session_id:
        return jsonify({"error": "missing session_id"}), 400

    if not isinstance(user_gesture, str) or not user_gesture.strip():
        return jsonify({"error": "missing user_gesture"}), 400

    gestures = [
        "Rock", "Fire", "Scissors", "Snake", "Human",
        "Tree", "Wolf", "Sponge", "Paper", "Air",
        "Water", "Dragon", "Devil", "Lightning", "Gun",
    ]
    normalized = user_gesture.strip().capitalize()
    if normalized not in gestures:
        return jsonify({"error": "invalid user_gesture"}), 400

    state = _get_state(session_id)
    if not state:
        return jsonify({"error": "session not found"}), 404

    import random

    computer_gesture = random.choice(gestures)
    outcome = _rps15_winner(normalized, computer_gesture)

    state["user_gesture"] = normalized
    state["computer_gesture"] = computer_gesture
    state["winner"] = outcome["winner"]
    _set_state(session_id, state)

    return jsonify(
        {
            "state": state,
            "computer_gesture": computer_gesture,
            **outcome,
        }
    )


if __name__ == "__main__":
    # For local dev (docker uses gunicorn)
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)


