// src/components/Game.jsx
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import socket from "../socket";
import Result from "./Result";
import Scoreboard from "./Scoreboard";

const Game = () => {
  const { roomId } = useParams();
  const [choice, setChoice] = useState(null);
  const [opponentChoice, setOpponentChoice] = useState(null);
  const [result, setResult] = useState(null);
  const [scores, setScores] = useState({ you: 0, opponent: 0 });

  useEffect(() => {
    socket.on("round-result", ({ winner, playerMove, opponentMove }) => {
      setChoice(playerMove);
      setOpponentChoice(opponentMove);

      if (winner === "draw") setResult("draw");
      else if (winner === "you") setResult("win");
      else setResult("lose");

      if (winner === "you") {
        setScores((prev) => ({ ...prev, you: prev.you + 1 }));
      } else if (winner === "opponent") {
        setScores((prev) => ({ ...prev, opponent: prev.opponent + 1 }));
      }
    });

    return () => {
      socket.off("round-result");
    };
  }, []);

  const handleChoice = (move) => {
    setChoice(move);
    socket.emit("player-choice", { roomId, move });
  };

  const handleRematch = () => {
    setChoice(null);
    setOpponentChoice(null);
    setResult(null);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <h1 className="text-3xl font-bold mb-6">🎮 Rock, Paper, Scissors</h1>
      <p className="text-gray-400 mb-2">Room: <span className="text-yellow-400 font-mono">{roomId}</span></p>

      <Scoreboard scores={scores} />

      {!result ? (
        <>
          <p className="mb-4 text-lg">Choose your move:</p>
          <div className="flex gap-6">
            {["rock", "paper", "scissors"].map((move) => (
              <button
                key={move}
                onClick={() => handleChoice(move)}
                disabled={choice !== null}
                className={`px-6 py-3 rounded-lg text-xl transition ${
                  choice === move ? "bg-blue-600" : "bg-indigo-600"
                } hover:bg-indigo-700`}
              >
                {move === "rock" && "🪨 Rock"}
                {move === "paper" && "📄 Paper"}
                {move === "scissors" && "✂️ Scissors"}
              </button>
            ))}
          </div>
          {choice && <p className="mt-4 text-gray-400">Waiting for opponent...</p>}
        </>
      ) : (
        <Result
          result={result}
          playerChoice={choice}
          opponentChoice={opponentChoice}
          onRematch={handleRematch}
        />
      )}
    </div>
  );
};

export default Game;
