// src/components/Lobby.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import socket from "../socket";

const Lobby = () => {
  const { roomId } = useParams();
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    socket.emit("get-room-users", roomId);

    socket.on("room-users", (userList) => {
      setUsers(userList);
    });

    socket.on("start-game", () => {
      navigate(`/game/${roomId}`);
    });

    return () => {
      socket.off("room-users");
      socket.off("start-game");
    };
  }, [roomId, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <h1 className="text-4xl font-bold mb-4">🕹️ Waiting Room</h1>
      <p className="text-lg text-gray-300 mb-6">Room Code: <span className="font-mono text-yellow-400">{roomId}</span></p>

      <h2 className="text-2xl font-semibold mb-2">Players Joined:</h2>
      <ul className="space-y-2 text-lg">
        {users.map((user, index) => (
          <li key={index} className="bg-gray-800 px-4 py-2 rounded-md">{user}</li>
        ))}
      </ul>

      <p className="mt-6 text-sm text-gray-400">Waiting for another player to join...</p>
    </div>
  );
};

export default Lobby;
