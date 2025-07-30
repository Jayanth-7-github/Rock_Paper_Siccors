const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const rooms = {};

io.on('connection', socket => {
  socket.on('create-room', ({ username }) => {
    const roomId = uuidv4().slice(0, 6).toUpperCase();
    rooms[roomId] = {
      players: [{ id: socket.id, username, score: 0, streak: 0 }],
      choices: {},
      timer: null
    };
    socket.join(roomId);
    socket.emit('room-created', { roomId });
  });

  socket.on('join-room', ({ roomId, username }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit('invalid-room', 'Room not found');
    if (room.players.length >= 2) return socket.emit('invalid-room', 'Room full');

    room.players.push({ id: socket.id, username, score: 0, streak: 0 });
    socket.join(roomId);

    io.to(roomId).emit('user-joined', room.players);
    startRoundTimer(roomId);
  });

  socket.on('player-choice', ({ roomId, choice }) => {
    const room = rooms[roomId];
    if (!room) return;
    room.choices[socket.id] = choice;

    if (Object.keys(room.choices).length === 2) {
      clearTimeout(room.timer);
      evaluateRound(roomId);
    }
  });

  socket.on('reset-round', roomId => {
    const room = rooms[roomId];
    if (room) {
      room.choices = {};
      io.to(roomId).emit('round-reset');
      startRoundTimer(roomId);
    }
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      room.players = room.players.filter(p => p.id !== socket.id);
      delete room.choices[socket.id];
      if (room.players.length === 0) delete rooms[roomId];
      else io.to(roomId).emit('user-joined', room.players);
    }
  });

  function startRoundTimer(roomId) {
    const room = rooms[roomId];
    room.timer = setTimeout(() => {
      if (Object.keys(room.choices).length < 2) {
        io.to(roomId).emit('round-timeout');
        room.choices = {};
      }
    }, 15000); // 15 seconds
  }

  function evaluateRound(roomId) {
    const room = rooms[roomId];
    const [p1, p2] = room.players;
    const c1 = room.choices[p1.id];
    const c2 = room.choices[p2.id];

    let result;
    if (c1 === c2) {
      result = 'Draw';
      p1.streak = 0;
      p2.streak = 0;
    } else if ((c1 === 'rock' && c2 === 'scissors') || (c1 === 'paper' && c2 === 'rock') || (c1 === 'scissors' && c2 === 'paper')) {
      result = `${p1.username} wins!`;
      p1.score++;
      p1.streak++;
      p2.streak = 0;
    } else {
      result = `${p2.username} wins!`;
      p2.score++;
      p2.streak++;
      p1.streak = 0;
    }

    io.to(roomId).emit('round-result', {
      result,
      players: room.players,
      choices: room.choices
    });
  }
});

server.listen(5000, () => console.log('Server listening on port 5000'));