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
  // roundResult now stores winnerId (string) OR null; resultType stores 'tie'|'win'|'lose' explicitly from server
  const [roundResult, setRoundResult] = useState(null);
  const [resultType, setResultType] = useState(null);
  const [moves, setMoves] = useState({});
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [hasPicked, setHasPicked] = useState(false);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [opponentRematchRequested, setOpponentRematchRequested] =
    useState(null);
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = React.useRef(null);
  const rematchTimeoutRef = React.useRef(null);
  const REMATCH_TIMEOUT_MS = 15000; // 15 seconds
  const TOAST_TIMEOUT_MS = 10000; // 10 seconds

  useEffect(() => {
    socket.on("both-players-joined", ({ players: ps, scores: sc }) => {
      setPlayers(ps);
      setScores(sc);
    });

    socket.on("round-result", ({ moves, winnerId, scores }) => {
      setMoves(moves);
      setScores(scores);
      setRoundResult(winnerId);
      // Derive result type from winnerId - if null it's a tie, if it matches socket.id player won, otherwise lost
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
      // clear any pending timeout
      if (rematchTimeoutRef.current) {
        clearTimeout(rematchTimeoutRef.current);
        rematchTimeoutRef.current = null;
      }
      // also clear any toast timer and hide toast
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
      setToast(null);
    });

    socket.on("rematch-requested", ({ requesterId, name }) => {
      // If the requester is the current player, show waiting state; otherwise
      // show that opponent requested and allow accept.
      if (requesterId === socket.id) {
        setRematchRequested(true);
        // start local timeout to auto-cancel
        if (rematchTimeoutRef.current) clearTimeout(rematchTimeoutRef.current);
        rematchTimeoutRef.current = setTimeout(() => {
          socket.emit("rematch-cancel");
          setRematchRequested(false);
          setToast("Rematch request timed out");
          rematchTimeoutRef.current = null;
        }, REMATCH_TIMEOUT_MS);
      } else {
        setOpponentRematchRequested({ id: requesterId, name });
        setToast(`${getPlayerLabel(requesterId)} (${name}) wants a rematch`);
        // start a timeout so the opponent's request expires if not accepted
        if (rematchTimeoutRef.current) clearTimeout(rematchTimeoutRef.current);
        rematchTimeoutRef.current = setTimeout(() => {
          // notify server to remove their request if it still exists
          socket.emit("rematch-cancel");
          setOpponentRematchRequested(null);
          setToast("Opponent's rematch request timed out");
          rematchTimeoutRef.current = null;
        }, REMATCH_TIMEOUT_MS);
      }
    });

    socket.on("rematch-cancelled", ({ requesterId, name }) => {
      // Clean up UI when someone cancels their request
      if (requesterId === socket.id) {
        setRematchRequested(false);
      } else {
        setOpponentRematchRequested(null);
      }
      setToast(`${name} cancelled their rematch request`);
      if (rematchTimeoutRef.current) {
        clearTimeout(rematchTimeoutRef.current);
        rematchTimeoutRef.current = null;
      }
    });

    // socket listeners set up above; toast auto-hide handled in a separate effect

    const handleChat = (msg) => {
      setChat((prev) => [...prev, msg]);
    };

    socket.on("chat-message", handleChat);

    socket.on("opponent-left", ({ name, message }) => {
      setToast(`👋 ${message}`);
      // Remove the opponent from players list
      setPlayers((prevPlayers) => prevPlayers.filter((p) => p.name !== name));
    });

    socket.on("match-end", ({ winnerId, scores }) => {
      const winner = players.find((p) => p.id === winnerId);
      const isLocalPlayerWinner = winnerId === socket.id;
      setToast(
        `🏆 ${
          isLocalPlayerWinner ? "You" : winner?.name || "Opponent"
        } won the match!`
      );
      // Reset game state
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

    setChat([]);

    return () => {
      socket.off("chat-message", handleChat);
      socket.off("both-players-joined");
      socket.off("round-result");
      socket.off("rematch-start");
      socket.off("opponent-left");
      socket.off("match-end");
      socket.off("error");
      // clear toast and rematch timers on unmount
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
      if (rematchTimeoutRef.current) {
        clearTimeout(rematchTimeoutRef.current);
        rematchTimeoutRef.current = null;
      }
    };
  }, [navigate]);

  // handle auto-hide for toast separately so socket listeners effect stays stable
  useEffect(() => {
    if (toast) {
      setRoundResult(null);
      setResultType(null);
      toastTimeoutRef.current = setTimeout(() => {
        setToast(null);
        toastTimeoutRef.current = null;
      }, TOAST_TIMEOUT_MS);
    }
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
    };
  }, [toast]);

  const sendMove = (choice) => {
    // prevent choosing when waiting for round result to be displayed
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
    // Accepting is just emitting rematch as well
    socket.emit("rematch");
    setRematchRequested(true);
    setOpponentRematchRequested(null);
    if (rematchTimeoutRef.current) {
      clearTimeout(rematchTimeoutRef.current);
      rematchTimeoutRef.current = null;
    }
    // clear any toast when rematch is accepted
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
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
    // players array order: index 0 -> Player 1, index 1 -> Player 2
    return idx === 0 ? "Player 1" : idx === 1 ? "Player 2" : "Player";
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col md:flex-row">
      {/* Game Panel */}
      <div className="flex-1 flex flex-col items-center p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-black relative">
        {/* Exit Button */}
        <button
          onClick={exitRoom}
          className="absolute top-4 left-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-lg flex items-center gap-2"
          title="Exit Room"
        >
          <span>✖</span>
          <span>Exit Game</span>
        </button>

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
        {(resultType !== null || Object.keys(moves).length > 0) && (
          <div className="mt-6 text-center bg-gray-800 p-6 rounded-xl shadow-md w-full max-w-md">
            <h3
              className={`text-2xl font-bold mb-3 ${
                resultType === "tie" ? "text-yellow-400" : "text-green-400"
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
            <p className="text-gray-300 mb-1">
              Your Move: <strong>{moves[socket.id]}</strong>
            </p>
            <p className="text-gray-300 mb-4">
              Opponent Move:{" "}
              <strong>
                {Object.entries(moves).find(([id]) => id !== socket.id)?.[1]}
              </strong>
            </p>
            <div className="flex flex-col items-center gap-2">
              {opponentRematchRequested ? (
                <div className="text-sm text-gray-300 mb-2">
                  {getPlayerLabel(opponentRematchRequested.id)} (
                  {getPlayerName(opponentRematchRequested.id)}) wants a rematch.
                </div>
              ) : null}

              <button
                onClick={rematch}
                disabled={rematchRequested}
                className={`px-8 py-2 rounded-full text-white font-semibold text-lg transition hover:scale-105 shadow ${
                  rematchRequested
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {rematchRequested ? "Waiting for opponent..." : "🔁 Rematch"}
              </button>

              {!rematchRequested && opponentRematchRequested ? (
                <button
                  onClick={acceptRematch}
                  className="px-6 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm mt-2"
                >
                  Accept Rematch
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Chat Panel */}
      <div className="w-full md:w-1/3 border-l border-gray-700 p-4 flex flex-col bg-gray-800">
        <h3 className="text-xl mb-3 font-semibold text-center border-b border-gray-600 pb-2">
          💬 Chat
        </h3>

        {/* Toast */}
        {toast ? (
          <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2 rounded shadow-lg z-50">
            <div className="text-sm">{toast}</div>
            <div className="text-xs text-gray-400 mt-1">
              (This will disappear or update automatically)
            </div>
          </div>
        ) : null}

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
                  msg.type === "system"
                    ? "bg-yellow-600/50 text-white mx-auto"
                    : msg.sender === player.name
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-gray-700 text-white rounded-bl-none"
                }`}
              >
                {msg.type === "system" ? (
                  <span className="block text-xs italic text-white/90">
                    {msg.text}
                  </span>
                ) : (
                  <span className="block text-xs font-semibold mb-1 text-white/70">
                    {msg.sender} : {msg.text}
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
