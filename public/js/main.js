const socket = io();

// Global client state
let currentRoom = null;
let isHost = false;

// Screens
const joinScreen = document.getElementById("joinScreen");
const lobbyScreen = document.getElementById("lobbyScreen");
const roleScreen = document.getElementById("roleScreen");

// Switch screens
function showLobby()
{
  joinScreen.style.display = "none";
  lobbyScreen.style.display = "block";
  roleScreen.style.display = "none";
}

function showRole()
{
  joinScreen.style.display = "none";
  lobbyScreen.style.display = "none";
  roleScreen.style.display = "block";
}
