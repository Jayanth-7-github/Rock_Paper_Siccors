import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";

const Home = () => {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();
  const { setPlayer } = usePlayer();

  const createRoom = () => {
    if (!name.trim()) return alert("Enter your name");
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setPlayer({ name, roomId: code });
    navigate(`/lobby/${code}`);
  };

  const joinRoom = () => {
    if (!name.trim()) return alert("Enter your name");
    if (roomCode.length !== 6) return alert("Enter valid room code");
    setPlayer({ name, roomId: roomCode });
    navigate(`/lobby/${roomCode}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-purple-700 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background animations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full animate-[spin_8s_linear_infinite]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-pink-500/10 rounded-full animate-[spin_6s_linear_infinite_reverse]"></div>
      </div>

      <div className="bg-purple-800/50 backdrop-blur-sm border border-purple-600/30 shadow-2xl rounded-2xl p-8 w-full max-w-md text-center relative">
        {/* Spinning border effect */}
        <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-purple-400/30 to-pink-400/30 animate-[spin_4s_linear_infinite]"></div>

        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200">
            Rock Paper Scissors
          </h1>

          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mb-4 px-4 py-3 rounded-lg bg-purple-700/50 text-white placeholder-purple-300 border border-purple-500/30 shadow-inner focus:outline-none focus:ring-2 focus:ring-purple-400"
          />

          <div className="flex items-center space-x-2 mb-4">
            <input
              type="text"
              placeholder="Room Code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg bg-purple-700/50 text-white placeholder-purple-300 border border-purple-500/30 shadow-inner focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <button
              onClick={joinRoom}
              className="relative px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow transition group overflow-hidden"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-400/30 to-pink-400/30 animate-[spin_4s_linear_infinite] opacity-0 group-hover:opacity-100"></div>
              <span className="relative z-10">Join</span>
            </button>
          </div>

          <div className="relative my-4">
            <hr className="border-purple-600/30" />
            <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-800 px-3 text-sm text-purple-300">
              or
            </span>
          </div>

          <button
            onClick={createRoom}
            className="relative w-full px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg shadow transition group overflow-hidden"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-400/30 to-pink-400/30 animate-[spin_4s_linear_infinite] opacity-0 group-hover:opacity-100"></div>
            <span className="relative z-10">Create New Room</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
