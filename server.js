const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// In-memory store for session codes
const activeSessions = {};

// Helper: generate random session code like 1515-22
function generateCode() {
  const part1 = Math.floor(1000 + Math.random() * 9000);
  const part2 = Math.floor(10 + Math.random() * 90);
  return `${part1}-${part2}`;
}

// Helper: expire code after 10 minutes
function expireCode(code) {
  setTimeout(() => {
    delete activeSessions[code];
    console.log(`Session expired: ${code}`);
  }, 10 * 60 * 1000); // 10 minutes
}

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Route for generating a new code (optional API)
app.get("/api/new-code", (req, res) => {
  const code = generateCode();
  activeSessions[code] = { password: null };
  expireCode(code);
  res.json({ code });
});

// Share screen
app.get("/share/:code", (req, res) => {
  const code = req.params.code;
  const pass = req.query.pass;

  if (!activeSessions[code]) {
    activeSessions[code] = { password: pass || null };
    expireCode(code);
  } else {
    activeSessions[code].password = pass || activeSessions[code].password;
  }

  res.sendFile(path.join(__dirname, "public/share.html"));
});

// View screen
app.get("/view/:code", (req, res) => {
  const code = req.params.code;
  const pass = req.query.pass;

  if (!activeSessions[code]) {
    return res.status(403).send("❌ Session not found or expired.");
  }

  const sessionPass = activeSessions[code].password;
  if (sessionPass && sessionPass !== pass) {
    return res.status(403).send("❌ Incorrect password.");
  }

  res.sendFile(path.join(__dirname, "public/view.html"));
});

io.on("connection", (socket) => {
  socket.on("join-room", (code) => {
    socket.join(code);
  });

  socket.on("screen-stream", (data) => {
    socket.to(data.room).emit("screen-stream", data);
  });

  socket.on("laser", (data) => {
    socket.to(data.room).emit("laser", data);
  });

  socket.on("file-send", (data) => {
    socket.to(data.room).emit("file-receive", data);
  });

  socket.on("control-request", (data) => {
    socket.to(data.room).emit("control-request", data);
  });

  socket.on("control-granted", (data) => {
    socket.to(data.room).emit("control-granted", data);
  });

  socket.on("mouse-event", (data) => {
    socket.to(data.room).emit("mouse-event", data);
  });

  socket.on("keyboard-event", (data) => {
    socket.to(data.room).emit("keyboard-event", data);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Zyra View Enterprise running on http://localhost:${PORT}`);
});
