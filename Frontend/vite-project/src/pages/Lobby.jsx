// src/pages/Lobby.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import socket from "../socket";
import { usePlayer } from "../context/PlayerContext";

const Lobby = () => {
  const { player } = usePlayer();
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (!player.name) {
      navigate("/");
      return;
    }

    socket.emit("join-room", { roomId, name: player.name });

    socket.on("room-full", () => {
      alert("Room is full!");
      navigate("/");
    });

    socket.on("both-players-joined", ({ players }) => {
      setPlayers(players);
      setTimeout(() => {
        navigate(`/game/${roomId}`);
      }, 1500);
    });

    socket.on("opponent-left", () => {
      alert("Opponent disconnected");
      navigate("/");
    });

    return () => {
      socket.off("room-full");
      socket.off("both-players-joined");
      socket.off("opponent-left");
    };
  }, [player, roomId, navigate]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Room Info Card */}
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full mb-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-medium text-gray-400 mb-2">ROOM CODE</h2>
          <div className="text-4xl font-bold text-indigo-400">#{roomId}</div>
        </div>

        {/* Players List */}
        <div className="space-y-4">
          {/* Current Player */}
          <div className="bg-gray-700/50 p-4 rounded-xl">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-xl">🎮</span>
              </div>
              <div className="ml-4">
                <div className="text-sm text-gray-400">Player 1</div>
                <div className="text-lg font-semibold text-indigo-400">
                  {player.name}
                </div>
              </div>
              <div className="ml-auto">
                <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
                  Ready
                </span>
              </div>
            </div>
          </div>

          {/* Opponent (if joined) or Waiting */}
          <div className="bg-gray-700/50 p-4 rounded-xl">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-xl">
                  {players.length > 1 ? "🎮" : "⌛"}
                </span>
              </div>
              <div className="ml-4">
                <div className="text-sm text-gray-400">Player 2</div>
                <div className="text-lg font-semibold text-gray-400">
                  {players.length > 1
                    ? players.find((p) => p.id !== socket.id)?.name
                    : "Waiting for opponent..."}
                </div>
              </div>
              <div className="ml-auto">
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    players.length > 1
                      ? "bg-green-500/20 text-green-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {players.length > 1 ? "Ready" : "Waiting"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Animation */}
      {players.length < 2 && (
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mb-2"></div>
          <p className="text-gray-400 text-sm">
            Game will start automatically when opponent joins...
          </p>
        </div>
      )}
    </div>
  );
};

export default Lobby;
