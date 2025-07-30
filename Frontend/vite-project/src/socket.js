import { io } from "socket.io-client";
const socket = io("https://rock-paper-siccors.onrender.com", { transports: ["websocket"] });
export default socket;
