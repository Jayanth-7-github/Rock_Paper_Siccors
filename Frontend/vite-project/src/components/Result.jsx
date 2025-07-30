// src/components/Result.jsx
import React from "react";

const Result = ({ result, playerChoice, opponentChoice, onRematch }) => {
  return (
    <div className="text-center mt-6">
      <h2 className="text-3xl font-bold mb-4">
        {result === "draw"
          ? "It's a Draw!"
          : result === "win"
          ? "You Win! 🎉"
          : "You Lose 😢"}
      </h2>
      <div className="flex justify-center gap-12 my-6">
        <div className="border-2 border-dashed border-gray-400 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-2">You</h3>
          <p className="text-lg">{playerChoice ? playerChoice : "None"}</p>
        </div>
        <div className="border-2 border-dashed border-gray-400 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-2">Opponent</h3>
          <p className="text-lg">{opponentChoice ? opponentChoice : "None"}</p>
        </div>
      </div>
      <button
        onClick={onRematch}
        className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-lg hover:bg-indigo-700 transition"
      >
        🔁 Rematch
      </button>
    </div>
  );
};

export default Result;
