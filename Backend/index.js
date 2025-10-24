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
    origin: "https://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const rooms = new Map();

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("join-room", ({ roomId, name }) => {
    console.log(
      `Join room request - Room: ${roomId}, Player: ${name} (${socket.id})`
    );
    let room = rooms.get(roomId);
    if (!room) {
      room = {
        players: [],
        scores: new Map(),
        rematchRequests: new Set(),
        creator: socket.id, // Track the room creator
      };
      rooms.set(roomId, room);
      console.log(`Created new room ${roomId}`);
      // Notify the creator
      socket.emit("room-creator");
    }
    console.log(`Current room state:`, {
      roomId,
      playerCount: room.players.length,
      players: room.players.map((p) => ({ id: p.id, name: p.name })),
    });

    // Remove any old player with same socket.id
    room.players = room.players.filter((p) => p.id !== socket.id);

    const player = { id: socket.id, name };
    room.players.push(player);
    room.scores.set(socket.id, 0);

    // Check room full after adding the player
    if (room.players.length > 2) {
      room.players = room.players.filter((p) => p.id !== socket.id);
      room.scores.delete(socket.id);
      socket.emit("room-full");
      return;
    }

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.name = name;

    console.log(`${name} joined room ${roomId}`);

    // First notify about player update
    io.to(roomId).emit("update-players", {
      players: room.players,
    });
    console.log(`Sent update-players event for room ${roomId}:`, room.players);

    // Then if we have exactly 2 players, emit both-players-joined
    if (room.players.length === 2) {
      console.log(
        `Both players joined room ${roomId}, sending both-players-joined event`
      );
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
      const isDraw = result === "draw";
      const winnerId = isDraw
        ? "draw"
        : result === "win"
        ? socket.id
        : opponentSocket.id;

      if (!isDraw && winnerId) {
        room.scores.set(winnerId, room.scores.get(winnerId) + 1);
      }

      io.to(roomId).emit("round-result", {
        moves: {
          [socket.id]: socket.data.move,
          [opponentSocket.id]: opponentSocket.data.move,
        },
        winnerId,
        isDraw,
        scores: Array.from(room.scores.entries()),
      });

      socket.data.move = null;
      opponentSocket.data.move = null;
    }
  });

  socket.on("rematch-request", () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    room.rematchRequests.add(socket.id);

    // Notify all players about the rematch request
    io.to(roomId).emit("rematch-requested", {
      requesterId: socket.id,
      requesterName: socket.data.name,
    });

    if (room.rematchRequests.size === 2) {
      room.rematchRequests.clear();
      io.to(roomId).emit("rematch-start");
    }
  });

  socket.on("rematch-decline", () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    room.rematchRequests.clear();
    io.to(roomId).emit("rematch-declined", {
      declinerId: socket.id,
      declinerName: socket.data.name,
    });
  });

  // Handle explicit leave-room (client navigation) similarly to disconnect
  socket.on("leave-room", ({ roomId }) => {
    console.log(`Player ${socket.id} leaving room ${roomId}`);
    const room = rooms.get(roomId);
    if (!room) {
      console.log(`Room ${roomId} not found`);
      return;
    }

    // Remove the leaving player
    const wasInRoom = room.players.some((p) => p.id === socket.id);
    room.players = room.players.filter((p) => p.id !== socket.id);
    room.scores.delete(socket.id);
    room.rematchRequests.delete(socket.id);

    if (wasInRoom) {
      // Notify remaining players
      console.log(`Notifying remaining players in room ${roomId}`);
      socket.to(roomId).emit("opponent-left");
      io.to(roomId).emit("update-players", { players: room.players });
    }

    if (room.players.length === 0) {
      console.log(`Deleting empty room ${roomId}`);
      rooms.delete(roomId);
    }

    // Leave the socket.io room
    socket.leave(roomId);
  });

  // Handle game start from creator
  socket.on("start-game", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.creator !== socket.id) return;

    // Notify all players that the game is starting
    io.to(roomId).emit("game-started");
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
    if (!roomId) {
      console.log(`Socket ${socket.id} disconnected (not in a room)`);
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      console.log(
        `Socket ${socket.id} disconnected (room ${roomId} not found)`
      );
      return;
    }

    console.log(`Player ${socket.id} disconnected from room ${roomId}`);

    // Check if player was actually in the room
    const wasInRoom = room.players.some((p) => p.id === socket.id);
    room.players = room.players.filter((p) => p.id !== socket.id);
    room.scores.delete(socket.id);
    room.rematchRequests.delete(socket.id);

    if (wasInRoom) {
      // Notify remaining players that someone left and send updated players list
      console.log(`Notifying remaining players in room ${roomId}`);
      socket.to(roomId).emit("opponent-left");
      io.to(roomId).emit("update-players", { players: room.players });
    }

    if (room.players.length === 0) {
      console.log(`Deleting empty room ${roomId}`);
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
  console.log("✅ Server running at https://localhost:5000");
});
