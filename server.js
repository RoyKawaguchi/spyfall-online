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
  { name: "Airport", roles: ["Pilot", "Security Guard", "Passenger", "Mechanic", "Flight Attendant", "Customs Officer"] },
  { name: "Hospital", roles: ["Doctor", "Nurse", "Patient", "Surgeon", "Receptionist", "Paramedic"] },
  { name: "Casino", roles: ["Dealer", "Gambler", "Security Guard", "Bartender", "Pit Boss", "Waitress"] },
  { name: "Beach", roles: ["Lifeguard", "Surfer", "Ice Cream Vendor", "Tourist", "Photographer", "Sunbather"] },
  { name: "Restaurant", roles: ["Chef", "Waiter", "Customer", "Host", "Dishwasher", "Food Critic"] },
  { name: "School", roles: ["Teacher", "Student", "Principal", "Janitor", "Librarian", "Gym Coach"] },
  { name: "Theater", roles: ["Actor", "Director", "Audience Member", "Stagehand", "Usher", "Makeup Artist"] },
  { name: "Bank", roles: ["Teller", "Manager", "Customer", "Security Guard", "Armored Car Driver", "Loan Officer"] },
  { name: "Space Station", roles: ["Astronaut", "Scientist", "Commander", "Engineer", "Space Tourist", "Alien Hunter"] },
  { name: "Submarine", roles: ["Captain", "Sonar Operator", "Cook", "Engineer", "Radio Operator", "Navigator"] },
  { name: "Hotel", roles: ["Concierge", "Bellhop", "Guest", "Housekeeper", "Manager", "Valet"] },
  { name: "Police Station", roles: ["Detective", "Patrol Officer", "Criminal", "Lawyer", "Police Chief", "Dispatcher"] },
  { name: "Supermarket", roles: ["Cashier", "Customer", "Stock Clerk", "Butcher", "Manager", "Security Guard"] },
  { name: "Movie Studio", roles: ["Director", "Actor", "Cameraman", "Stuntman", "Producer", "Screenwriter"] },
  { name: "Corporate Party", roles: ["CEO", "Secretary", "Accountant", "Delivery Person", "IT Guy", "Intern"] },
  { name: "Crusader Army", roles: ["Knight", "Squire", "Archer", "Monk", "Prisoner", "Blacksmith"] },
  { name: "Pirate Ship", roles: ["Captain", "Cabin Boy", "First Mate", "Cannoneer", "Sailor", "Cook"] },
  { name: "Polar Station", roles: ["Researcher", "Meteorologist", "Geologist", "Expedition Leader", "Mechanic", "Doctor"] },
  { name: "Military Base", roles: ["Soldier", "Officer", "Medic", "Sniper", "Colonel", "Tank Driver"] },
  { name: "Embassy", roles: ["Ambassador", "Diplomat", "Secretary", "Security Guard", "Tourist", "Spy Hunter"] }
];

// Get all location names for the reference list
const allLocationNames = locations.map(loc => loc.name);

/**
 * HELPER: Generates a 4-character room code
 */
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

/**
 * HELPER: Start game timer for a room
 */
function startTimer(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  room.timeLeft = 300; // 5 minutes = 300 seconds
  room.timerInterval = setInterval(() => {
    room.timeLeft--;
    
    // Send time update to all players
    io.to(roomCode).emit("timerUpdate", { timeLeft: room.timeLeft });

    // When time hits 0, stop the timer
    if (room.timeLeft <= 0) {
      clearInterval(room.timerInterval);
      io.to(roomCode).emit("timerEnded");
    }
  }, 1000); // Every 1 second
}

/**
 * HELPER: Stop timer for a room
 */
function stopTimer(roomCode) {
  const room = rooms[roomCode];
  if (room && room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }
}

/**
 * HELPER: Returns a version of the room object safe to send over Socket.IO
 * (Removes the circular timerInterval object that causes crashes)
 */
