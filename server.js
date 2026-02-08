const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {};
// Each room contains:
// - host ID
// - arr of players
// - boolean "started"

/**
 * Generates random room code (e.g., ABCD)
 * @returns a random room code
 */
function generateRoomCode()
{
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

io.on("connection", (socket) =>
{
  console.log("Player connected:", socket.id);

  // CREATE ROOM (Host)
  socket.on("createRoom", ({ name }) =>
  {
    const roomCode = generateRoomCode();

    rooms[roomCode] =
    {
      hostId: socket.id,
      players: [
        {
          id: socket.id,
          name: name
        }
      ],
      started: false
    };

    socket.join(roomCode);

    // Send room info back to host only
    socket.emit("roomCreated",
    {
      roomCode: roomCode,
      isHost: true
    });

    // Update everyone in room (just host for now)
    io.to(roomCode).emit("roomUpdate", rooms[roomCode]);
  });

  // JOIN ROOM (Normal player)
  socket.on("joinRoom", ({ name, roomCode }) =>
  {
    const room = rooms[roomCode];

    if (!room)
    {
      socket.emit("errorMessage", "Room does not exist.");
      return;
    }

    if (room.started)
    {
      socket.emit("errorMessage", "Game already started. Cannot join.");
      return;
    }

    // Can join!

    room.players.push({
      id: socket.id,
      name: name
    });

    socket.join(roomCode);

    socket.emit("joinedRoom",
    {
      roomCode: roomCode,
      isHost: false
    });

    io.to(roomCode).emit("roomUpdate", room);
  });

  // HOST STARTS GAME
  socket.on("startGame", ({ roomCode }) =>
  {
    const room = rooms[roomCode];

    if (!room) return;

    // Only host can start
    if (socket.id !== room.hostId)
    {
      socket.emit("errorMessage", "Only the host can start the game.");
      return;
    }

    room.started = true;

    io.to(roomCode).emit("gameStarted");
  });

  // DISCONNECT CLEANUP
  socket.on("disconnect", () =>
  {
    console.log("Player disconnected:", socket.id);

    for (let roomCode in rooms)
    {
      const room = rooms[roomCode];

      room.players = room.players.filter(
        (player) => player.id !== socket.id
      );

      // If host leaves, delete room
      if (room.hostId === socket.id)
      {
        io.to(roomCode).emit("errorMessage", "Host left. Room closed.");
        delete rooms[roomCode];
        return;
      }

      io.to(roomCode).emit("roomUpdate", room);
    }
  });
});

server.listen(3000, () =>
{
  console.log("Server running at http://localhost:3000");
});
