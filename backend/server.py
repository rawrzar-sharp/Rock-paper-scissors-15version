import json
import os
import threading
import asyncio
import urllib.request
import pika
import redis
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/%2F")

redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)

# Scoped connections: active_connections[session_id][player_marker] = websocket
active_connections = {}
main_loop = None

def forward_to_flask(session_id: str, endpoint: str, payload: dict):
    """Safely relays incoming WebSocket player actions to the Flask core engine."""
    try:
        url = f"http://flask_backend:5000/api/rps15/sessions/{session_id}/{endpoint}"
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
        with urllib.request.urlopen(req) as response:
            return response.read().decode('utf-8')
    except Exception as e:
        print(f"[Gateway Error] Failed to proxy action to Flask: {e}")
        return None

def rabbitmq_consumer():
    """Background worker that listens to the live AMQP message broker stream."""
    while True:
        try:
            params = pika.URLParameters(RABBITMQ_URL)
            connection = pika.BlockingConnection(params)
            channel = connection.channel()
            
            channel.exchange_declare(exchange="arena_events", exchange_type="topic", durable=True)
            # Create a temporary unique queue for this websocket gateway instance
            result = channel.queue_declare(queue="", exclusive=True)
            queue_name = result.method.queue
            channel.queue_bind(exchange="arena_events", queue=queue_name, routing_key="arena.#")
            
            def callback(ch, method, properties, body):
                try:
                    payload = json.loads(body.decode("utf-8"))
                    session_id = payload.get("session_id")
                    event_type = payload.get("event_type")
                    
                    # Pull unified fresh state directly from shared Redis cache
                    raw_state = redis_client.get(f"rps15:session:{session_id}")
                    state_obj = json.loads(raw_state) if raw_state else None
                    
                    # Format payload structure to match what Arena.jsx expects
                    broadcast_payload = {
                        "state": state_obj,
                        "log": f"RABBITMQ [x]: AMQP packet received on routing key '{method.routing_key}'"
                    }
                    if event_type == "round_clash":
                        broadcast_payload["clash"] = payload

                    # Safely schedule broadcast back into the main FastAPI thread loop
                    if main_loop:
                        asyncio.run_coroutine_threadsafe(
                            broadcast_to_session(session_id, broadcast_payload),
                            main_loop
                        )
                except Exception as e:
                    print(f"[AMQP Consumer] Parse failure: {e}")

            channel.basic_consume(queue=queue_name, on_message_callback=callback, auto_ack=True)
            print(" [*] RabbitMQ Consumer safely connected and listening for arena events...")
            channel.start_consuming()
        except Exception as e:
            print(f"[AMQP Consumer] Connection failed: {e}. Retrying worker in 5s...")
            import time
            time.sleep(5)

@app.on_event("startup")
def startup_event():
    global main_loop
    main_loop = asyncio.get_running_loop()
    # Spin up the blocking RabbitMQ consumer loop inside a safe daemon background thread
    threading.Thread(target=rabbitmq_consumer, daemon=True).start()

async def broadcast_to_session(session_id: str, message: dict):
    if session_id in active_connections:
        for ws in list(active_connections[session_id].values()):
            try:
                await ws.send_json(message)
            except Exception:
                pass

@app.websocket("/api/rps15/ws/{session_id}/{player_marker}")
async def arena_endpoint(websocket: WebSocket, session_id: str, player_marker: str):
    await websocket.accept()
    
    if session_id not in active_connections:
        active_connections[session_id] = {}
    active_connections[session_id][player_marker] = websocket
    
    # Sync immediately on connection using the real state initialized by Flask
    raw_state = redis_client.get(f"rps15:session:{session_id}")
    initial_state = json.loads(raw_state) if raw_state else None
    
    await websocket.send_json({
        "state": initial_state,
        "log": f"SYSTEM: Player {player_marker} has safely entered room {session_id}."
    })
    
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            action = payload.get("action")
            
            if action == "MOVE":
                flask_payload = {
                    "marker": player_marker,
                    "gestures": payload.get("gestures"),
                    "use_powerup": payload.get("use_powerup", False)
                }
                await asyncio.get_running_loop().run_in_executor(
                    None, forward_to_flask, session_id, "move", flask_payload
                )
                
            elif action == "PAUSE":
                flask_payload = {"marker": player_marker}
                await asyncio.get_running_loop().run_in_executor(
                    None, forward_to_flask, session_id, "pause", flask_payload
                )
                
            elif action == "FORFEIT":
                flask_payload = {"marker": player_marker}
                await asyncio.get_running_loop().run_in_executor(
                    None, forward_to_flask, session_id, "forfeit", flask_payload
                )
                
    except WebSocketDisconnect:
        if session_id in active_connections:
            active_connections[session_id].pop(player_marker, None)
            if not active_connections[session_id]:
                active_connections.pop(session_id, None)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)