function getCleanRoomData(roomCode) {
  const room = rooms[roomCode];
  if (!room) return null;
  return {
    hostId: room.hostId,
    players: room.players,
    started: room.started,
    timeLeft: room.timeLeft,
    location: room.location
    // timerInterval is NOT included here
  };
}

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  // EVENT: Create Room (Host)
  socket.on("createRoom", ({ name }) => {
    const roomCode = generateRoomCode();
    
    rooms[roomCode] = {
      hostId: socket.id,
      players: [{ id: socket.id, name: name }],
      started: false,
      timeLeft: 300,
      timerInterval: null,
      location: null,
      spyId: null
    };

    socket.join(roomCode);
    socket.emit("roomCreated", { roomCode, isHost: true });
    io.to(roomCode).emit("roomUpdate", getCleanRoomData(roomCode));
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
    
    socket.emit("joinedRoom", { roomCode });
    io.to(roomCode).emit("roomUpdate", getCleanRoomData(roomCode))
  });

  // EVENT: Start Game (Host only)
  socket.on("startGame", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || socket.id !== room.hostId) return;

    room.started = true;

    // 1. Pick Random Location & Spy
    const chosenLocation = locations[Math.floor(Math.random() * locations.length)];
    const spyIndex = Math.floor(Math.random() * room.players.length);
    
    // Store for later reveal
    room.location = chosenLocation.name;
    room.spyId = room.players[spyIndex].id;
    room.spyName = room.players[spyIndex].name;
    
    // 2. Create role pool
    let rolePool = [...chosenLocation.roles];
    while (rolePool.length < room.players.length) {
      rolePool.push("Visitor");
    }
    const shuffledRoles = rolePool.sort(() => Math.random() - 0.5);

    // 3. Assign Cards Privately
    room.players.forEach((player, index) => {
      const isSpy = index === spyIndex;
      const cardData = isSpy 
        ? { isSpy: true } 
        : { 
            isSpy: false, 
            location: chosenLocation.name, 
            role: shuffledRoles.pop() || "Visitor"
          };
      
      io.to(player.id).emit("yourCard", cardData);
    });

    // 4. Send location list to everyone
    io.to(roomCode).emit("locationList", { locations: allLocationNames });

    // 5. Notify game started
    io.to(roomCode).emit("gameStarted");

    // 6. Start the timer
    startTimer(roomCode);
  });

  // EVENT: Reveal Game (Host only) - shows spy and location
  socket.on("revealGame", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || socket.id !== room.hostId) return;

    // Stop timer if still running
    stopTimer(roomCode);

    // Send reveal to everyone
    io.to(roomCode).emit("gameRevealed", {
      spyName: room.spyName,
      location: room.location
    });
  });

  // EVENT: Restart Game (Host only)
  socket.on("restartGame", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || socket.id !== room.hostId) return;

    // Stop any existing timer
    stopTimer(roomCode);

    // Reset game state but keep players
    room.started = false;
    room.timeLeft = 300;
    room.location = null;
    room.spyId = null;
    room.spyName = null;

    // Tell everyone to go back to lobby
    io.to(roomCode).emit("gameRestarted");
    io.to(roomCode).emit("roomUpdate", getCleanRoomData(roomCode));
  });

  // EVENT: Disconnect
  socket.on("disconnect", () => {
    for (const roomCode in rooms) {
      const room = rooms[roomCode];
      room.players = room.players.filter(p => p.id !== socket.id);

      if (room.hostId === socket.id) {
        // Host left = close room and stop timer
        stopTimer(roomCode);
        io.to(roomCode).emit("errorMessage", "Host left. Room closed.");
        delete rooms[roomCode];
      } else if (room.players.length === 0) {
        // Everyone left = clean up
        stopTimer(roomCode);
        delete rooms[roomCode];
      } else {
        io.to(roomCode).emit("roomUpdate", getCleanRoomData(roomCode));
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Spyfall Server running");
});