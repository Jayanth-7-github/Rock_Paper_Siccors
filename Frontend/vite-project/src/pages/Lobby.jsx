// src/pages/Lobby.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import socket from '../socket';
import { usePlayer } from '../context/PlayerContext';

const Lobby = () => {
  const { player } = usePlayer();
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (!player.name) {
      navigate('/');
      return;
    }

    socket.emit("join-room", { roomId, name: player.name });

    socket.on("room-full", () => {
      alert("Room is full!");
      navigate("/");
    });

    socket.on("both-players-joined", ({ players }) => {
      setPlayers(players);
      setTimeout(() => {
        navigate(`/game/${roomId}`);
      }, 1500);
    });

    socket.on("opponent-left", () => {
      alert("Opponent disconnected");
      navigate("/");
    });

    return () => {
      socket.off("room-full");
      socket.off("both-players-joined");
      socket.off("opponent-left");
    };
  }, [player, roomId, navigate]);

  return (
    <div className="min-h-screen bg-gray-800 text-white flex flex-col items-center justify-center p-6">
      <h2 className="text-3xl mb-4">Room: {roomId}</h2>
      <p className="text-lg mb-2">Waiting for opponent...</p>
      <div className="mt-4 space-y-2">
        {players.map((p) => (
          <div key={p.id} className="text-xl">
            ✅ {p.name}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Lobby;
