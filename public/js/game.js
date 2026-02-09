const roleText = document.getElementById("roleText");
const timerDisplay = document.getElementById("timerDisplay");
const locationListDiv = document.getElementById("locationListDiv");
const revealBtn = document.getElementById("revealBtn");
const restartBtn = document.getElementById("restartBtn");
const revealSection = document.getElementById("revealSection");
const revealText = document.getElementById("revealText");

let isSpy = false;
let checkedLocations = {}; // Track which locations spy has marked

// Receive your private card
socket.on("yourCard", (card) => {
  showGame();
  isSpy = card.isSpy;

  if (card.isSpy) {
    roleText.textContent = "You are the SPY. Try to guess the location!";
    roleText.style.color = "#ff4444";
    roleText.style.fontWeight = "bold";
  } else {
    roleText.textContent = `Location: "${card.location}",  Role: "${card.role}"`;
    roleText.style.color = "#333";
    roleText.style.fontWeight = "bold";
  }
});

// Receive location list
socket.on("locationList", ({ locations }) => {
  locationListDiv.innerHTML = "<h3>Possible Locations:</h3>";
  
  const list = document.createElement("ul");
  list.style.listStyle = "none";
  list.style.padding = "0";
  
  locations.forEach(location => {
    const li = document.createElement("li");
    li.style.marginBottom = "8px";
    
    if (isSpy) {
      // Spy can check off unlikely locations
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `loc-${location}`;
      checkbox.style.marginRight = "8px";
      
      checkbox.addEventListener("change", (e) => {
        checkedLocations[location] = e.target.checked;
        label.style.textDecoration = e.target.checked ? "line-through" : "none";
        label.style.opacity = e.target.checked ? "0.5" : "1";
      });
      
      const label = document.createElement("label");
      label.htmlFor = `loc-${location}`;
      label.textContent = location;
      label.style.cursor = "pointer";
      
      li.appendChild(checkbox);
      li.appendChild(label);
    } else {
      // Non-spy just sees the list
      li.textContent = location;
    }
    
    list.appendChild(li);
  });
  
  locationListDiv.appendChild(list);
});

// Timer updates
socket.on("timerUpdate", ({ timeLeft }) => {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  timerDisplay.textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
  timerDisplay.style.color = timeLeft <= 60 ? "#ff4444" : "#333"; // Red when under 1 min
});

// Timer ended
socket.on("timerEnded", () => {
  timerDisplay.textContent = "⏰ Time's Up! Please move on to voting!";
  timerDisplay.style.color = "#ff4444";
  timerDisplay.style.fontWeight = "bold";
});

// Show reveal and restart buttons (host only)
socket.on("gameStarted", () => {
  if (isHost) {
    revealBtn.style.display = "inline-block";
  }
});

// Reveal button (host only)
revealBtn.addEventListener("click", () => {
  socket.emit("revealGame", { roomCode: currentRoom });
});

// Game revealed - show results
socket.on("gameRevealed", ({ spyName, location }) => {
  revealSection.style.display = "block";
  revealText.innerHTML = `
    <div style="margin-bottom: 20px;">
      <strong style="color: #ff4d4d;">• The SPY was ${spyName}!</strong>
    </div>
    <div>
      <strong style="color: #03dac6;">• Location: "${location}"</strong>
    </div>
  `;
  
  // Hide reveal button, show restart button (host only)
  if (isHost) {
    revealBtn.style.display = "none";
    restartBtn.style.display = "inline-block";
  }
});

// Restart button (host only)
restartBtn.addEventListener("click", () => {
  socket.emit("restartGame", { roomCode: currentRoom });
});

// Game restarted - go back to lobby
socket.on("gameRestarted", () => {
  // Reset UI
  roleText.textContent = "";
  timerDisplay.textContent = "Time: 5:00";
  locationListDiv.innerHTML = "";
  revealSection.style.display = "none";
  revealText.innerHTML = "";
  revealBtn.style.display = "none";
  restartBtn.style.display = "none";
  checkedLocations = {};
  isSpy = false;
  
  // Go back to lobby
  showLobby();
});