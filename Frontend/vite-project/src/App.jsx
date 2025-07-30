// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Lobby from "./components/Lobby";
import Game from "./components/Game";

const App = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-700 text-white">
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/lobby/:roomId" element={<Lobby />} />
          <Route path="/game/:roomId" element={<Game />} />
        </Routes>
      </Router>
    </div>
  );
};

export default App;
