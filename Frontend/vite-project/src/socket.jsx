import { io } from "socket.io-client";

// Replace this URL with your backend server (adjust port as needed)
const socket = io("http://localhost:3000");

export default socket;
