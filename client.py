import asyncio
import json
import urllib.request
import websockets

def create_active_session():
    """
    Helper to automatically request a valid game session from the backend REST API
    so that the server state actually exists before the WebSocket connects.
    """
    uri = "ws://localhost:8000/api/rps15/ws/test-session-123/X"
    headers = {"Content-Type": "application/json"}
    payload = {
        "max_rounds": 5,
        "powerups_enabled": True,
        "active_powerup": "Double Selection"
    }
    
    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data.get("session_id")
    except Exception as e:
        print(f"⚠️ Could not automatically create session (Is server.py running?): {e}")
        return "fallback-test-session-123"

async def client():
    # 1. Dynamically obtain or fallback to a session ID
    session_id = create_active_session()
    player_marker = "X"
    
    # 2. Correctly align protocol (ws://), port (8000), router path, and format both variables safely
    uri = f"ws://localhost:8000/rps15/ws/{session_id}/{player_marker}"
    print(f"Connecting to Arena WebSocket via: {uri}")
    
    try:
        async with websockets.connect(uri) as websocket:
            # Receive the initial state the server pushes immediately on connection
            welcome_msg = await websocket.recv()
            print("\n[RECEIVED] Welcome State:\n", json.dumps(json.loads(welcome_msg), indent=2))
            
            # 3. Format the payload including the mandatory 'marker' field expected by handle_move()
            move_payload = {
                "action": "MOVE",
                "marker": player_marker,  # Required by server.py to identify the actor
                "gestures": ["Rock"],     # Choose from the 15 valid gestures
                "use_powerup": False
            }
            
            print(f"\n[SENDING] Locking in '{move_payload['gestures'][0]}' move payload...")
            await websocket.send(json.dumps(move_payload))
            
            # 4. Listen to the broadcasted state update confirmation loop
            result = await websocket.recv()
            print("\n[RECEIVED] Server Broadcasted Result:\n", json.dumps(json.loads(result), indent=2))
            
    except Exception as e:
        print(f"❌ Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(client())