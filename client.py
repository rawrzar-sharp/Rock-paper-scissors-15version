import asyncio
import json
import websockets

async def client():
    # 1. Target the exact path format with a dummy session and player marker
    uri = "localhost:3000/api/rps15/ws/{session_id}/{player_marker}".format(session_id="test-session-123")
    
    try:
        async with websockets.connect(uri) as websocket:
            # Receive the initial state the server pushes on connection
            welcome_msg = await websocket.recv()
            print("Received Welcome State:\n", json.loads(welcome_msg))
            
            # 2. Format a payload that matches your server's expected actions ("MOVE", "PAUSE", "FORFEIT")
            move_payload = {
                "action": "MOVE",
                "gestures": ["Rock", "Fire"]
            }
            
            print("\nSending MOVE payload to arena...")
            await websocket.send(json.dumps(move_payload))
            
            # Listen to the broadcasted evaluation loop
            result = await websocket.recv()
            print("\nServer broadcasted result:\n", json.loads(result))
            
    except Exception as e:
        print(f"Connection failed: {e}")

asyncio.run(client())


# // const {io }= require("socket.io-client");

# // const socket = io('http://localhost:3456');
# // socket.on("connect", () => {

# // console.Log(socket.id); //x8WIv7-mJelg7on_ALbx
# // });

# // socket.on('event-1',()=> {
# // console.Log('server is sending us this event-1')
# // })

# // socket.on("disconnect", () => {
# // console. log(">>>>>>>>>>>>>>>>>>>> dc")
# // console.Log(socket.id); // undefined
# // });