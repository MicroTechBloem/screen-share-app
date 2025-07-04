const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

// Room map: roomCode -> { sharerId, viewers: Set }
const rooms = new Map();

// Helper to clean old rooms (not implemented, add if needed)

io.on("connection", (socket) => {
  console.log("Connected", socket.id);

  socket.on("join-room", (roomCode, role) => {
    socket.join(roomCode);
    if (!rooms.has(roomCode)) rooms.set(roomCode, { sharerId: null, viewers: new Set() });
    const room = rooms.get(roomCode);

    if (role === "sharer") {
      room.sharerId = socket.id;
      console.log(`${socket.id} joined room ${roomCode} as sharer`);
      // Notify viewers sharer is online
      socket.to(roomCode).emit("sharer-online");
    } else if (role === "viewer") {
      room.viewers.add(socket.id);
      console.log(`${socket.id} joined room ${roomCode} as viewer`);
      // Notify sharer if needed (optional)
      if (room.sharerId) io.to(room.sharerId).emit("viewer-joined", socket.id);
    }

    // Acknowledge join
    socket.emit("joined", roomCode, role);
  });

  socket.on("screen-stream", (roomCode, chunk) => {
    // Send the video chunk from sharer to all viewers
    socket.to(roomCode).emit("screen-stream", chunk);
  });

  socket.on("chat-message", (roomCode, message) => {
    // Relay chat messages between sharer and viewers
    const room = rooms.get(roomCode);
    if (!room) return;
    // Broadcast to all except sender in that room
    socket.to(roomCode).emit("chat-message", { sender: socket.id, message });
  });

  socket.on("request-control", (roomCode) => {
    // Viewer requests control (placeholder)
    const room = rooms.get(roomCode);
    if (!room) return;
    if (room.sharerId) {
      io.to(room.sharerId).emit("control-request", socket.id);
    }
  });

  socket.on("disconnect", () => {
    // Clean up rooms on disconnect
    for (const [code, room] of rooms.entries()) {
      if (room.sharerId === socket.id) {
        // Sharer left: notify viewers
        io.to(code).emit("sharer-disconnected");
        rooms.delete(code);
      } else if (room.viewers.has(socket.id)) {
        room.viewers.delete(socket.id);
      }
    }
    console.log("Disconnected", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
