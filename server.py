import asyncio
import websockets

async def handler(connection):
    print("Client connected")

    message = await connection.recv()
    print("Received from client:", message)
    await connection.send("Hello client!")


async def main():
    async with websockets.serve(handler, "localhost", 5000):
        print("Server running at ws://localhost:8000")
        #await asyncio.Future()  # runs forever
        await asyncio.sleep(30)

asyncio.run(main())

# const server = require('http').createServer();
# // const io = require('socket.io')(server, {});

# // io.on('connection', client => {
    
# //     client.on('event', data => {
# //         console.log("hi, the event from client is handled here");
# //     });

# //     client.on('disconnect', data => {
# //         console.log("bye bye, the client was disconnected");
# //     });

# // });

# // server.listen(3456);
# // console.log("websocket server is running on port 3456");