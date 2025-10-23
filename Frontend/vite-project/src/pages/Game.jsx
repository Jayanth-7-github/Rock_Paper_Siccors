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
  const [resultType, setResultType] = useState(null);
  const [moves, setMoves] = useState({});
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [hasPicked, setHasPicked] = useState(false);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [opponentRematchRequested, setOpponentRematchRequested] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = React.useRef(null);
  const rematchTimeoutRef = React.useRef(null);
  const REMATCH_TIMEOUT_MS = 15000;
  const TOAST_TIMEOUT_MS = 10000;

  useEffect(() => {
    socket.on("both-players-joined", ({ players: ps, scores: sc }) => {
      setPlayers(ps);
      setScores(sc);
    });

    socket.on("round-result", ({ moves, winnerId, scores }) => {
      setMoves(moves);
      setScores(scores);
      setRoundResult(winnerId);
      const resultType =
        winnerId === null ? "tie" : winnerId === socket.id ? "win" : "lose";
      setResultType(resultType);
      setHasPicked(false);
    });

    socket.on("rematch-start", () => {
      setRoundResult(null);
      setResultType(null);
      setMoves({});
      setHasPicked(false);
      setRematchRequested(false);
      setOpponentRematchRequested(null);
      if (rematchTimeoutRef.current) clearTimeout(rematchTimeoutRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setToast(null);
    });

    socket.on("rematch-requested", ({ requesterId, name }) => {
      if (requesterId === socket.id) {
        setRematchRequested(true);
        if (rematchTimeoutRef.current) clearTimeout(rematchTimeoutRef.current);
        rematchTimeoutRef.current = setTimeout(() => {
          socket.emit("rematch-cancel");
          setRematchRequested(false);
          setToast("Rematch request timed out");
        }, REMATCH_TIMEOUT_MS);
      } else {
        setOpponentRematchRequested({ id: requesterId, name });
        setToast(`${getPlayerLabel(requesterId)} (${name}) wants a rematch`);
        if (rematchTimeoutRef.current) clearTimeout(rematchTimeoutRef.current);
        rematchTimeoutRef.current = setTimeout(() => {
          socket.emit("rematch-cancel");
          setOpponentRematchRequested(null);
          setToast("Opponent's rematch request timed out");
        }, REMATCH_TIMEOUT_MS);
      }
    });

    socket.on("rematch-cancelled", ({ requesterId, name }) => {
      if (requesterId === socket.id) {
        setRematchRequested(false);
      } else {
        setOpponentRematchRequested(null);
      }
      setToast(`${name} cancelled their rematch request`);
      if (rematchTimeoutRef.current) clearTimeout(rematchTimeoutRef.current);
    });

    const handleChat = (msg) => setChat((prev) => [...prev, msg]);
    socket.on("chat-message", handleChat);

    socket.on("opponent-left", ({ name, message }) => {
      setToast(`👋 ${message}`);
      setPlayers((prev) => prev.filter((p) => p.name !== name));
    });

    socket.on("match-end", ({ winnerId, scores }) => {
      const winner = players.find((p) => p.id === winnerId);
      const isLocalWinner = winnerId === socket.id;
      setToast(
        `🏆 ${isLocalWinner ? "You" : winner?.name || "Opponent"} won the match!`
      );
      setRoundResult(null);
      setMoves({});
      setHasPicked(false);
      setRematchRequested(false);
      setOpponentRematchRequested(null);
      setScores(scores);
    });

    socket.on("error", (message) => {
      setToast(`⚠️ ${message}`);
    });

    return () => {
      socket.off("chat-message", handleChat);
      socket.off("both-players-joined");
      socket.off("round-result");
      socket.off("rematch-start");
      socket.off("opponent-left");
      socket.off("match-end");
      socket.off("error");
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (rematchTimeoutRef.current) clearTimeout(rematchTimeoutRef.current);
    };
  }, [navigate, players]);

  useEffect(() => {
    if (toast) {
      setRoundResult(null);
      setResultType(null);
      toastTimeoutRef.current = setTimeout(() => {
        setToast(null);
      }, TOAST_TIMEOUT_MS);
    }
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [toast]);

  const sendMove = (choice) => {
    if (!hasPicked && resultType === null) {
      socket.emit("player-move", choice);
      setHasPicked(true);
    }
  };

  const rematch = () => {
    socket.emit("rematch");
    setRematchRequested(true);
  };

  const acceptRematch = () => {
    socket.emit("rematch");
    setRematchRequested(true);
    setOpponentRematchRequested(null);
    if (rematchTimeoutRef.current) clearTimeout(rematchTimeoutRef.current);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(null);
  };

  const sendChat = () => {
    if (message.trim()) {
      socket.emit("chat-message", message);
      setMessage("");
    }
  };

  const exitRoom = () => {
    socket.emit("leave-room");
    navigate("/");
  };

  const getPlayerName = (id) =>
    players.find((p) => p.id === id)?.name || "Unknown";

  const getPlayerLabel = (id) => {
    if (!players || players.length === 0) return "Player";
    if (id === socket.id) return "You";
    const idx = players.findIndex((p) => p.id === id);
    return idx === 0 ? "Player 1" : idx === 1 ? "Player 2" : "Player";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-purple-700 text-white flex flex-col md:flex-row relative overflow-hidden">
      {/* Background animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full animate-[spin_8s_linear_infinite]" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-pink-500/10 rounded-full animate-[spin_6s_linear_infinite_reverse]" />
      </div>

      {/* Game Panel */}
      <div className="flex-1 flex flex-col items-center p-6 bg-purple-800/30 backdrop-blur-sm relative">
        {/* Exit Button */}
        <button
          onClick={exitRoom}
          className="absolute top-4 left-4 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg flex items-center gap-2 group overflow-hidden"
          title="Exit Room"
        >
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-400/30 to-pink-400/30 animate-[spin_4s_linear_infinite] opacity-0 group-hover:opacity-100" />
          <span className="relative z-10">✖ Exit Game</span>
        </button>

        {/* Player Name */}
        <div className="mb-2 text-lg text-purple-200 font-medium">
          Welcome,{" "}
          <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-pink-200">
            {player.name}
          </span>
        </div>

        {/* Room Code */}
        <div className="mb-4">
          <span className="text-sm uppercase text-purple-300">Room</span>
          <div className="text-3xl font-bold bg-purple-800/50 px-4 py-2 rounded-lg text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200 border border-purple-500/30 shadow relative group">
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-400/30 to-pink-400/30 animate-[spin_4s_linear_infinite] opacity-0 group-hover:opacity-100 rounded-lg" />
            <span className="relative z-10">#{roomId}</span>
          </div>
        </div>

        {/* Scoreboard */}
        <div className="w-full max-w-md flex justify-between mb-6 bg-purple-800/50 backdrop-blur-sm p-4 rounded-xl border border-purple-500/30 shadow-xl relative">
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-400/10 to-pink-400/10 animate-[spin_8s_linear_infinite] rounded-xl" />
          <div className="relative z-10 w-full flex justify-between">
            {players.map((p) => (
              <div
                key={p.id}
                className={`flex-1 text-center ${
                  p.id === socket.id ? "text-purple-200" : "text-pink-200"
                }`}
              >
                <div className="text-2xl mb-1">
                  {p.id === socket.id ? "🧍 You" : "🧑 Opponent"}
                </div>
                <div className="text-lg font-bold mt-1 bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-pink-200">
                  {p.name}
                </div>
                <div className="relative mt-2 text-lg">
                  <span className="font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-pink-200">
                    {scores.find((s) => s[0] === p.id)?.[1] ?? 0}
                  </span>
                  <div className="text-sm text-purple-300 opacity-75">
                    Points
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Choice Buttons */}
        <div className="flex space-x-6 my-4">
          {choices.map((choice) => (
            <button
              key={choice}
              onClick={() => sendMove(choice)}
              disabled={hasPicked || roundResult !== null}
              className={`relative px-6 py-3 rounded-full capitalize text-lg font-semibold transition-all duration-200 overflow-hidden group ${
                hasPicked || roundResult !== null
                  ? "bg-purple-800/50 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700 shadow-lg hover:scale-105"
              }`}
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-400/30 to-pink-400/30 animate-[spin_4s_linear_infinite] opacity-0 group-hover:opacity-100" />
              <span className="relative z-10">✊ {choice}</span>
            </button>
          ))}
        </div>

        {/* Result Panel */}
        {(resultType !== null || Object.keys(moves).length > 0) && (
          <div className="mt-6 text-center bg-purple-800/50 backdrop-blur-sm p-6 rounded-xl border border-purple-500/30 shadow-xl w-full max-w-md relative group">
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-400/10 to-pink-400/10 animate-[spin_8s_linear_infinite] rounded-xl" />
            <div className="relative z-10">
              <h3
                className={`text-2xl font-bold mb-3 ${
                  resultType === "tie"
                    ? "text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-400"
                    : "text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200"
                }`}
              >
                {resultType === "tie"
                  ? "🤝 Tie!"
                  : resultType === "win"
                  ? "🎉 You won!"
                  : resultType === "lose"
                  ? "😞 You lost!"
                  : "Round finished"}
              </h3>
              <p className="text-purple-200 mb-1">
                Your Move:{" "}
                <strong className="text-pink-200">{moves[socket.id]}</strong>
              </p>
              <p className="text-purple-200 mb-4">
                Opponent Move:{" "}
                <strong className="text-pink-200">
                  {Object.entries(moves).find(([id]) => id !== socket.id)?.[1]}
                </strong>
              </p>

              <div className="flex flex-col items-center gap-2">
                {opponentRematchRequested && (
                  <div className="text-sm text-purple-200 mb-2">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-pink-200">
                      {getPlayerLabel(opponentRematchRequested.id)}
                    </span>{" "}
                    ({getPlayerName(opponentRematchRequested.id)}) wants a
                    rematch.
                  </div>
                )}

                <button
                  onClick={rematch}
                  disabled={rematchRequested}
                  className={`relative px-8 py-2 rounded-full text-white font-semibold text-lg transition hover:scale-105 shadow group overflow-hidden ${
                    rematchRequested
                      ? "bg-purple-800/50 cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-700"
                  }`}
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-400/30 to-pink-400/30 animate-[spin_4s_linear_infinite] opacity-0 group-hover:opacity-100" />
                  <span className="relative z-10">
                    {rematchRequested
                      ? "Waiting for opponent..."
                      : "🔁 Rematch"}
                  </span>
                </button>

                {!rematchRequested && opponentRematchRequested && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={acceptRematch}
                      className="relative px-6 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm group overflow-hidden"
                    >
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-400/30 to-pink-400/30 animate-[spin_4s_linear_infinite] opacity-0 group-hover:opacity-100" />
                      <span className="relative z-10">Accept</span>
                    </button>
                    <button
                      onClick={() => {
                        socket.emit("rematch-cancel");
                        setOpponentRematchRequested(null);
                        setToast("Rematch declined");
                      }}
                      className="relative px-6 py-2 rounded-full bg-pink-600 hover:bg-pink-700 text-white font-semibold text-sm group overflow-hidden"
                    >
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-400/30 to-pink-400/30 animate-[spin_4s_linear_infinite] opacity-0 group-hover:opacity-100" />
                      <span className="relative z-10">Decline</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Panel */}
      <div className="w-full md:w-1/3 border-l border-purple-500/30 p-4 flex flex-col bg-purple-800/50 backdrop-blur-sm">
        <h3 className="text-xl mb-3 font-semibold text-center border-b border-purple-500/30 pb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200">
          💬 Chat
        </h3>

        {toast && (
          <div className="fixed bottom-6 right-6 bg-purple-800/90 backdrop-blur-sm border border-purple-500/30 text-white px-4 py-2 rounded-lg shadow-lg z-50">
            <div className="text-sm text-purple-100">{toast}</div>
            <div className="text-xs text-purple-300 mt-1">
              (This will disappear automatically)
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-3 px-1 py-2 bg-purple-900/30 rounded shadow-inner">
          {chat.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.sender === player.name ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-xl text-sm shadow-md backdrop-blur-sm ${
                  msg.type === "system"
                    ? "bg-yellow-600/30 text-yellow-200 mx-auto border border-yellow-500/30"
                    : msg.sender === player.name
                    ? "bg-purple-600/50 text-purple-100 rounded-br-none border border-purple-500/30"
                    : "bg-pink-600/50 text-pink-100 rounded-bl-none border border-pink-500/30"
                }`}
              >
                {msg.type === "system" ? (
                  <span className="block text-xs italic">{msg.text}</span>
                ) : (
                  <span className="block text-xs font-semibold">
                    {msg.sender}: {msg.text}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex mt-3">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type message..."
            className="flex-1 px-3 py-2 rounded-l bg-purple-700/50 text-white placeholder-purple-300 border border-purple-500/30 border-r-0 shadow-inner focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <button
            onClick={sendChat}
            className="relative bg-purple-600 px-5 py-2 rounded-r hover:bg-purple-700 group overflow-hidden"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-400/30 to-pink-400/30 animate-[spin_4s_linear_infinite] opacity-0 group-hover:opacity-100" />
            <span className="relative z-10">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Game;
