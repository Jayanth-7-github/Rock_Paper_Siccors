// src/pages/Game.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket';
import { usePlayer } from '../context/PlayerContext';

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

  useEffect(() => {
    const handlePlayersJoined = ({ players: ps, scores: sc }) => {
      setPlayers(ps);
      setScores(sc);
    };

    const handleRoundResult = ({ moves, winnerId, scores }) => {
      setMoves(moves);
      setScores(scores);
      setRoundResult(winnerId);
    };

    const handleRematchStart = () => {
      setRoundResult(null);
      setMoves({});
    };

    const handleChatMessage = (msg) => {
      setChat((prev) => [...prev, msg]);
    };

    const handleOpponentLeft = () => {
      alert("Opponent left the game.");
      navigate("/");
    };

    // Register handlers
    socket.on("both-players-joined", handlePlayersJoined);
    socket.on("round-result", handleRoundResult);
    socket.on("rematch-start", handleRematchStart);
    socket.on("chat-message", handleChatMessage);
    socket.on("opponent-left", handleOpponentLeft);

    // Reset chat when game starts
    setChat([]);

    return () => {
      socket.off("both-players-joined", handlePlayersJoined);
      socket.off("round-result", handleRoundResult);
      socket.off("rematch-start", handleRematchStart);
      socket.off("chat-message", handleChatMessage);
      socket.off("opponent-left", handleOpponentLeft);
    };
  }, [navigate]);

  const sendMove = (choice) => {
    if (roundResult === null) {
      socket.emit("player-move", choice);
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

  const getPlayerName = (id) => players.find(p => p.id === id)?.name || "Unknown";

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col md:flex-row">
      {/* Game Panel */}
      <div className="flex-1 flex flex-col items-center p-6">
        <h2 className="text-3xl mb-4">Room: {roomId}</h2>

        <div className="mb-4 text-xl">
          {players.map((p) => (
            <div key={p.id}>
              {p.id === socket.id ? "🧍 You" : "🧑 Opponent"}: <strong>{p.name}</strong> ({scores.find(s => s[0] === p.id)?.[1] ?? 0})
            </div>
          ))}
        </div>

        <div className="flex space-x-4 my-4">
          {choices.map(choice => (
            <button
              key={choice}
              onClick={() => sendMove(choice)}
              className="px-5 py-3 bg-indigo-600 rounded hover:bg-indigo-700 capitalize text-lg"
            >
              {choice}
            </button>
          ))}
        </div>

        {roundResult !== null && (
          <div className="mt-6 text-center">
            <h3 className="text-2xl font-bold mb-2">
              {roundResult === socket.id ? "🎉 You won!" :
                roundResult === null ? "🤝 Draw!" :
                "😞 You lost!"}
            </h3>
            <div className="mb-4">
              <p>Your Move: {moves[socket.id]}</p>
              <p>Opponent Move: {Object.entries(moves).find(([id]) => id !== socket.id)?.[1]}</p>
            </div>
            <button onClick={rematch} className="px-6 py-2 bg-green-600 rounded hover:bg-green-700">
              Rematch
            </button>
          </div>
        )}
      </div>

      {/* Chat Panel */}
      <div className="w-full md:w-1/3 border-l border-gray-700 p-4 flex flex-col">
        <h3 className="text-xl mb-2">Chat</h3>
        <div className="flex-1 overflow-auto space-y-2 mb-2">
          {chat.map((msg, i) => (
            <div key={i} className={msg.sender === player.name ? "text-right" : "text-left"}>
              <span className="inline-block px-3 py-1 bg-gray-700 rounded max-w-xs">
                <strong>{msg.sender}: </strong>{msg.text}
              </span>
            </div>
          ))}
        </div>
        <div className="flex">
          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type message..."
            className="flex-1 px-3 py-2 rounded-l text-black"
          />
          <button onClick={sendChat} className="bg-blue-600 px-4 rounded-r hover:bg-blue-700">
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Game;
