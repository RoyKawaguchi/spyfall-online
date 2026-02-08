const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve frontend files
app.use(express.static("public"));

// Store rooms + players in memory
const rooms = {};

// When a player connects
io.on("connection", (socket) =>
{
  console.log("A player connected! \nID: ", socket.id);

  // Player joins a room
  socket.on("joinRoom", ({ name, roomCode }) =>
  {
    console.log(`${name} is joining room ${roomCode}`);

    // Create new room if it doesn't exist
    if (!rooms[roomCode])
    {
      rooms[roomCode] = [];
    }

    // Add player to room
    rooms[roomCode].push({
      id: socket.id,
      name: name
    });

    // Join Socket.IO room
    socket.join(roomCode);

    // Send updated player list to everyone in room
    io.to(roomCode).emit("roomUpdate", rooms[roomCode]);
  });

  // Handle disconnect
  socket.on("disconnect", () =>
  {
    console.log("Player disconnected! \nID:", socket.id);

    // Remove player from any room they were in
    for (let roomCode in rooms)
    {
      rooms[roomCode] = rooms[roomCode].filter(
        (player) => player.id !== socket.id
      );

      // Update room player list
      io.to(roomCode).emit("roomUpdate", rooms[roomCode]);
    }
  });
});

// Start server
server.listen(3000, () =>
{
  console.log("Server running at http://localhost:3000");
});
