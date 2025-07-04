const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/share/:code", (req, res) => {
  if (!/^\d{4}-\d{2}$/.test(req.params.code)) {
    return res.status(400).send("Invalid session code format.");
  }
  res.sendFile(path.join(__dirname, "public/share.html"));
});

app.get("/view/:code", (req, res) => {
  if (!/^\d{4}-\d{2}$/.test(req.params.code)) {
    return res.status(400).send("Invalid session code format.");
  }
  res.sendFile(path.join(__dirname, "public/view.html"));
});

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
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Zyra View running on port ${PORT}`);
});
