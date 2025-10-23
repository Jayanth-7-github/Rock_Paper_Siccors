// backend/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

app.use(cors());

const io = new Server(server, {
  cors: {
    origin: "https://frolicking-praline-14031b.netlify.app",
    methods: ["GET", "POST"],
  },
});

const rooms = new Map();

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("join-room", ({ roomId, name }) => {
    let room = rooms.get(roomId);
    if (!room) {
      room = {
        players: [],
        scores: new Map(),
        rematchRequests: new Set(),
      };
      rooms.set(roomId, room);
    }

    // Remove any old player with same socket.id
    room.players = room.players.filter((p) => p.id !== socket.id);

    if (room.players.length >= 2) {
      socket.emit("room-full");
      return;
    }

    const player = { id: socket.id, name };
    room.players.push(player);
    room.scores.set(socket.id, 0);

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.name = name;

    console.log(`${name} joined room ${roomId}`);

    // Notify all clients in room about updated players
    io.to(roomId).emit("update-players", { players: room.players });

    if (room.players.length === 2) {
      io.to(roomId).emit("both-players-joined", {
        players: room.players,
        scores: Array.from(room.scores.entries()),
      });
    }
  });

  socket.on("player-move", (move) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    socket.data.move = move;
    const opponent = room.players.find((p) => p.id !== socket.id);
    const opponentSocket = opponent && io.sockets.sockets.get(opponent.id);

    if (opponentSocket && opponentSocket.data.move) {
      const result = getResult(socket.data.move, opponentSocket.data.move);
      const winnerId =
        result === "draw"
          ? null
          : result === "win"
          ? socket.id
          : opponentSocket.id;

      if (winnerId) {
        room.scores.set(winnerId, room.scores.get(winnerId) + 1);
      }

      // derive per-player result string for convenience (win/lose/tie)
      const resultForSocket =
        result === "draw" ? "tie" : result === "win" ? "win" : "lose";
      const resultForOpponent =
        result === "draw" ? "tie" : result === "win" ? "lose" : "win";

      // Emit to the room the round-result with generic payload
      io.to(roomId).emit("round-result", {
        moves: {
          [socket.id]: socket.data.move,
          [opponentSocket.id]: opponentSocket.data.move,
        },
        winnerId,
        scores: Array.from(room.scores.entries()),
        // include a neutral result; individual clients can derive their own, but
        // also include explicit results per player socket id so frontend can prefer it
        resultsById: {
          [socket.id]: resultForSocket,
          [opponentSocket.id]: resultForOpponent,
        },
        // backwards-compatible `result` field for convenience when emitted to each socket
      });

      // Also emit individualized `round-result` events with `result` field to each participant
      socket.emit("round-result", {
        moves: {
          [socket.id]: socket.data.move,
          [opponentSocket.id]: opponentSocket.data.move,
        },
        winnerId,
        scores: Array.from(room.scores.entries()),
        result: resultForSocket,
      });

      opponentSocket.emit("round-result", {
        moves: {
          [socket.id]: socket.data.move,
          [opponentSocket.id]: opponentSocket.data.move,
        },
        winnerId,
        scores: Array.from(room.scores.entries()),
        result: resultForOpponent,
      });

      socket.data.move = null;
      opponentSocket.data.move = null;

      // Check for match end (first to 3 wins)
      const WIN_THRESHOLD = 3;
      const maybeWinner = Array.from(room.scores.entries()).find(
        ([, s]) => s >= WIN_THRESHOLD
      );
      if (maybeWinner) {
        const [winnerSocketId] = maybeWinner;
        io.to(roomId).emit("match-end", {
          winnerId: winnerSocketId,
          scores: Array.from(room.scores.entries()),
        });
        // Reset scores for next match but keep players in room
        room.scores.forEach((_, key) => room.scores.set(key, 0));
      }
    }
  });

  socket.on("rematch", () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    room.rematchRequests.add(socket.id);
    // Notify both players that a rematch was requested (who requested it)
    io.to(roomId).emit("rematch-requested", {
      requesterId: socket.id,
      name: socket.data.name,
    });

    if (room.rematchRequests.size === 2) {
      room.rematchRequests.clear();
      io.to(roomId).emit("rematch-start");
    }
  });

  socket.on("rematch-cancel", () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room) return;
    room.rematchRequests.delete(socket.id);
    io.to(roomId).emit("rematch-cancelled", {
      requesterId: socket.id,
      name: socket.data.name,
    });
  });

  // Allow client to explicitly leave the room
  socket.on("leave-room", () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room) return;
    // remove player and cleanup similar to disconnect
    room.players = room.players.filter((p) => p.id !== socket.id);
    room.scores.delete(socket.id);
    room.rematchRequests.delete(socket.id);
    socket.leave(roomId);
    socket.data.roomId = null;
    socket
      .to(roomId)
      .emit("opponent-left", {
        name: socket.data.name,
        message: `${socket.data.name} left the room.`,
      });
    io.to(roomId).emit("update-players", { players: room.players });
    if (room.players.length === 0) rooms.delete(roomId);
  });

  // ✅ Attach chat handler ONCE per connection
  socket.on("chat-message", (text) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    const msg = { sender: player.name, text };
    io.to(roomId).emit("chat-message", msg);
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    console.log(`${socket.id} disconnected`);

    room.players = room.players.filter((p) => p.id !== socket.id);
    room.scores.delete(socket.id);
    room.rematchRequests.delete(socket.id);

    socket.to(roomId).emit("opponent-left");

    if (room.players.length === 0) {
      rooms.delete(roomId);
    }
  });
});

function getResult(p1, p2) {
  if (p1 === p2) return "draw";
  const beats = { rock: "scissors", paper: "rock", scissors: "paper" };
  return beats[p1] === p2 ? "win" : "lose";
}

server.listen(5000, () => {
  console.log("✅ Server running at https://rock-paper-siccors.onrender.com");
});
