const socket = io();

// Screens
const joinScreen = document.getElementById("joinScreen");
const lobbyScreen = document.getElementById("lobbyScreen");

// Inputs
const nameInput = document.getElementById("nameInput");
const roomInput = document.getElementById("roomInput");

// Buttons
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const startBtn = document.getElementById("startBtn");

// Lobby elements
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const playerList = document.getElementById("playerList");
const status = document.getElementById("status");

// State
let currentRoom = null;
let isHost = false;

// -------------------------
// Screen Switching Helpers
// -------------------------
function showLobby()
{
  joinScreen.style.display = "none";
  lobbyScreen.style.display = "block";
}

// -------------------------
// Create Room (Host)
// -------------------------
createBtn.addEventListener("click", () =>
{
  const name = nameInput.value;

  if (!name)
  {
    alert("Please enter your name.");
    return;
  }

  socket.emit("createRoom", { name });
});

// -------------------------
// Join Room (Player)
// -------------------------
joinBtn.addEventListener("click", () =>
{
  const name = nameInput.value;
  const roomCode = roomInput.value.toUpperCase();

  if (!name || !roomCode)
  {
    alert("Enter both name and room code.");
    return;
  }

  socket.emit("joinRoom", { name, roomCode });
});

// -------------------------
// Room Created (Host)
// -------------------------
socket.on("roomCreated", ({ roomCode }) =>
{
  currentRoom = roomCode;
  isHost = true;

  roomCodeDisplay.textContent = roomCode;
  status.textContent = "You are the host.";

  startBtn.style.display = "block";

  showLobby();
});

// -------------------------
// Joined Room (Player)
// -------------------------
socket.on("joinedRoom", ({ roomCode }) =>
{
  currentRoom = roomCode;
  isHost = false;

  roomCodeDisplay.textContent = roomCode;
  status.textContent = "Waiting for host to start...";

  startBtn.style.display = "none";

  showLobby();
});

// -------------------------
// Update Lobby Player List
// -------------------------
socket.on("roomUpdate", (room) =>
{
  playerList.innerHTML = "";

  room.players.forEach((player) =>
  {
    const li = document.createElement("li");
    li.textContent = player.name;
    playerList.appendChild(li);
  });
});

// -------------------------
// Host Starts Game
// -------------------------
startBtn.addEventListener("click", () =>
{
  socket.emit("startGame", { roomCode: currentRoom });
});

// -------------------------
// Game Started
// -------------------------
socket.on("gameStarted", () =>
{
  status.textContent = "🎮 Game Started!";
  startBtn.style.display = "none";
});

// -------------------------
// Error Messages
// -------------------------
socket.on("errorMessage", (msg) =>
{
  alert(msg);
});
