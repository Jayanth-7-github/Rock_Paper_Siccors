import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';

const Home = () => {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="bg-gray-800 border border-gray-700 shadow-2xl rounded-2xl p-8 w-full max-w-md text-center">
        <h1 className="text-4xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
          Rock Paper Scissors
        </h1>

        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mb-4 px-4 py-3 rounded-lg bg-gray-100 text-black placeholder-gray-600 shadow focus:outline-none focus:ring-2 focus:ring-green-400"
        />

        <div className="flex items-center space-x-2 mb-4">
          <input
            type="text"
            placeholder="Room Code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            className="flex-1 px-4 py-3 rounded-lg bg-gray-100 text-black placeholder-gray-600 shadow focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={joinRoom}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition"
          >
            Join
          </button>
        </div>

        <div className="relative my-4">
          <hr className="border-gray-600" />
          <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gray-800 px-3 text-sm text-gray-400">or</span>
        </div>

        <button
          onClick={createRoom}
          className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow transition"
        >
          Create New Room
        </button>
      </div>
    </div>
  );
};

export default Home;
