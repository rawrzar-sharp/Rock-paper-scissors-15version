import asyncio
import socketio
import json
import os

# Initialize the Socket.IO client
sio = socketio.AsyncClient()

SERVER_IP = os.environ.get("SERVER_IP", "34.67.224.115") 
PORT = "8000"

@sio.event
async def connect():
    print("✅ Connected to the Arena!")

@sio.event
async def sync_state(data):
    # This handles the 'sync_state' event broadcasted by the server
    print("\n[RECEIVED] Sync Update:\n", json.dumps(data, indent=2))

@sio.event
async def disconnect():
    print("❌ Disconnected from server")

async def run_client():
    session_id = "test-session-123"
    player_marker = "X"
    
    # 1. Connect with Query Parameters (Required for your server's @sio.event connect handler)
    print(f"Connecting to Arena via Socket.IO...")
        await sio.connect(f'http://{SERVER_IP}:{PORT}',
        socketio_path='/socket.io',
        query={'room': session_id, 'player': player_marker}
    )

    # 2. Emit an action (MOVE)
    move_payload = {
        "action": "MOVE",
        "gestures": ["Rock"],
        "use_powerup": False
    }
    
    print(f"\n[SENDING] Locking in move...")
    await sio.emit('player_action', move_payload)

    # Keep the script running briefly to see the response
    await asyncio.sleep(2)
    await sio.disconnect()

if __name__ == "__main__":
    asyncio.run(run_client())