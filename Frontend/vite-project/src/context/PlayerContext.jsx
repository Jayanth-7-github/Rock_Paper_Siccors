// src/context/PlayerContext.jsx
import React, { createContext, useContext, useState } from "react";

const PlayerContext = createContext();

export const PlayerProvider = ({ children }) => {
  const [player, setPlayer] = useState({ name: "", roomId: "" });
  // Chat state is shared in context so messages persist across Lobby <-> Game
  const [chat, setChat] = useState([]);

  return (
    <PlayerContext.Provider value={{ player, setPlayer, chat, setChat }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);
