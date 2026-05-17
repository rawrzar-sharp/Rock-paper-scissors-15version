import asyncio
import websockets

async def client():
    async with websockets.connect("ws://localhost:8000") as websocket:
        await websocket.send("Hello server!")
        response = await websocket.recv()
        print("Server replied:", response)

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