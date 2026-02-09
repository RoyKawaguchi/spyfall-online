const socket = io();

// Global client state
let currentRoom = null;
let isHost = false;

// Screens
const joinScreen = document.getElementById("joinScreen");
const lobbyScreen = document.getElementById("lobbyScreen");
const gameScreen = document.getElementById("gameScreen");

// Switch screens
function showLobby() {
  joinScreen.style.display = "none";
  lobbyScreen.style.display = "block";
  gameScreen.style.display = "none";
}

function showGame() {
  joinScreen.style.display = "none";
  lobbyScreen.style.display = "none";
  gameScreen.style.display = "block";
}