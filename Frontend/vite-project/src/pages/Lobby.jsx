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
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-purple-700 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Spinning background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full animate-[spin_8s_linear_infinite]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-pink-500/10 rounded-full animate-[spin_6s_linear_infinite_reverse]"></div>
      </div>

      <div className="bg-purple-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-purple-600/30 relative">
        {/* Spinning border effect */}
        <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-purple-400/30 to-pink-400/30 animate-[spin_4s_linear_infinite]"></div>

        <div className="relative z-10">
          <h2 className="text-4xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-pink-200">
            Room: {roomId}
          </h2>

          <div className="relative">
            {players.length < 2 && (
              <div className="mb-6 text-center">
                {/* Triple spinning loader */}
                <div className="relative inline-block w-16 h-16 mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-purple-200/20 border-t-purple-200 animate-[spin_1s_linear_infinite]"></div>
                  <div className="absolute inset-2 rounded-full border-4 border-pink-200/20 border-t-pink-200 animate-[spin_1.5s_linear_infinite_reverse]"></div>
                  <div className="absolute inset-4 rounded-full border-4 border-purple-100/20 border-t-purple-100 animate-[spin_2s_linear_infinite]"></div>
                </div>
                <p className="text-lg text-purple-200">
                  Waiting for opponent...
                </p>
              </div>
            )}

            <div className="space-y-4">
              {players.map((p, index) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 bg-purple-700/40 p-4 rounded-lg border border-purple-500/30 transition-all hover:bg-purple-600/40 relative group"
                >
                  {/* Spinning indicator */}
                  <div className="relative h-6 w-6">
                    <div className="absolute inset-0 rounded-full border-2 border-green-400/30 border-t-green-400 animate-[spin_2s_linear_infinite]"></div>
                    <div className="absolute inset-1.5 rounded-full bg-green-400"></div>
                  </div>
                  <span className="text-xl font-medium text-purple-100">
                    {p.name}
                  </span>

                  {/* Player join animation */}
                  <div className="absolute inset-0 border-2 border-purple-400/0 group-hover:border-purple-400/30 rounded-lg animate-[spin_3s_linear_infinite] transition-colors"></div>
                </div>
              ))}
            </div>
          </div>

          {players.length === 2 && (
            <div className="mt-6 text-center">
              <div className="inline-block">
                <p className="text-purple-200 relative">
                  Game starting in a moment...
                  <span className="absolute inset-0 border-2 border-purple-300/20 border-t-purple-300 rounded-full animate-[spin_1s_linear_infinite]"></span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lobby;
