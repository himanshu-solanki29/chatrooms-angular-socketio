import { Socket } from "socket.io";
const express = require("express");
const http = require("http");
const app = express();


const server = http.createServer(app);
const socket = require("socket.io");
const io:Socket = socket(server, {
  allowEIO3: true, cors: {
    origin: "http://localhost:4200",
    credentials: true
  }
});

messages = {};
activeUsers = [];

io.on('connection', socket => {
  console.log("New connection made", socket.id);
  socket.on('join',(data)=> {

    let roomId=data.roomId;
    console.log("roomid", data.roomId);
    if(data.roomId == null) {
       roomId=generateUniqueId();
    } else if(!messages[roomId]) {
      return;
    }

    socket.join(roomId);

    if(!messages[roomId]) {
      console.log("Creating new room");
      let _connectedClients=[];
      _connectedClients.push(socket.id);
      let _roomDetails = { roomId : roomId, connectedClients : _connectedClients  };

      messages[roomId] = { roomDetails: _roomDetails } ;
      console.log(messages);
    } else {
      let _currentConnections = messages[roomId].roomDetails.connectedClients;
      let _connectedClients = new Set(_currentConnections);
      _connectedClients.add(socket.id);
      messages[roomId].roomDetails.connectedClients = Array.from(_connectedClients);
    }
    console.log(socket.id, "joined the room", roomId);
    console.log(messages);
    io.to(roomId).emit('new-user', { data : messages[roomId]});

    socket.on("disconnect", ()=> {
      let _currentConnections = messages[roomId].roomDetails.connectedClients;
      let _connectedClients = new Set(_currentConnections);
      _connectedClients.delete(socket.id);
      messages[roomId].roomDetails.connectedClients = Array.from(_connectedClients);
      io.to(roomId).emit('new-user', { data : messages[roomId]});
    })
    // socket.broadcast.to(data.roomId).emit('new-user', { data : messages[data.roomId]});
  })
})

function generateUniqueId() {
  return Math.random().toString(36).substr(2, 9);
}


server.listen(3000, () => console.log("Server is listening on port 3000"));
