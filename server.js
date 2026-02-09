const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the 'public' folder
app.use(express.static("public"));

// Global State: Storing rooms in RAM
const rooms = {};

const locations = [
  { name: "Airport", roles: ["Pilot", "Security", "Passenger", "Mechanic"] },
  { name: "Hospital", roles: ["Doctor", "Nurse", "Patient", "Surgeon"] },
  { name: "Casino", roles: ["Dealer", "Gambler", "Security", "Bartender"] }
];

/**
 * HELPER: Generates a 4-character room code
 */
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  // EVENT 1: Create Room (Host)
  socket.on("createRoom", ({ name }) => {
    const roomCode = generateRoomCode();
    
    rooms[roomCode] = {
      hostId: socket.id,
      players: [{ id: socket.id, name: name }],
      started: false
    };

    socket.join(roomCode);
    socket.emit("roomCreated", { roomCode, isHost: true });
    io.to(roomCode).emit("roomUpdate", rooms[roomCode]);
  });

  // EVENT: Join Room (Guest)
  socket.on("joinRoom", ({ name, roomCode }) => {
    const room = rooms[roomCode];
    if (!room) {
      return socket.emit("errorMessage", "Room not found.");
    }
    if (room.started) {
      return socket.emit("errorMessage", "Game already in progress.");
    }

    room.players.push({ id: socket.id, name });
    socket.join(roomCode);
    io.to(roomCode).emit("roomUpdate", room);
  });

  // EVENT: Start Game (Host only)
  socket.on("startGame", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || socket.id !== room.hostId) return;

    room.started = true;

    // 1. Pick Random Location & Spy
    const chosenLocation = locations[Math.floor(Math.random() * locations.length)];
    const spyIndex = Math.floor(Math.random() * room.players.length);
    const shuffledRoles = [...chosenLocation.roles].sort(() => Math.random() - 0.5);

    // 2. Assign Cards Privately
    room.players.forEach((player, index) => {
      const isSpy = index === spyIndex;
      const cardData = isSpy 
        ? { isSpy: true } 
        : { isSpy: false, location: chosenLocation.name, role: shuffledRoles.pop() || "Visitor" };
      
      io.to(player.id).emit("yourCard", cardData);
    });

    // 3. Notify everyone game is on
    io.to(roomCode).emit("gameStarted");
  });

  // EVENT: Disconnect
  socket.on("disconnect", () => {
    for (const roomCode in rooms) {
      const room = rooms[roomCode];
      room.players = room.players.filter(p => p.id !== socket.id);

      if (room.hostId === socket.id) {
        io.to(roomCode).emit("errorMessage", "Host left. Room closed.");
        delete rooms[roomCode];
      } else {
        io.to(roomCode).emit("roomUpdate", room);
      }
    }
  });
});

server.listen(3000, () => {
  console.log("Spyfall Server running at http://localhost:3000");
});