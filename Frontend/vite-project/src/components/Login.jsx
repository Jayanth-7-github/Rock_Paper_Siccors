import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

const Login = () => {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    if (!name.trim()) return;
    const newRoom = uuidv4().slice(0, 6); // 6-character room code
    navigate(`/lobby/${newRoom}`, { state: { name } });
  };

  const handleJoinRoom = () => {
    if (!name.trim() || !roomCode.trim()) return;
    navigate(`/lobby/${roomCode}`, { state: { name } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
      <div className="bg-white bg-opacity-10 backdrop-blur-md p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-3xl font-bold text-center mb-6">🎮 Rock Paper Scissors</h1>
        <input
          type="text"
          placeholder="Enter your name"
          className="w-full p-3 rounded mb-4 bg-white bg-opacity-80 text-black focus:outline-none"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            onClick={handleCreateRoom}
            className="bg-green-500 hover:bg-green-600 w-full py-2 rounded font-semibold"
          >
            ➕ Create Room
          </button>
        </div>

        <div className="my-4 border-t border-white/30" />

        <input
          type="text"
          placeholder="Enter room code"
          className="w-full p-3 rounded mb-3 bg-white bg-opacity-80 text-black focus:outline-none"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
        />
        <button
          onClick={handleJoinRoom}
          className="bg-blue-500 hover:bg-blue-600 w-full py-2 rounded font-semibold"
        >
          🔗 Join Room
        </button>
      </div>
    </div>
  );
};

export default Login;
