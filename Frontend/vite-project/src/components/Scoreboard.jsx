import React from "react";

const Scoreboard = ({ scores }) => {
  return (
    <div className="flex justify-center gap-10 my-6">
      <div className="bg-blue-800 text-white px-6 py-3 rounded-lg shadow-md">
        <p className="text-lg font-semibold">You</p>
        <p className="text-3xl font-bold">{scores.you}</p>
      </div>
      <div className="bg-red-800 text-white px-6 py-3 rounded-lg shadow-md">
        <p className="text-lg font-semibold">Opponent</p>
        <p className="text-3xl font-bold">{scores.opponent}</p>
      </div>
    </div>
  );
};

export default Scoreboard;
