const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Temporary in-memory password store
const roomPasswords = {};

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/share/:roomId", (req, res) => {
  const roomId = req.params.roomId;
  const pass = req.query.pass;
  if (pass) roomPasswords[roomId] = pass;
  res.sendFile(path.join(__dirname, "public/share.html"));
});

app.get("/view/:roomId", (req, res) => {
  const roomId = req.params.roomId;
  const pass = req.query.pass;
  if (roomPasswords[roomId] && roomPasswords[roomId] !== pass) {
    return res.status(403).send("❌ Incorrect password for this room.");
  }
  res.sendFile(path.join(__dirname, "public/view.html"));
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
  });

  socket.on("screen-stream", (data) => {
    socket.to(data.room).emit("screen-stream", data);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Zyra View running on port ${PORT}`);
});
