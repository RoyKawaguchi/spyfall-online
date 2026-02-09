const playerList = document.getElementById("playerList");
const startBtn = document.getElementById("startBtn");

// Update lobby player list
socket.on("roomUpdate", (room) =>
{
  playerList.innerHTML = "";

  room.players.forEach((player) =>
  {
    const li = document.createElement("li");
    li.textContent = player.name;
    playerList.appendChild(li);
  });

  // Show start button only for host
  if (isHost && !room.started)
  {
    startBtn.style.display = "block";
  }
  else
  {
    startBtn.style.display = "none";
  }
});

// Host starts game
startBtn.addEventListener("click", () =>
{
  socket.emit("startGame", { roomCode: currentRoom });
});

socket.on("gameStarted", () =>
{
  document.getElementById("status").textContent = "🎮 Game Started!";
});
