import React, { useState, useEffect , useRef} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { usePlayer } from "../context/PlayerContext";
import AnimatedBackground from "../components/AnimatedBackground";

const Home = () => {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { setPlayer } = usePlayer();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roomFromUrl = params.get("room");
    if (roomFromUrl) setRoomCode(roomFromUrl);
  }, [location]);

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black px-4">
      <AnimatedBackground />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8 w-full max-w-md text-center"
      >
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-4xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500"
        >
          Rock Paper Scissors
        </motion.h1>

        <motion.input
          whileFocus={{ scale: 1.02 }}
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mb-4 px-4 py-3 rounded-lg bg-gray-100/90 text-gray-900 placeholder-gray-500 shadow focus:outline-none focus:ring-2 focus:ring-green-400 transition"
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center space-x-2 mb-4"
        >
          <motion.input
            whileFocus={{ scale: 1.02 }}
            type="text"
            placeholder="Room Code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            className="flex-1 px-4 py-3 rounded-lg bg-gray-100/90 text-gray-900 placeholder-gray-500 shadow focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={joinRoom}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition-all"
          >
            Join
          </motion.button>
        </motion.div>

        <div className="relative my-5">
          <hr className="border-gray-700" />
          <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gray-800 px-3 text-sm text-gray-400">
            or
          </span>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={createRoom}
          className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow transition-all"
        >
          Create New Room
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 1 }}
          className="mt-6 text-sm text-gray-400"
        >
          Invite your friends to play together 🎮
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Home;
