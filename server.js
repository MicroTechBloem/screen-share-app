const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const activeRooms = new Map(); // roomId => sharer socket.id

io.on("connection", (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    const isSharer = !activeRooms.has(roomId);

    if (isSharer) {
      activeRooms.set(roomId, socket.id);
      socket.emit("sharer");
      console.log(`👤 Sharer joined room ${roomId}`);
    } else {
      socket.emit("viewer");
      console.log(`👤 Viewer joined room ${roomId}`);
    }
  });

  socket.on("screen-stream", ({ roomId, chunk }) => {
    socket.to(roomId).emit("screen-stream", chunk);
  });

  socket.on("chat-message", ({ roomId, message }) => {
    socket.to(roomId).emit("chat-message", { message, sender: socket.id });
  });

  socket.on("disconnect", () => {
    console.log(`❌ Disconnected: ${socket.id}`);
    for (const [roomId, sharerId] of activeRooms) {
      if (sharerId === socket.id) {
        activeRooms.delete(roomId);
        socket.to(roomId).emit("sharer-disconnected");
        console.log(`⚠️ Sharer left room ${roomId}`);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
