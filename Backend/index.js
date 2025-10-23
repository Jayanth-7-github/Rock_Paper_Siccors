// backend/index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

app.use(cors());

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://frolicking-praline-14031b.netlify.app",
    ],
    methods: ["GET", "POST"],
  },
});

const rooms = new Map();
const MATCH_POINTS_TO_WIN = 5; // First to 5 points wins the match

// Helper to log game events with room context
function logGameEvent(roomId, event, details) {
  const room = rooms.get(roomId);
  const playerCount = room ? room.players.length : 0;
  const scores = room ? Array.from(room.scores.entries()) : [];
  console.log(`[Room ${roomId}] ${event}`, {
    ...details,
    playerCount,
    scores,
    timestamp: new Date().toISOString(),
  });
}

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("join-room", ({ roomId, name }) => {
    // Validate room ID
    if (!roomId || typeof roomId !== "string" || roomId.trim() === "") {
      socket.emit("error", "Invalid room ID");
      return;
    }

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

    if (room.players.length === 2) {
      io.to(roomId).emit("both-players-joined", {
        players: room.players,
        scores: Array.from(room.scores.entries()),
      });
    }
  });

  const validMoves = new Set(["rock", "paper", "scissors"]);

  socket.on("player-move", (move) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    // Validate the move
    if (!validMoves.has(move)) {
      console.log(`Invalid move by ${socket.id}:`, move);
      return;
    }

    socket.data.move = move;
    const opponent = room.players.find((p) => p.id !== socket.id);
    const opponentSocket = opponent && io.sockets.sockets.get(opponent.id);

    if (opponentSocket && opponentSocket.data.move) {
      const result = getResult(socket.data.move, opponentSocket.data.move);
      const winnerId =
        result === "tie"
          ? null
          : result === "win"
          ? socket.id
          : opponentSocket.id;

      if (winnerId) {
        const newScore = room.scores.get(winnerId) + 1;
        room.scores.set(winnerId, newScore);

        // Check if someone won the match (first to MATCH_POINTS_TO_WIN)
        if (newScore >= MATCH_POINTS_TO_WIN) {
          const winner = room.players.find((p) => p.id === winnerId);
          logGameEvent(roomId, "match-end", {
            winner: winner.name,
            finalScores: Array.from(room.scores.entries()),
          });
          io.to(roomId).emit("match-end", {
            winnerId,
            scores: Array.from(room.scores.entries()),
          });
          // Reset scores for next match
          room.players.forEach((p) => room.scores.set(p.id, 0));
        }
      }

      // Ensure scores exist for both players
      if (!room.scores.has(socket.id)) {
        room.scores.set(socket.id, 0);
      }
      if (!room.scores.has(opponentSocket.id)) {
        room.scores.set(opponentSocket.id, 0);
      }

      // Include explicit result ('tie' | 'win' | 'lose') in the payload so frontend
      // doesn't have to infer tie from a null winnerId.
      logGameEvent(roomId, "round-result", {
        moves: {
          [socket.id]: socket.data.move,
          [opponentSocket.id]: opponentSocket.data.move,
        },
        winnerId,
        result,
      });

      io.to(roomId).emit("round-result", {
        moves: {
          [socket.id]: socket.data.move,
          [opponentSocket.id]: opponentSocket.data.move,
        },
        winnerId,
        scores: Array.from(room.scores.entries()),
        result, // 'tie' | 'win' | 'lose'
      });

      socket.data.move = null;
      opponentSocket.data.move = null;
    }
  });

  socket.on("rematch", () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    // Only allow rematch when both players have made moves
    const playersWithMoves = room.players.filter((p) => {
      const s = io.sockets.sockets.get(p.id);
      return s && s.data.move;
    });
    if (playersWithMoves.length > 0) {
      socket.emit("error", "Cannot request rematch during active round");
      return;
    }

    // Require both players to request a rematch.
    room.rematchRequests.add(socket.id);
    // Notify the other players that someone requested a rematch so the UI
    // can show an "Accept Rematch" or "Waiting" state.
    socket.to(roomId).emit("rematch-requested", {
      requesterId: socket.id,
      name: socket.data.name,
    });

    // If all players in the room have requested rematch, start it
    // and clear the requests set.
    if (room.rematchRequests.size === room.players.length) {
      room.rematchRequests.clear();
      io.to(roomId).emit("rematch-start");
    }
  });

  // Allow clients to cancel their rematch request (e.g. timeout)
  socket.on("rematch-cancel", () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    room.rematchRequests.delete(socket.id);
    socket.to(roomId).emit("rematch-cancelled", {
      requesterId: socket.id,
      name: socket.data.name,
    });
  });

  socket.on("leave-room", () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    logGameEvent(roomId, "player-left", {
      player: socket.data.name,
      playerId: socket.id,
    });

    // Store the name before cleaning up
    const playerName = socket.data.name;

    // Clean up player data
    socket.data.move = null;
    room.players = room.players.filter((p) => p.id !== socket.id);
    room.scores.delete(socket.id);
    room.rematchRequests.delete(socket.id);

    // Leave the socket.io room
    socket.leave(roomId);
    socket.data.roomId = null;
    socket.data.name = null;

    // Notify other players
    socket.to(roomId).emit("opponent-left", {
      name: playerName,
      message: `${playerName} has left the game`,
    });

    // Add system message to chat
    io.to(roomId).emit("chat-message", {
      sender: "System",
      text: `${playerName} has left the game`,
      type: "system",
    });

    // Clean up empty room
    if (room.players.length === 0) {
      rooms.delete(roomId);
    }
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

    const playerName = socket.data.name;
    console.log(`${playerName} (${socket.id}) disconnected`);

    // Clear this player's move
    socket.data.move = null;

    // Clear opponent's move to reset the round
    const opponent = room.players.find((p) => p.id !== socket.id);
    if (opponent) {
      const opponentSocket = io.sockets.sockets.get(opponent.id);
      if (opponentSocket) {
        opponentSocket.data.move = null;
      }
    }

    room.players = room.players.filter((p) => p.id !== socket.id);
    room.scores.delete(socket.id);
    room.rematchRequests.delete(socket.id);

    socket.to(roomId).emit("opponent-left", {
      name: playerName,
      message: `${playerName} has left the game`,
    });

    // Add system message to chat for disconnect
    io.to(roomId).emit("chat-message", {
      sender: "System",
      text: `${playerName} has disconnected from the game`,
      type: "system",
    });

    if (room.players.length === 0) {
      rooms.delete(roomId);
    }
  });
});

function getResult(p1, p2) {
  if (p1 === p2) return "tie";
  const beats = { rock: "scissors", paper: "rock", scissors: "paper" };
  return beats[p1] === p2 ? "win" : "lose";
}

server.listen(5000, () => {
  console.log("✅ Server running at https://rock-paper-siccors.onrender.com");
});
