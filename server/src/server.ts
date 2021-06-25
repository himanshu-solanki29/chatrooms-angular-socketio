import * as express from "express";
import { Socket } from "socket.io";
const app = express();
const http = require("http");
const server = http.createServer(app);
const socket = require("socket.io");

// Client/Server Config
const clientUrl = "http://localhost:4200";
const serverPort = 3000;

const io: Socket = socket(server, {
    maxHttpBufferSize: 10e8,
    allowEIO3: true,
    cors: {
        origin: clientUrl,
        credentials: true,
    },
});

var messages: any = {};
var activeUsers = [];

io.on("connection", (socket: Socket) => {
    console.log("New connection made", socket.id);

    socket.on("join", (data: any) => {
        let roomId = data.roomId;
        let user = data.user;

        console.log("Request for roomid ::", roomId);
        if (data.roomId == null) {
            roomId = generateUniqueId();
        } else if(!messages[roomId]) {
            console.log("Invalid Room Id ::",roomId);
            //Emit event back to the same socket
            io.to(socket.id).emit("invalid-room", roomId);
            return;
        } else if (!isUsernameAllowed(user,roomId)) {
            io.to(socket.id).emit("invalid-user", user);
             return;
        } 

        socket.join(roomId);
        console.log(socket.id, "with username",user,"joined the room", roomId);

        // If roomId is not null and room do not exist, create a room.
        // Else, add user to the existing room.
        if (!messages[roomId]) {
            createNewRoom(socket.id,roomId,user);
        } else {
            addUserToRoom(socket.id,roomId,user);
        }

        console.log("Socket Messages ::",messages);

        io.to(roomId).emit("new-user", { data: messages[roomId] });

        socket.on("new-message", (messageData) => {
            let messageDetails = sendMessageToRoom(socket.id,roomId,messageData);
            socket.broadcast.to(roomId).emit("new-message", { messageDetails });
        });

        socket.on("disconnect", () => {
            let username = removeUserFromRoom(socket.id,roomId);
            console.log(username, socket.id, "disconnected")
            io.to(roomId).emit("user-disconnected", { data: username });
        });
        // socket.broadcast.to(data.roomId).emit('new-user', { data : messages[data.roomId]});
    });
});

function createNewRoom(socketId: string, roomId: string, user: string) {
    console.log("Creating new room");
    let connectedClients = [];
    connectedClients.push({ socketId: socketId, username: user });
    let roomDetails = {
        roomId: roomId,
        connectedClients: connectedClients,
        lastJoinedBy: user,
    };
    messages[roomId] = { roomDetails: roomDetails };
    console.log(messages);
}

function addUserToRoom(socketId: string, roomId: string, user: string) {
    messages[roomId].roomDetails.lastJoinedBy = user;
    let currentConnections = messages[roomId].roomDetails.connectedClients;
    let connectedClients = new Set(currentConnections);
    console.log("Room Available adding user", socketId, user);
    connectedClients.add({ socketId: socketId, username: user });
    messages[roomId].roomDetails.connectedClients = Array.from(connectedClients);
}

function removeUserFromRoom(socketId:string, roomId:string) {
    let currentConnections = messages[roomId].roomDetails.connectedClients;
    let connectedClients = new Set(currentConnections);
    let username = getUsernameWithSocketId(roomId, socketId);
    console.log(username);
    connectedClients.forEach((x: any) =>
        x.socketId === socketId && x.username === username
            ? connectedClients.delete(x)
            : x
    );
    // _connectedClients.delete({ socketId: socket.id, username: _username });
    console.log("Size after removing ", connectedClients.size);
    messages[roomId].roomDetails.connectedClients = Array.from(connectedClients);
    return username;
}

function sendMessageToRoom(socketId:string, roomId:string, messageData:any) {
    console.log("new message", socket.id, messageData);

    if (!messages[roomId].messages) {
        messages[roomId].messages = [];
    }

    let messageDetails = {
        socketId: socketId,
        sender: messageData.sender,
        message: messageData.message,
        messageType: messageData.messageType,
        timestamp : messageData.timestamp
    };

    console.log("messageDetails", messageDetails);
    messages[roomId].messages.push(messageDetails);
    console.log("messages", messages[roomId].messages);
    console.log("broadcasting to ", roomId);
    return messageDetails;
}

function isUsernameAllowed(username:string, roomId:string) {


        let userInRoom = messages[roomId].roomDetails.connectedClients.find(
            (e: any) => {
                return e.username.toLowerCase() === username.toLowerCase();
            }
        );

        console.log("User in room::", userInRoom);
        if(userInRoom) return false;
        return true;
 
}

function generateUniqueId() {
    return Math.random().toString(36).substr(2, 9);
}

function getUsernameWithSocketId(roomId: string, socketId: string) {
    let clientDetails = messages[roomId].roomDetails.connectedClients.find(
        (e: any) => {
            return e.socketId === socketId;
        }
    );
    console.log(clientDetails);
    return clientDetails.username;
}

server.listen(serverPort, "0.0.0.0", () =>
    console.log(`Server is listening on port ${serverPort}`)
);
