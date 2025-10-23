import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import socket from "../socket";
import { usePlayer } from "../context/PlayerContext";

const choices = ["rock", "paper", "scissors"];

const Game = () => {
  const { player } = usePlayer();
  const { roomId } = useParams();
  const navigate = useNavigate();
  const chatContainerRef = React.useRef(null);

  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState([]);
  const [roundResult, setRoundResult] = useState(null);
  const [moves, setMoves] = useState({});
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [hasPicked, setHasPicked] = useState(false);
  const [rematchState, setRematchState] = useState("idle"); // idle, requested, waiting, disabled
  const [rematchRequesterId, setRematchRequesterId] = useState(null);

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

    socket.on("rematch-requested", ({ requesterId, requesterName }) => {
      setRematchRequesterId(requesterId);
      if (requesterId === socket.id) {
        setRematchState("waiting");
      } else {
        setRematchState("requested");
      }
    });

    socket.on("rematch-declined", ({ declinerId, declinerName }) => {
      setRematchState("disabled");
      setRematchRequesterId(null);
      // Enable rematch button after 10 seconds
      setTimeout(() => {
        setRematchState("idle");
      }, 10000);
    });

    socket.on("rematch-start", () => {
      setRoundResult(null);
      setMoves({});
      setHasPicked(false);
      setRematchState("idle");
      setRematchRequesterId(null);
    });

    const handleChat = (msg) => {
      setChat((prev) => {
        const newChat = [...prev, msg];
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop =
              chatContainerRef.current.scrollHeight;
          }
        }, 100);
        return newChat;
      });
    };

    socket.on("chat-message", handleChat);

    socket.on("opponent-left", () => {
      setChat((prev) => [
        ...prev,
        {
          sender: "System",
          text: "⚠️ Opponent left the game.",
          type: "system",
        },
      ]);
      setTimeout(() => {
        navigate("/");
      }, 2000);
    });

    socket.on("both-players-joined", ({ players: ps, scores: sc }) => {
      setPlayers(ps);
      setScores(sc);
      // Find the opponent's name
      const opponent = ps.find((p) => p.id !== socket.id);
      if (opponent) {
        setChat((prev) => [
          ...prev,
          {
            sender: "System",
            text: `👋 ${opponent.name} joined the game!`,
            type: "system",
          },
        ]);
      }
    });

    socket.on("rematch-requested", ({ requesterId, requesterName }) => {
      setRematchRequesterId(requesterId);
      if (requesterId === socket.id) {
        setRematchState("waiting");
        setChat((prev) => [
          ...prev,
          {
            sender: "System",
            text: `🔄 You requested a rematch`,
            type: "system",
          },
        ]);
      } else {
        setRematchState("requested");
        setChat((prev) => [
          ...prev,
          {
            sender: "System",
            text: `🔄 ${requesterName} requested a rematch`,
            type: "system",
          },
        ]);
      }
    });

    socket.on("rematch-declined", ({ declinerId, declinerName }) => {
      setRematchState("disabled");
      setRematchRequesterId(null);
      setChat((prev) => [
        ...prev,
        {
          sender: "System",
          text: `❌ ${declinerName} declined the rematch`,
          type: "system",
        },
      ]);
      setTimeout(() => {
        setRematchState("idle");
      }, 10000);
    });

    socket.on("rematch-start", () => {
      setRoundResult(null);
      setMoves({});
      setHasPicked(false);
      setRematchState("idle");
      setRematchRequesterId(null);
      setChat((prev) => [
        ...prev,
        { sender: "System", text: "🎮 Starting new game!", type: "system" },
      ]);
    });

    socket.on("round-result", ({ moves, winnerId, scores }) => {
      setMoves(moves);
      setScores(scores);
      setRoundResult(winnerId);
      setHasPicked(false);

      // Add round result to chat
      const resultMessage =
        winnerId === socket.id
          ? "🎉 You won the round!"
          : winnerId === "draw"
          ? "🤝 It's a draw!"
          : "😔 You lost the round!";
      setChat((prev) => [
        ...prev,
        { sender: "System", text: resultMessage, type: "system" },
      ]);
    });

    setChat([
      { sender: "System", text: "👋 Welcome to the game!", type: "system" },
    ]);

    return () => {
      socket.off("chat-message", handleChat);
      socket.off("both-players-joined");
      socket.off("round-result");
      socket.off("rematch-start");
      socket.off("opponent-left");
      socket.off("rematch-requested");
      socket.off("rematch-declined");
    };
  }, [navigate]);

  const sendMove = (choice) => {
    if (!hasPicked && roundResult === null) {
      socket.emit("player-move", choice);
      setHasPicked(true);
    }
  };

  const handleRematch = () => {
    socket.emit("rematch-request");
  };

  const handleRematchDecline = () => {
    socket.emit("rematch-decline");
    setRematchState("disabled");
    setRematchRequesterId(null);
    // Enable rematch button after 10 seconds
    setTimeout(() => {
      setRematchState("idle");
    }, 10000);
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
      <div className="flex-1 flex flex-col items-center p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-black relative">
        {/* Exit Button */}
        <button
          onClick={() => {
            if (window.confirm("Are you sure you want to leave the game?")) {
              navigate("/");
            }
          }}
          className="absolute top-4 left-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg transition-all duration-200 hover:scale-105 flex items-center gap-2"
        >
          <span>🚪</span>
          Exit
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
        {roundResult !== null && (
          <div className="mt-6 text-center bg-gray-800 p-6 rounded-xl shadow-md w-full max-w-md">
            <h3 className="text-2xl font-bold mb-3 text-green-400">
              {roundResult === socket.id
                ? "🎉 You won!"
                : roundResult === "draw"
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
            <div className="space-y-2">
              {rematchState === "requested" &&
                rematchRequesterId !== socket.id && (
                  <div className="text-sm text-yellow-400 mb-2">
                    Opponent requested a rematch
                  </div>
                )}
              {rematchState === "waiting" && (
                <div className="text-sm text-yellow-400 mb-2">
                  Waiting for opponent's response...
                </div>
              )}
              <div className="space-x-2">
                {rematchState === "requested" &&
                rematchRequesterId !== socket.id ? (
                  <>
                    <button
                      onClick={handleRematch}
                      className="px-6 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold text-lg transition hover:scale-105 shadow"
                    >
                      ✅ Accept
                    </button>
                    <button
                      onClick={handleRematchDecline}
                      className="px-6 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-lg transition hover:scale-105 shadow"
                    >
                      ❌ Decline
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleRematch}
                    disabled={
                      rematchState === "waiting" || rematchState === "disabled"
                    }
                    className={`px-8 py-2 rounded-full font-semibold text-lg transition shadow ${
                      rematchState === "disabled"
                        ? "bg-gray-600 cursor-not-allowed"
                        : rematchState === "waiting"
                        ? "bg-yellow-600 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700 hover:scale-105"
                    }`}
                  >
                    {rematchState === "waiting" ? "Waiting..." : "🔁 Rematch"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Panel */}
      <div className="w-full md:w-1/3 border-l border-gray-700 p-4 flex flex-col bg-gray-800 h-screen md:h-auto">
        <h3 className="text-xl mb-3 font-semibold text-center border-b border-gray-600 pb-2">
          💬 Chat
        </h3>

        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto space-y-3 px-1 py-2 bg-gray-900 rounded shadow-inner max-h-[calc(100vh-15rem)] scroll-smooth"
        >
          {chat.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.sender === player.name ? "justify-end" : "justify-start"
              }`}
            >
              {msg.type === "system" ? (
                <div className="max-w-[90%] px-4 py-2 rounded-xl text-sm shadow-md bg-gray-800 text-center mx-auto border border-gray-700">
                  <span className="text-gray-300">{msg.text}</span>
                </div>
              ) : (
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
              )}
            </div>
          ))}
        </div>

        <div className="flex mt-3">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendChat();
              }
            }}
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
