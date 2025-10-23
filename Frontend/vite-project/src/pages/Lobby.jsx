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
  const [readyState, setReadyState] = useState({});
  const [isReady, setIsReady] = useState(false);

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
    });

    socket.on("player-ready", ({ playerId, ready }) => {
      setReadyState((prev) => ({ ...prev, [playerId]: ready }));
    });

    socket.on("game-start", () => {
      navigate(`/game/${roomId}`);
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
    <div className="min-h-screen bg-[#0a192f] text-white flex flex-col items-center justify-center p-6">
      {/* Room Info Card */}
      <div className="bg-[#0f2347] p-8 rounded-2xl shadow-2xl max-w-md w-full mb-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-medium text-[#8892b0] mb-2">
            ROOM CODE
          </h2>
          <div className="text-4xl font-bold text-[#8b9eff]">#{roomId}</div>
        </div>

        {/* Players List */}
        <div className="space-y-4">
          {/* Current Player */}
          <div className="bg-[#1a2b47] p-4 rounded-xl">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-[#4338ca] rounded-full flex items-center justify-center">
                <span className="text-xl">🎮</span>
              </div>
              <div className="ml-4">
                <div className="text-sm text-[#8892b0]">Player 1</div>
                <div className="text-lg font-semibold text-[#8b9eff]">
                  {player.name}
                </div>
              </div>
              <div className="ml-auto">
                {isReady ? (
                  <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
                    Ready
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      setIsReady(true);
                      socket.emit("player-ready", true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-full text-sm"
                  >
                    Ready?
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Opponent (if joined) or Waiting */}
          <div className="bg-[#1a2b47] p-4 rounded-xl">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-[#374151] rounded-full flex items-center justify-center">
                <span className="text-xl">
                  {players.length > 1 ? "🎮" : "⌛"}
                </span>
              </div>
              <div className="ml-4">
                <div className="text-sm text-[#8892b0]">Player 2</div>
                <div className="text-lg font-semibold text-[#8892b0]">
                  {players.filter((p) => p.id !== player.id).length > 0
                    ? players.find((p) => p.id !== player.id)?.name
                    : "Waiting for opponent..."}
                </div>
              </div>
              <div className="ml-auto">
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    players.filter((p) => p.id !== player.id).length > 0
                      ? "bg-green-500/10 text-green-400"
                      : "bg-yellow-500/10 text-yellow-400"
                  }`}
                >
                  {players.filter((p) => p.id !== player.id).length > 0
                    ? "Ready"
                    : "Waiting"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ready State and Game Start */}
      {players.length === 2 &&
      Object.keys(readyState).length === 2 &&
      Object.values(readyState).every((ready) => ready) ? (
        <button
          onClick={() => socket.emit("start-game")}
          className="mt-6 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl text-lg font-semibold shadow-lg transition-all hover:scale-105"
        >
          Start Game
        </button>
      ) : (
        <div className="text-center mt-6">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#8b9eff] mb-2"></div>
          <p className="text-[#8892b0] text-sm">
            {players.length < 2
              ? "Waiting for opponent to join..."
              : "Waiting for all players to be ready..."}
          </p>
        </div>
      )}
    </div>
  );
};

export default Lobby;
