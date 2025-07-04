const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Session code management
let currentSessionCode = null;

function generateCode() {
  const part1 = Math.floor(1000 + Math.random() * 9000);
  const part2 = Math.floor(10 + Math.random() * 90);
  return `${part1}-${part2}`;
}

function updateCode() {
  currentSessionCode = generateCode();
  console.log("New session code:", currentSessionCode);
}
updateCode();
setInterval(updateCode, 10 * 60 * 1000); // Every 10 minutes

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/current-code", (req, res) => {
  res.json({ code: currentSessionCode });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/share/:code", (req, res) => {
  if (req.params.code !== currentSessionCode) {
    return res.status(403).send("Invalid or expired session code.");
  }
  res.sendFile(path.join(__dirname, "public/share.html"));
});

app.get("/view/:code", (req, res) => {
  if (req.params.code !== currentSessionCode) {
    return res.status(403).send("Invalid or expired session code.");
  }
  res.sendFile(path.join(__dirname, "public/view.html"));
});

// Socket.io connection and signaling (basic example)
io.on("connection", (socket) => {
  socket.on("join-room", (room) => {
    socket.join(room);
  });

  socket.on("screen-stream", (data) => {
    socket.to(data.room).emit("screen-stream", data);
  });

  socket.on("viewer-ready", (room) => {
    socket.to(room).emit("viewer-ready");
  });

  // Add any other socket events you want (laser, control requests, files, etc.)
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Zyra View running on port ${PORT}`);
});
