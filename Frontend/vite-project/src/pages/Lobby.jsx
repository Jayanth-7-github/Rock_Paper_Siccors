// src/pages/Lobby.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import socket from "../socket";
import { usePlayer } from "../context/PlayerContext";

const WaitingDots = ({ className = "" }) => (
  <span className={`inline-flex ${className}`} aria-hidden>
    <span className="w-2 h-2 bg-white rounded-full mr-1 animate-bounce-200" />
    <span className="w-2 h-2 bg-white rounded-full mr-1 animate-bounce-400" />
    <span className="w-2 h-2 bg-white rounded-full animate-bounce-600" />
  </span>
);

const Lobby = () => {
  const { player } = usePlayer();
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);

  const copyRoom = useCallback(() => {
    if (!roomId) return;
    navigator.clipboard
      ?.writeText(roomId)
      .then(() => {
        // small visual confirmation
        // using alert is intrusive; use a temporary DOM update instead
        // but keep simple: brief toast-like alert
        alert("Room ID copied to clipboard");
      })
      .catch(() => {
        alert("Unable to copy. Please copy manually: " + roomId);
      });
  }, [roomId]);

  useEffect(() => {
    if (!player?.name) {
      navigate("/");
      return;
    }

    socket.emit("join-room", { roomId, name: player.name });

    socket.on("room-full", () => {
      alert("Room is full!");
      navigate("/");
    });

    socket.on("both-players-joined", ({ players: joined }) => {
      setPlayers(joined || []);
      // short entrance animation delay before routing
      setTimeout(() => navigate(`/game/${roomId}`), 1200);
    });

    socket.on("update-players", ({ players: updated }) => {
      setPlayers(updated || []);
    });

    socket.on("opponent-left", () => {
      alert("Opponent disconnected");
      navigate("/");
    });

    return () => {
      // tell server we're leaving so it can free the slot
      socket.emit("leave-room", { roomId, name: player.name });
      socket.off("room-full");
      socket.off("both-players-joined");
      socket.off("update-players");
      socket.off("opponent-left");
    };
  }, [player, roomId, navigate]);

  return (
    <div className="min-h-screen bg-gray-800 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-gray-900/60 backdrop-blur rounded-2xl p-8 shadow-xl border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Room</h2>
            <p className="text-sm text-gray-300">
              ID: <span className="font-mono text-white">{roomId}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={copyRoom}
              className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 transition"
            >
              Copy
            </button>
            <button
              onClick={() => {
                socket.emit("leave-room", { roomId, name: player.name });
                navigate("/");
              }}
              className="px-3 py-1 rounded-md bg-red-600/80 hover:bg-red-600 transition"
            >
              Leave
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="text-lg mb-3">Players</h3>
            <div className="space-y-3">
              {/* Show current player first */}
              <div className="flex items-center gap-3 p-3 rounded-md bg-gray-900/40 border border-gray-700 animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-xl font-semibold">
                  {player.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-300">You</div>
                  <div className="font-medium">{player.name}</div>
                </div>
                <div className="text-green-400 font-semibold">Ready</div>
              </div>

              {players.length === 0 && (
                <div className="flex items-center gap-3 p-3 rounded-md bg-gray-900/20 border border-dashed border-gray-700 text-gray-400">
                  <div className="w-10 h-10 rounded-full bg-gray-800/40 flex items-center justify-center">
                    🤝
                  </div>
                  <div className="flex-1">
                    Waiting for opponent <WaitingDots className="ml-2" />
                  </div>
                </div>
              )}

              {players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-3 rounded-md bg-gradient-to-r from-gray-900/40 to-gray-900/20 border border-gray-700 transform transition hover:scale-[1.01] animate-slide-up"
                >
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-xl font-semibold">
                    {p.name?.charAt(0)?.toUpperCase() || "P"}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-300">Player</div>
                    <div className="font-medium">{p.name}</div>
                  </div>
                  <div className="text-yellow-300">Connected</div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-80 p-4 bg-gray-800 rounded-lg border border-gray-700 flex flex-col items-center justify-center">
            <h3 className="text-lg mb-2">Match Status</h3>
            <div className="text-sm text-gray-300 mb-3">
              Waiting for players to join
            </div>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400/20 to-green-400/10 flex items-center justify-center">
              <WaitingDots className="" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
