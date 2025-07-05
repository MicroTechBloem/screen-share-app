const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId, role) => {
    socket.join(roomId);
    console.log(`${socket.id} joined room ${roomId} as ${role}`);

    if (!rooms[roomId]) {
      rooms[roomId] = { sharer: null, viewers: [] };
    }

    if (role === 'sharer') {
      rooms[roomId].sharer = socket.id;
    } else {
      rooms[roomId].viewers.push(socket.id);
      // Notify sharer that viewer joined
      if (rooms[roomId].sharer) {
        io.to(rooms[roomId].sharer).emit('viewer-joined', socket.id);
      }
    }
  });

  socket.on('offer', (offer, viewerId) => {
    io.to(viewerId).emit('offer', offer, socket.id);
  });

  socket.on('answer', (answer, sharerId) => {
    io.to(sharerId).emit('answer', answer, socket.id);
  });

  socket.on('ice-candidate', (candidate, otherId) => {
    io.to(otherId).emit('ice-candidate', candidate, socket.id);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Clean up rooms if needed
    for (const roomId in rooms) {
      if (rooms[roomId].sharer === socket.id) {
        // Sharer left, notify viewers
        rooms[roomId].viewers.forEach(v => io.to(v).emit('sharer-left'));
        delete rooms[roomId];
      } else {
        const idx = rooms[roomId].viewers.indexOf(socket.id);
        if (idx !== -1) {
          rooms[roomId].viewers.splice(idx, 1);
        }
      }
    }
  });
});

const PORT = 3000;
http.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
