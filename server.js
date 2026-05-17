const server = require('http').createServer();
const io = require('socket.io')(server, {});

io.on('connection', client => {
    
    client.on('event', data => {
        console.log("hi, the event from client is handled here");
    });

    client.on('disconnect', data => {
        console.log("bye bye, the client was disconnected");
    });

});

server.listen(3456);
console.log("websocket server is running on port 3456");