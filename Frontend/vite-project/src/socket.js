import { io } from "socket.io-client";
const socket = io(
  "https://rock-paper-siccors.onrender.com" || "http://localhost:5000",
  {
    transports: ["websocket", "polling"],
    withCredentials: true,
  }
);

// Add connection status logging
socket.on("connect", () => {
  console.log("✅ Connected to server!");
});

socket.on("connect_error", (error) => {
  console.error("❌ Connection error:", error);
});

export default socket;
