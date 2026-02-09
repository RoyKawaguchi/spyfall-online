const nameInput = document.getElementById("nameInput");
const roomInput = document.getElementById("roomInput");

const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");

// Create room (host)
createBtn.addEventListener("click", () =>
{
  const name = nameInput.value;
  if (!name) return alert("Enter your name");

  socket.emit("createRoom", { name });
});

// Join room
joinBtn.addEventListener("click", () =>
{
  const name = nameInput.value;
  const roomCode = roomInput.value.toUpperCase();

  if (!name || !roomCode)
  {
    return alert("Enter name and room code");
  }

  socket.emit("joinRoom", { name, roomCode });
});

// Server responses
socket.on("roomCreated", ({ roomCode }) =>
{
  currentRoom = roomCode;
  isHost = true;

  document.getElementById("roomCodeDisplay").textContent = roomCode;
  document.getElementById("status").textContent = "You are the host.";

  showLobby();
});

socket.on("joinedRoom", ({ roomCode }) =>
{
  currentRoom = roomCode;
  isHost = false;

  document.getElementById("roomCodeDisplay").textContent = roomCode;
  document.getElementById("status").textContent = "Waiting for host to start.";

  showLobby();
});

socket.on("errorMessage", (msg) =>
{
  alert(msg);
});