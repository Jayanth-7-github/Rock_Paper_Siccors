import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import socket from "../socket";
import { usePlayer } from "../context/PlayerContext";

const choices = ["rock", "paper", "scissors"];

const Game = () => {
  const { player } = usePlayer();
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState([]);
  const [roundResult, setRoundResult] = useState(null);
  const [moves, setMoves] = useState({});
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [hasPicked, setHasPicked] = useState(false);

  useEffect(() => {
    socket.on("both-players-joined", ({ players: ps, scores: sc }) => {
      setPlayers(ps);
      setScores(sc);
    });

    socket.on("round-result", ({ moves, winnerId, scores }) => {
      setMoves(moves);
      setScores(scores);
      setRoundResult(winnerId);
      setHasPicked(false);
    });

    socket.on("rematch-start", () => {
      setRoundResult(null);
      setMoves({});
      setHasPicked(false);
    });

    const handleChat = (msg) => {
      setChat((prev) => [...prev, msg]);
    };

    socket.on("chat-message", handleChat);

    socket.on("opponent-left", () => {
      alert("Opponent left the game.");
      navigate("/");
    });

    setChat([]);

    return () => {
      socket.off("chat-message", handleChat);
      socket.off("both-players-joined");
      socket.off("round-result");
      socket.off("rematch-start");
      socket.off("opponent-left");
    };
  }, [navigate]);

  const sendMove = (choice) => {
    if (!hasPicked && roundResult === null) {
      socket.emit("player-move", choice);
      setHasPicked(true);
    }
  };

  const rematch = () => {
    socket.emit("rematch");
  };

  const sendChat = () => {
    if (message.trim()) {
      socket.emit("chat-message", message);
      setMessage("");
    }
  };

  const getPlayerName = (id) =>
    players.find((p) => p.id === id)?.name || "Unknown";

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col md:flex-row">
      {/* Game Panel */}
      <div className="flex-1 flex flex-col items-center p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        {/* Player Name */}
        <div className="mb-2 text-lg text-white font-medium">
          Welcome,{" "}
          <span className="text-indigo-400 font-bold">{player.name}</span>
        </div>
        {/* Room Code */}
        <div className="mb-4">
          <span className="text-sm uppercase text-gray-400">Room</span>
          <div className="text-3xl font-bold bg-gray-800 px-4 py-2 rounded-lg text-indigo-400 shadow">
            #{roomId}
          </div>
        </div>

        {/* Scoreboard
  <div className="w-full max-w-md flex justify-between mb-6 bg-gray-800 p-4 rounded-xl shadow-lg">
    {players.map((p) => (
      <div
        key={p.id}
        className={`flex-1 text-center ${
          p.id === socket.id ? "text-blue-400" : "text-pink-400"
        }`}
      >
        <div className="text-2xl">
          {p.id === socket.id ? "🧍 You" : "🧑 Opponent"}
        </div>
        <div className="text-lg font-bold mt-1">{p.name}</div>
        <div className="text-sm mt-1 text-gray-300">
          Score: {scores.find((s) => s[0] === p.id)?.[1] ?? 0}
        </div>
      </div>
    ))}
  </div> */}

        {/* Choice Buttons */}
        <div className="flex space-x-6 my-4">
          {choices.map((choice) => (
            <button
              key={choice}
              onClick={() => sendMove(choice)}
              disabled={hasPicked || roundResult !== null}
              className={`px-6 py-3 rounded-full capitalize text-lg font-semibold transition-all duration-200 ${
                hasPicked || roundResult !== null
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:scale-105"
              }`}
            >
              ✊ {choice}
            </button>
          ))}
        </div>

        {/* Result Panel */}
        {roundResult !== null && (
          <div className="mt-6 text-center bg-gray-800 p-6 rounded-xl shadow-md w-full max-w-md">
            <h3 className="text-2xl font-bold mb-3 text-green-400">
              {roundResult === socket.id
                ? "🎉 You won!"
                : roundResult === null
                ? "🤝 Draw!"
                : "😞 You lost!"}
            </h3>
            <p className="text-gray-300 mb-1">
              Your Move: <strong>{moves[socket.id]}</strong>
            </p>
            <p className="text-gray-300 mb-4">
              Opponent Move:{" "}
              <strong>
                {Object.entries(moves).find(([id]) => id !== socket.id)?.[1]}
              </strong>
            </p>
            <button
              onClick={rematch}
              className="px-8 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold text-lg transition hover:scale-105 shadow"
            >
              🔁 Rematch
            </button>
          </div>
        )}
      </div>

      {/* Chat Panel */}
      <div className="w-full md:w-1/3 border-l border-gray-700 p-4 flex flex-col bg-gray-800">
        <h3 className="text-xl mb-3 font-semibold text-center border-b border-gray-600 pb-2">
          💬 Chat
        </h3>

        <div className="flex-1 overflow-y-auto space-y-3 px-1 py-2 bg-gray-900 rounded shadow-inner">
          {chat.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.sender === player.name ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-xl text-sm shadow-md ${
                  msg.sender === player.name
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-gray-700 text-white rounded-bl-none"
                }`}
              >
                <span className="block text-xs font-semibold mb-1 text-white/70">
                  {msg.sender} : {msg.text}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex mt-3">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type message..."
            className="flex-1 px-3 py-2 rounded-l text-black focus:outline-none"
          />
          <button
            onClick={sendChat}
            className="bg-blue-600 px-5 py-2 rounded-r hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Game;
