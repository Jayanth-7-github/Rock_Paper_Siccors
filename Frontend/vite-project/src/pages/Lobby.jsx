// src/pages/Lobby.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import socket from "../socket";
import { usePlayer } from "../context/PlayerContext";
import AnimatedBackground from "../components/AnimatedBackground";


const WaitingDots = ({ className = "" }) => (
  <span className={`inline-flex ${className}`} aria-hidden>
    <span className="w-2 h-2 bg-white rounded-full mr-1 animate-[bounce_1s_ease-in-out_infinite]" />
    <span className="w-2 h-2 bg-white rounded-full mr-1 animate-[bounce_1s_ease-in-out_0.2s_infinite]" />
    <span className="w-2 h-2 bg-white rounded-full animate-[bounce_1s_ease-in-out_0.4s_infinite]" />
  </span>
);

const CheckMark = ({ className = "" }) => (
  <svg
    className={`${className} transform transition-all duration-500 ease-out`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path
      className="animate-[dash_0.5s_ease-in-out_forwards]"
      d="M20 6L9 17L4 12"
      strokeDasharray="30"
      strokeDashoffset="30"
    />
  </svg>
);

const Lobby = () => {
  const { player } = usePlayer();
  const { roomId } = useParams();
  const navigate = useNavigate();
  // keep chat refs/state declared above effects (moved)
  const chatContainerRef = React.useRef(null);
  const { chat, setChat } = usePlayer();
  const [message, setMessage] = useState("");
  // refs to keep latest players/opponentLeft available to socket handlers without re-registering
  const playersRef = React.useRef([]);
  const opponentLeftRef = React.useRef(false);
  const [players, setPlayers] = useState([]);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const [copySuccess, setCopySuccess] = useState({
    roomId: false,
    link: false,
  });

  const copyRoom = useCallback(
    (type) => {
      if (!roomId) return;
      const textToCopy =
        type === "roomId" ? roomId : `${window.location.origin}?room=${roomId}`;
      navigator.clipboard
        ?.writeText(textToCopy)
        .then(() => {
          setCopySuccess((prev) => ({ ...prev, [type]: true }));
          setTimeout(
            () => setCopySuccess((prev) => ({ ...prev, [type]: false })),
            2000
          );
        })
        .catch(() => {
          alert(`Unable to copy. Please copy manually: ${textToCopy}`);
        });
    },
    [roomId]
  );

  useEffect(() => {
    if (!player?.name) {
      navigate("/");
      return;
    }

    // Check if this player created the room (first to join)
    socket.emit("join-room", { roomId, name: player.name });

    socket.on("room-full", () => {
      alert("Room is full!");
      navigate("/");
    });

    // Listen for creator status
    socket.on("room-creator", () => {
      setIsCreator(true);
    });

    socket.on("both-players-joined", ({ players: joined }) => {
      // Clear any previous chat (fresh session) then announce
      console.log("both-players-joined received:", joined);
      setChat([
        {
          sender: "System",
          text: "👋 Both players joined — chat enabled.",
          type: "system",
        },
      ]);
      setPlayers(joined || []);
    });

    // Listen for game start from creator (non-creator clients should navigate when server tells them)
    const handleGameStarted = () => {
      // Clear previous lobby chat so game chat starts fresh
      setChat([]);
      setIsStarting(true);
      // navigate to game when server confirms start
      navigate(`/game/${roomId}`);
    };
    socket.on("game-started", handleGameStarted);

    socket.on("update-players", ({ players: updated }) => {
      console.log("update-players received:", updated);
      setPlayers(updated || []);
    });

    socket.on("opponent-left", () => {
      console.log("opponent-left event received");
      // Immediately notify remaining player that they can't play alone
      const msg =
        "You can’t play alone. Minimum two players are required to continue.";
      setChat((prev) => [
        ...(prev || []),
        { sender: "System", text: msg, type: "system" },
      ]);
      setOpponentLeft(true);
      // don't auto-navigate; allow the player to wait or return home manually
    });

    const handleChat = (msg) => {
      // Only accept chat messages when both players are present and opponent hasn't left
      const ps = playersRef.current || [];
      const ol = opponentLeftRef.current;
      const includesSelf = ps.some((p) => p.id === socket.id);
      const total = includesSelf ? ps.length : ps.length + 1;
      if (total < 2 || ol) return;
      setChat((prev) => {
        const newChat = [...(prev || []), msg];
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

    return () => {
      // tell server we're leaving so it can free the slot
      socket.emit("leave-room", { roomId, name: player.name });
      socket.off("room-full");
      socket.off("room-creator");
      socket.off("both-players-joined");
      socket.off("chat-message", handleChat);
      socket.off("update-players");
      socket.off("opponent-left");
      socket.off("game-started", handleGameStarted);
    };
  }, [player, roomId, navigate]);

  // keep the refs up-to-date for handlers (avoids re-registering socket listeners)
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    opponentLeftRef.current = opponentLeft;
  }, [opponentLeft]);

  // totalPlayers is the total connected players in the room. The server sometimes
  // sends `players` containing all players (both-players-joined) and sometimes
  // sends `players` excluding the current socket (update-players). Detect which
  // case we have by checking for our socket id in the list.
  const totalPlayers = React.useMemo(() => {
    const ps = players || [];
    const includesSelf = ps.some((p) => p.id === socket.id);
    return includesSelf ? ps.length : ps.length + 1;
  }, [players]);

  const sendChat = () => {
    // Only allow chat when both players are present
    if (totalPlayers < 2) return;
    if (message.trim()) {
      socket.emit("chat-message", message);
      setMessage("");
    }
  };

  // helper to append system messages
  const addSystemMessage = (text) => {
    setChat((prev) => [
      ...(prev || []),
      { sender: "System", text, type: "system" },
    ]);
  };

  return (
    <div className="min-h-screen bg-gray-800 text-white flex items-center justify-center p-6">
      <AnimatedBackground />
      <div className="w-full max-w-5xl bg-gray-900/60 backdrop-blur rounded-2xl p-8 shadow-xl border border-gray-700">
        {opponentLeft && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-600/20 border border-yellow-600 text-yellow-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <div className="font-semibold">Opponent disconnected</div>
                <div className="text-sm text-yellow-200/80">
                  You will be returned to the home screen shortly.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpponentLeft(false)}
                className="px-3 py-1 rounded-md bg-yellow-600/80 hover:bg-yellow-600 transition text-black"
              >
                Dismiss
              </button>
              <button
                onClick={() => navigate("/")}
                className="px-3 py-1 rounded-md bg-red-600/80 hover:bg-red-600 transition"
              >
                Return Home
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold mb-2">Room</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-300 flex items-center">
                  Room ID:{" "}
                  <span className="font-mono text-white ml-1">{roomId}</span>
                </p>
                <button
                  onClick={() => copyRoom("roomId")}
                  className={`px-2 py-1 text-xs rounded-md transition ${
                    copySuccess.roomId
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  {copySuccess.roomId ? "Copied!" : "Copy ID"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-300 flex items-center">
                  Join Link:{" "}
                  <span className="font-mono text-white ml-1 text-xs">{`${window.location.origin}?room=${roomId}`}</span>
                </p>
                <button
                  onClick={() => copyRoom("link")}
                  className={`px-2 py-1 text-xs rounded-md transition ${
                    copySuccess.link
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  {copySuccess.link ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => {
                socket.emit("leave-room", { roomId, name: player.name });
                navigate("/");
              }}
              className="px-3 py-1 rounded-md bg-red-600/80 hover:bg-red-600 transition"
            >
              Leave
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* totalPlayers counts you + others in `players` */}
          {/* players state contains other connected players (excluding current player) */}
          {/* so totalPlayers === players.length + 1 */}
          {/* compute totalPlayers here so UI and handlers treat "both players present" correctly */}
          {/**/}
          {/* eslint-disable-next-line no-unused-vars */}
          {null}

          <div className="flex-1 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="text-lg mb-3">Players</h3>
            <div className="space-y-3">
              {/* Show current player first */}
              <div className="flex items-center gap-3 p-3 rounded-md bg-gray-900/40 border border-gray-700 animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-xl font-semibold">
                  {player.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-300">You</div>
                  <div className="font-medium">{player.name}</div>
                </div>
                <div className="text-green-400 font-semibold">Ready</div>
              </div>

              {players.length === 0 && (
                <div className="flex items-center gap-3 p-3 rounded-md bg-gray-900/20 border border-dashed border-gray-700 text-gray-400">
                  <div className="w-10 h-10 rounded-full bg-gray-800/40 flex items-center justify-center">
                    🤝
                  </div>
                  <div className="flex-1">
                    Waiting for opponent <WaitingDots className="ml-2" />
                  </div>
                </div>
              )}

              {players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-3 rounded-md bg-gradient-to-r from-gray-900/40 to-gray-900/20 border border-gray-700 transform transition hover:scale-[1.01] animate-slide-up"
                >
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-xl font-semibold">
                    {p.name?.charAt(0)?.toUpperCase() || "P"}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-300">Player</div>
                    <div className="font-medium">{p.name}</div>
                  </div>
                  <div className="text-yellow-300">Connected</div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-80 p-4 bg-gray-800 rounded-lg border border-gray-700 flex flex-col items-center justify-center">
            <h3 className="text-lg mb-2">Match Status</h3>
            <div className="text-sm text-gray-300 mb-3">
              {opponentLeft
                ? "You can’t play alone. Minimum two players are required to continue."
                : isStarting
                ? "Game starting..."
                : totalPlayers === 2
                ? isCreator
                  ? "Players ready - Start when you're ready!"
                  : "Players ready - Waiting for host to start..."
                : "Waiting for opponent to join"}
            </div>
            <div className="flex flex-col items-center gap-4">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isStarting
                    ? "bg-gradient-to-br from-yellow-400/20 to-yellow-400/10 scale-110"
                    : totalPlayers < 2
                    ? "bg-gradient-to-br from-blue-400/20 to-blue-400/10 animate-pulse"
                    : "bg-gradient-to-br from-green-400/20 to-green-400/10 scale-110"
                }`}
              >
                {isStarting ? (
                  <div className="animate-spin text-yellow-400">
                    <WaitingDots className="transform scale-150" />
                  </div>
                ) : totalPlayers < 2 ? (
                  <div className="animate-spin">
                    <WaitingDots className="transform scale-150" />
                  </div>
                ) : (
                  <CheckMark className="w-12 h-12 text-green-400 animate-[bounce_1s_ease-in-out_1]" />
                )}
              </div>

              {totalPlayers === 2 && isCreator && !isStarting && (
                <button
                  onClick={() => {
                    // Clear lobby chat for fresh game chat
                    setChat([]);
                    setIsStarting(true);
                    // Creator navigates immediately
                    navigate(`/game/${roomId}`);
                    socket.emit("start-game", { roomId });
                  }}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow transition-all duration-300 transform hover:scale-105 animate-fade-in"
                >
                  Start Game
                </button>
              )}

              {totalPlayers === 2 && !isCreator && !isStarting && (
                <div className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg animate-fade-in">
                  Waiting for host...
                </div>
              )}
            </div>
          </div>

          {/* Chat Panel (same style and functionality as Game.jsx) */}
          <div className="w-full md:w-1/3 border-l border-gray-700 p-4 flex flex-col bg-gray-800 rounded-lg">
            <h3 className="text-xl mb-3 font-semibold text-center border-b border-gray-600 pb-2">
              💬 Chat
            </h3>

            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto space-y-3 px-1 py-2 bg-gray-900 rounded shadow-inner max-h-[calc(60vh)] scroll-smooth"
            >
              {(chat || []).map((msg, i) => (
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
              {totalPlayers < 2 && (
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
                    totalPlayers < 2
                      ? "Chat enabled when both players join"
                      : "Type message..."
                  }
                  disabled={totalPlayers < 2}
                  className={`flex-1 px-3 py-2 rounded-l text-black focus:outline-none ${
                    totalPlayers < 2 ? "bg-gray-400/40 cursor-not-allowed" : ""
                  }`}
                />
                <button
                  onClick={sendChat}
                  disabled={totalPlayers < 2}
                  className={`px-5 py-2 rounded-r ${
                    totalPlayers < 2
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
      </div>
    </div>
  );
};

export default Lobby;
