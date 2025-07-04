const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const activeRooms = new Map(); // roomId => socket.id

io.on("connection", socket => {
  console.log("🔌 New connection");

  socket.on("join-room", roomId => {
    socket.join(roomId);
    console.log(`👤 ${socket.id} joined room ${roomId}`);

    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, socket.id); // Set sharer
      socket.emit("sharer");
    } else {
      socket.emit("viewer");
    }
  });

  socket.on("screen-stream", ({ roomId, chunk }) => {
    socket.to(roomId).emit("screen-stream", chunk); // Send raw chunk
  });

  socket.on("chat-message", ({ roomId, message }) => {
    socket.to(roomId).emit("chat-message", { message, sender: socket.id });
  });

  socket.on("disconnect", () => {
    console.log(`❌ ${socket.id} disconnected`);
    for (let [roomId, id] of activeRooms) {
      if (id === socket.id) {
        activeRooms.delete(roomId);
        io.to(roomId).emit("sharer-disconnected");
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
