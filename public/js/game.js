const roleText = document.getElementById("roleText");
const readyBtn = document.getElementById("readyBtn");

// Receive your private card
socket.on("yourCard", (card) =>
{
    showRole();

    if (card.isSpy)
    {
        roleText.textContent = 
            "You are the SPY. Try to guess the location!";
    }
    else
    {
        roleText.textContent =
            `Location: ${card.location}\nRole: ${card.role}`;
    }
});

// Ready button (placeholder)
readyBtn.addEventListener("click", () =>
{
    alert("Next step: gameplay screen!");
});
