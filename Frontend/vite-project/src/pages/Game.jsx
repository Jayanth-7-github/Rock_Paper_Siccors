import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import socket from "../socket";
import { usePlayer } from "../context/PlayerContext";
import AnimatedBackground from "../components/AnimatedBackground";

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
  // Use context-backed chat so messages persist between Lobby and Game
  const { chat, setChat } = usePlayer();
  const [opponentLeft, setOpponentLeft] = useState(false);
  const playersRef = React.useRef([]);
  const opponentLeftRef = React.useRef(false);
  const [message, setMessage] = useState("");
  const [hasPicked, setHasPicked] = useState(false);
  const [rematchState, setRematchState] = useState("idle"); // idle, requested, waiting, disabled
  const [rematchRequesterId, setRematchRequesterId] = useState(null);

  useEffect(() => {
    // Reset game state when component mounts
    setOpponentLeft(false);
    setHasPicked(false);
    setRoundResult(null);

    // Handlers
    const handleBothPlayersJoined = ({ players: ps, scores: sc }) => {
      console.log("Both players joined:", ps);
      const validPlayers = ps || [];
      console.log("Setting players state:", validPlayers);
      setPlayers(validPlayers);
      setScores(sc || []);
      setOpponentLeft(false);

      const opponent = validPlayers.find((p) => p.id !== socket.id);
      if (opponent) {
        console.log("Found opponent:", opponent);
        setChat((prev) => [
          ...(prev || []),
          {
            sender: "System",
            text: `👋 ${opponent.name} joined the game!`,
            type: "system",
          },
        ]);
      } else {
        console.log("No opponent found in player list:", validPlayers);
      }
    };

    const handleUpdatePlayers = ({ players: updated }) => {
      console.log("Players updated event received:", updated);
      const updatedPlayers = updated || [];
      console.log("Current players before update:", players);
      console.log("New player count:", updatedPlayers.length);

      if (updatedPlayers.length >= 2) {
        setOpponentLeft(false);
      } else {
        setOpponentLeft(true);
      }

      setPlayers(updatedPlayers);
      console.log(
        "Players state updated. Opponent left:",
        updatedPlayers.length < 2
      );
    };

    const handleRoundResult = ({ moves, winnerId, scores }) => {
      setMoves(moves || {});
      setScores(scores || []);
      setRoundResult(winnerId);
      setHasPicked(false);

      const resultMessage =
        winnerId === socket.id
          ? "🎉 You won the round!"
          : winnerId === "draw"
          ? "🤝 It's a draw!"
          : "😔 You lost the round!";
      setChat((prev) => [
        ...(prev || []),
        { sender: "System", text: resultMessage, type: "system" },
      ]);
    };

    const handleRematchRequested = ({ requesterId, requesterName }) => {
      setRematchRequesterId(requesterId);
      if (requesterId === socket.id) {
        setRematchState("waiting");
        setChat((prev) => [
          ...(prev || []),
          {
            sender: "System",
            text: `🔄 You requested a rematch`,
            type: "system",
          },
        ]);
      } else {
        setRematchState("requested");
        setChat((prev) => [
          ...(prev || []),
          {
            sender: "System",
            text: `🔄 ${requesterName} requested a rematch`,
            type: "system",
          },
        ]);
      }
    };

    const handleRematchDeclined = ({ declinerId, declinerName }) => {
      setRematchState("disabled");
      setRematchRequesterId(null);
      setChat((prev) => [
        ...(prev || []),
        {
          sender: "System",
          text: `❌ ${declinerName} declined the rematch`,
          type: "system",
        },
      ]);
      setTimeout(() => setRematchState("idle"), 10000);
    };

    const handleRematchStart = () => {
      setRoundResult(null);
      setMoves({});
      setHasPicked(false);
      setRematchState("idle");
      setRematchRequesterId(null);
      setChat([
        { sender: "System", text: "🎮 Starting new game!", type: "system" },
      ]);
    };

    const handleChat = (msg) => {
      if (opponentLeftRef.current) return;
      setChat((prev) => {
        const newChat = [...(prev || []), msg];
        setTimeout(() => {
          if (chatContainerRef.current)
            chatContainerRef.current.scrollTop =
              chatContainerRef.current.scrollHeight;
        }, 100);
        return newChat;
      });
    };

    const handleOpponentLeft = () => {
      console.log("Opponent left event received");
      const currentPlayers = playersRef.current;
      console.log("Current players when opponent left:", currentPlayers);

      const msg =
        "You can't play alone. Minimum two players are required to continue.";
      setChat((prev) => [
        ...(prev || []),
        { sender: "System", text: msg, type: "system" },
      ]);

      // Only set opponent left if we actually had an opponent
      if (currentPlayers.length >= 2) {
        console.log("Setting opponent left to true");
        setOpponentLeft(true);
        setPlayers((prev) => prev.filter((p) => p.id === socket.id));
      }
    };

    const handleGameStarted = () => {
      setChat([
        { sender: "System", text: "👋 Welcome to the game!", type: "system" },
      ]);
    };

    // Register handlers once
    socket.on("both-players-joined", handleBothPlayersJoined);
    socket.on("update-players", handleUpdatePlayers);
    socket.on("round-result", handleRoundResult);
    socket.on("rematch-requested", handleRematchRequested);
    socket.on("rematch-declined", handleRematchDeclined);
    socket.on("rematch-start", handleRematchStart);
    socket.on("chat-message", handleChat);
    socket.on("opponent-left", handleOpponentLeft);
    socket.on("game-started", handleGameStarted);

    return () => {
      socket.off("both-players-joined", handleBothPlayersJoined);
      socket.off("update-players", handleUpdatePlayers);
      socket.off("round-result", handleRoundResult);
      socket.off("rematch-requested", handleRematchRequested);
      socket.off("rematch-declined", handleRematchDeclined);
      socket.off("rematch-start", handleRematchStart);
      socket.off("chat-message", handleChat);
      socket.off("opponent-left", handleOpponentLeft);
      socket.off("game-started", handleGameStarted);
    };
  }, [navigate]);

  // keep refs up-to-date
  // Component mount effect
  useEffect(() => {
    // Join room when component mounts
    socket.emit("join-room", { roomId, name: player.name });
    console.log("Emitted join-room event:", { roomId, name: player.name });

    return () => {
      // Leave room when component unmounts
      socket.emit("leave-room", { roomId });
      console.log("Emitted leave-room event:", { roomId });
    };
  }, [roomId, player.name]);

  // Keep refs up-to-date
  useEffect(() => {
    console.log("Updating players ref:", players);
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    console.log("Updating opponent left ref:", opponentLeft);
    opponentLeftRef.current = opponentLeft;
  }, [opponentLeft]);

  const sendMove = (choice) => {
    console.log("Attempting move:", {
      players: players.length,
      hasPicked,
      roundResult,
      opponentLeft,
    });
    if (
      !hasPicked &&
      roundResult === null &&
      players.length >= 2 &&
      !opponentLeft
    ) {
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
    // Only allow sending when both players are present and opponent hasn't left
    if (players.length < 2 || opponentLeft) return;
    if (message.trim()) {
      socket.emit("chat-message", message);
      setMessage("");
    }
  };

  const getPlayerName = (id) =>
    players.find((p) => p.id === id)?.name || "Unknown";

  useEffect(() => {
    console.log("Game state updated:", {
      playersCount: players.length,
      playersList: players.map((p) => ({ id: p.id, name: p.name })),
      selfId: socket.id,
      opponentLeft,
      hasPicked,
      roundResult,
      buttonsEnabled:
        !opponentLeft &&
        players.length >= 2 &&
        !hasPicked &&
        roundResult === null,
    });
  }, [players, opponentLeft, hasPicked, roundResult]);

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col md:flex-row relative">
      <AnimatedBackground />
      {/* Game Panel */}
      <div className="flex-1 flex flex-col items-center p-6 bg-transparent relative z-10">
        {/* Exit Button */}
        <button
          onClick={() => {
            if (window.confirm("Are you sure you want to leave the game?")) {
              navigate("/");
            }
          }}
          className="absolute top-4 left-4 px-6 py-3 bg-gradient-to-r from-purple-900/80 to-indigo-900/80 text-white rounded-xl 
          shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] border border-purple-500/30
          backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:from-purple-800/80 hover:to-indigo-800/80
          animate-pulse-slow flex items-center gap-3 group"
        >
          <span className="text-xl transform group-hover:rotate-12 transition-transform duration-300">
            ⭐
          </span>
          <span className="font-semibold tracking-wide">Exit Game</span>
        </button>
        {opponentLeft && (
          <div className="absolute top-4 right-4 p-3 rounded-lg bg-yellow-600/20 border border-yellow-600 text-yellow-200 flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div className="text-sm">
              <div className="font-semibold">You can’t play alone</div>
              <div className="text-xs text-yellow-200/80">
                Minimum two players are required to continue.
              </div>
            </div>
            <div className="ml-3 flex items-center gap-2">
              <button
                onClick={() => setOpponentLeft(false)}
                className="px-2 py-1 rounded-md bg-yellow-600/80 hover:bg-yellow-600 text-black"
              >
                Dismiss
              </button>
              <button
                onClick={() => navigate("/")}
                className="px-2 py-1 rounded-md bg-red-600/80 hover:bg-red-600 text-white"
              >
                Return Home
              </button>
            </div>
          </div>
        )}
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

        {/* Scoreboard */}
        <div className="w-full max-w-md flex justify-between mb-6 bg-gray-800 p-4 rounded-xl shadow-lg">
          {players.map((p) => {
            // scores is an array of [id, score] entries from the server
            const entry = Array.isArray(scores)
              ? scores.find((s) => Array.isArray(s) && s[0] === p.id)
              : null;
            const score = entry ? entry[1] : 0;
            const isSelf = p.id === socket.id;
            return (
              <div
                key={p.id}
                className={`flex-1 text-center ${
                  isSelf ? "text-blue-400" : "text-pink-400"
                }`}
              >
                <div className="text-2xl">
                  {isSelf ? "🧍 You" : "🧑 Opponent"}
                </div>
                <div className="text-lg font-bold mt-1">
                  {p.name || (isSelf ? "You" : "Opponent")}
                </div>
                <div className="text-sm mt-1 text-gray-300">Score: {score}</div>
              </div>
            );
          })}
        </div>

        {/* Choice Buttons */}
        <div className="flex space-x-6 my-4">
          {choices.map((choice) => (
            <button
              key={choice}
              onClick={() => sendMove(choice)}
              disabled={
                hasPicked ||
                roundResult !== null ||
                players.length < 2 ||
                opponentLeft
              }
              className={`px-6 py-3 rounded-full capitalize text-lg font-semibold transition-all duration-300 ${
                hasPicked ||
                roundResult !== null ||
                players.length < 2 ||
                opponentLeft
                  ? "bg-gray-600/80 cursor-not-allowed backdrop-blur-sm"
                  : "bg-indigo-600/90 hover:bg-indigo-700 shadow-lg hover:scale-105 hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] backdrop-blur-sm"
              }`}
            >
              {choice === "rock" && "🪨"}
              {choice === "paper" && "📄"}
              {choice === "scissors" && "✂️"}
              <span className="ml-2">{choice}</span>
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
      <div className="w-full md:w-1/3 border-l border-gray-700/50 p-4 flex flex-col bg-gray-800/40 backdrop-blur-sm h-screen md:h-auto z-10">
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

        <div className="flex flex-col gap-2 mt-3 w-full">
          {players.length < 2 && (
            <div className="text-sm text-gray-400 text-center">
              Chat will be enabled once both players join.
            </div>
          )}
          <div className="flex">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChat();
                }
              }}
              placeholder={
                players.length < 2
                  ? "Chat enabled when both players join"
                  : "Type message..."
              }
              disabled={players.length < 2}
              className={`flex-1 px-3 py-2 rounded-l text-black focus:outline-none ${
                players.length < 2 ? "bg-gray-400/40 cursor-not-allowed" : ""
              }`}
            />
            <button
              onClick={sendChat}
              disabled={players.length < 2}
              className={`px-5 py-2 rounded-r ${
                players.length < 2
                  ? "bg-gray-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
