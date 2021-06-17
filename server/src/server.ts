import * as express from "express";
import { Socket } from "socket.io";

const app = express();
const http = require("http");
const server = http.createServer(app);
const socket = require("socket.io");
const io: Socket = socket(server, {
    allowEIO3: true, cors: {
        origin: "http://192.168.1.100:4200",
        credentials: true
    }
});

var messages: any = {};
var activeUsers = [];

io.on('connection', (socket: Socket) => {
    console.log("New connection made", socket.id);
    socket.on('join', (data: any) => {

        let roomId = data.roomId;
        let user=data.user;

        console.log("roomid", data.roomId);
        if (data.roomId == null) {
            roomId = generateUniqueId();
        } else if (!messages[roomId]) {
            console.log("Invalid Room Id");
            io.to(socket.id).emit("invalid-room",roomId);
            return;
        }

        socket.join(roomId);

        if (!messages[roomId]) {
            console.log("Creating new room");
            let _connectedClients = [];
            _connectedClients.push({ socketId: socket.id, username: user });

            let _roomDetails = { roomId: roomId, connectedClients: _connectedClients, lastJoinedBy: user };

            messages[roomId] = { roomDetails: _roomDetails };
            console.log(messages);
        } else {
            messages[roomId].roomDetails.lastJoinedBy = user;
            let _currentConnections = messages[roomId].roomDetails.connectedClients;
            let _connectedClients = new Set(_currentConnections);
            console.log("Room Available adding user", socket.id, user);
            
            _connectedClients.add({ socketId: socket.id, username: user });
            messages[roomId].roomDetails.connectedClients = Array.from(_connectedClients);
        }
        console.log(socket.id, "joined the room", roomId);
        console.log(messages);
        io.to(roomId).emit('new-user', { data: messages[roomId] });

        socket.on("user-typing-send",(user) => {
            
            socket.broadcast.to(roomId).emit("user-typing-recv", { user });
        });

        socket.on("send-message",(messageData) => {
            console.log("New Message",socket.id,messageData.message);
                
              if(!messages[roomId].messages) {
                messages[roomId].messages = [];
              } 
    
              let messageDetails = { socketId: socket.id, sender: messageData.sender, message: messageData.message};
              console.log("messageDetails",messageDetails);
              messages[roomId].messages.push(messageDetails);
              console.log("messages",messages[roomId].messages);
              console.log("sending to ",roomId);
              
              socket.broadcast.to(roomId).emit("receive-message", { messageDetails });
            });


        socket.on("disconnect", () => {
            let _currentConnections = messages[roomId].roomDetails.connectedClients;
            let _connectedClients = new Set(_currentConnections);
            let _username = getUsernameWithSocketId(roomId,socket.id);
            console.log(_username);
            _connectedClients.forEach((x:any) => (x.socketId === socket.id && x.username === _username) ? _connectedClients.delete(x) : x)
            // _connectedClients.delete({ socketId: socket.id, username: _username });
            console.log( "Size after removing ", (_connectedClients.size));
            messages[roomId].roomDetails.connectedClients = Array.from(_connectedClients);
            io.to(roomId).emit('user-disconnected', { data : _username });
        })
        // socket.broadcast.to(data.roomId).emit('new-user', { data : messages[data.roomId]});
    })
})

function generateUniqueId() {
    return Math.random().toString(36).substr(2, 9);
}

function getUsernameWithSocketId(roomId:string, socketId:string) {
    let _clientDetails = messages[roomId].roomDetails.connectedClients.find( (e:any)=> { return e.socketId === socketId });
    console.log(_clientDetails);
    return _clientDetails.username;
}

server.listen(3000,"0.0.0.0", () => console.log("Server is listening on port 3000"));








