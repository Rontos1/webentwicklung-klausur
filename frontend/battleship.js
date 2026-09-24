// Enthält zum Teil mit KI generierten Code
/**
 * Schiffeversenken - Frontend Game Logic (Starter Template)
 */

// Konstanten für die zu platzierenden Schiffe
const SHIPS_TO_PLACE = [
    { name: "Schlachtschiff", size: 5 },
    { name: "Kreuzer", size: 4 },
    { name: "Zerstörer", size: 3 },
    { name: "U-Boot", size: 2 }
];

// Spielzustand (State) im Frontend
let gameState = {
    gameId: null,
    phase: "setup", // "setup", "playing", "finished"
    currentShipIndex: 0, // Welches Schiff aus SHIPS_TO_PLACE wird gerade platziert
    orientation: "horizontal", // "horizontal" oder "vertical"
    playerShips: [], // Die platzierten Schiffe des Spielers
    playerBoard: Array(10).fill(null).map(() => Array(10).fill(null)), // Eigenes Board (Schiffsbelegung)
    opponentBoard: Array(10).fill(null).map(() => Array(10).fill(null)) // Gegnerisches Board (Schüsse auf Gegner)
};

let previewCoordinates = [];
let shotInProgress = false;

/**
 * Initialisiert das Spiel, baut die Grid-Zellen auf und registriert die Event-Listener
 */
function initGame() {
    console.log("Spiel initialisiert.");
    buildBoard("player-board");
    buildBoard("opponent-board");
    document.getElementById("orientation").addEventListener("change", (event) => {
        gameState.orientation = event.target.value;
        clearPreview();
    });
    document.getElementById("reset-button").addEventListener("click", resetGame);
    document.getElementById("start-button").addEventListener("click", startGame);
    document.getElementById("start-button").disabled = true;
    updateSetupDisplay();
}

function buildBoard(boardId) {
    const board = document.getElementById(boardId);

    for (let row = 0; row < 10; row++) {
        for (let column = 0; column < 10; column++) {
            const cell = document.createElement("button");
            cell.type = "button";
            cell.className = "cell";
            cell.dataset.x = column;
            cell.dataset.y = row;
            if (boardId === "player-board") {
                cell.addEventListener("mouseenter", () => showPreview(column, row));
                cell.addEventListener("mouseleave", clearPreview);
                cell.addEventListener("click", () => placeShip(column, row));
            } else {
                cell.addEventListener("click", () => fireShot(column, row));
            }
            board.appendChild(cell);
        }
    }
}

function getShipCoordinates(x, y, size, orientation) {
    return Array.from({ length: size }, (_, index) => ({
        x: x + (orientation === "horizontal" ? index : 0),
        y: y + (orientation === "vertical" ? index : 0)
    }));
}

/**
 * Prüft, ob ein Schiff mit bestimmter Größe und Ausrichtung ab Position (x, y) platziert werden kann.
 * Berücksichtigt die Grenzen des Spielfelds, Überschneidungen und Berührungsregeln.
 * 
 * @param {number} x - Spaltenkoordinate (0-9)
 * @param {number} y - Zeilenkoordinate (0-9)
 * @param {number} size - Schiffsgröße
 * @param {string} orientation - "horizontal" oder "vertical"
 * @returns {boolean} - true wenn Platzierung gültig, sonst false
 */
function canPlaceShip(x, y, size, orientation) {
    const coordinates = getShipCoordinates(x, y, size, orientation);
    return coordinates.every(({ x: cellX, y: cellY }) => {
        if (cellX < 0 || cellX >= 10 || cellY < 0 || cellY >= 10) return false;
        return gameState.playerShips.every((ship) => ship.coordinates.every((occupiedCell) =>
            Math.abs(occupiedCell.x - cellX) > 1 || Math.abs(occupiedCell.y - cellY) > 1
        ));
    });
}

function showPreview(x, y) {
    clearPreview();
    if (gameState.phase !== "setup" || gameState.currentShipIndex >= SHIPS_TO_PLACE.length) return;

    const ship = SHIPS_TO_PLACE[gameState.currentShipIndex];
    const coordinates = getShipCoordinates(x, y, ship.size, gameState.orientation);
    if (!canPlaceShip(x, y, ship.size, gameState.orientation)) return;

    previewCoordinates = coordinates;
    previewCoordinates.forEach(({ x: cellX, y: cellY }) => {
        getCell("player-board", cellX, cellY)?.classList.add("preview");
    });
}

function clearPreview() {
    previewCoordinates.forEach(({ x, y }) => {
        getCell("player-board", x, y)?.classList.remove("preview");
    });
    previewCoordinates = [];
}

function getCell(boardId, x, y) {
    return document.querySelector(`#${boardId} .cell[data-x="${x}"][data-y="${y}"]`);
}

function placeShip(x, y) {
    if (gameState.phase !== "setup" || gameState.currentShipIndex >= SHIPS_TO_PLACE.length) return;
    const ship = SHIPS_TO_PLACE[gameState.currentShipIndex];
    if (!canPlaceShip(x, y, ship.size, gameState.orientation)) {
        setStatus("Das Schiff kann hier nicht platziert werden.");
        return;
    }

    gameState.playerShips.push({
        name: ship.name,
        size: ship.size,
        coordinates: getShipCoordinates(x, y, ship.size, gameState.orientation)
    });
    gameState.currentShipIndex++;
    clearPreview();
    renderBoards();
    updateSetupDisplay();
}

/**
 * Zeichnet die Schiffe und Schussergebnisse auf den Rastern
 */
function renderBoards() {
    document.querySelectorAll("#player-board .cell").forEach((cell) => {
        cell.className = "cell";
        const x = Number(cell.dataset.x);
        const y = Number(cell.dataset.y);
        if (gameState.playerShips.some((ship) => ship.coordinates.some((coordinate) => coordinate.x === x && coordinate.y === y))) {
            cell.classList.add("ship");
        }
        if (gameState.playerBoard[y][x]) cell.classList.add(gameState.playerBoard[y][x]);
    });

    document.querySelectorAll("#opponent-board .cell").forEach((cell) => {
        cell.className = "cell";
        const x = Number(cell.dataset.x);
        const y = Number(cell.dataset.y);
        if (gameState.opponentBoard[y][x]) cell.classList.add(gameState.opponentBoard[y][x]);
        cell.disabled = gameState.phase !== "playing" || shotInProgress || Boolean(gameState.opponentBoard[y][x]);
    });
}

function updateSetupDisplay() {
    const currentShip = SHIPS_TO_PLACE[gameState.currentShipIndex];
    document.getElementById("current-ship").textContent = currentShip ? `${currentShip.name} (${currentShip.size} Felder)` : "Alle Schiffe platziert";
    document.getElementById("start-button").disabled = gameState.phase !== "setup" || gameState.playerShips.length !== SHIPS_TO_PLACE.length;
    document.getElementById("orientation").disabled = gameState.phase !== "setup";
}

function resetGame() {
    gameState.gameId = null;
    gameState.currentShipIndex = 0;
    gameState.playerShips = [];
    gameState.playerBoard = Array(10).fill(null).map(() => Array(10).fill(null));
    gameState.opponentBoard = Array(10).fill(null).map(() => Array(10).fill(null));
    gameState.phase = "setup";
    shotInProgress = false;
    clearPreview();
    renderBoards();
    updateSetupDisplay();
    setStatus("");
}

function setStatus(message) {
    document.getElementById("status").textContent = message;
}

/**
 * Startet das Spiel per POST an /api/game
 */
async function startGame() {
    if (gameState.playerShips.length !== SHIPS_TO_PLACE.length) return;
    setStatus("Spiel wird gestartet ...");

    try {
        const response = await fetch("/api/game", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ships: gameState.playerShips })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Das Spiel konnte nicht gestartet werden.");

        gameState.gameId = data.gameId;
        gameState.phase = "playing";
        clearPreview();
        updateSetupDisplay();
        renderBoards();
        setStatus("Das Spiel läuft. Du bist am Zug.");
    } catch (error) {
        setStatus(error.message);
    }
}

/**
 * Führt einen Schuss auf das gegnerische Spielfeld aus
 * @param {number} x 
 * @param {number} y 
 */
async function fireShot(x, y) {
    if (gameState.phase !== "playing" || shotInProgress || gameState.opponentBoard[y][x]) return;
    shotInProgress = true;
    renderBoards();

    try {
        const response = await fetch(`/api/game/${gameState.gameId}/shoot`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ x, y })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Der Schuss konnte nicht ausgeführt werden.");

        gameState.opponentBoard[y][x] = data.playerResult.result;
        if (data.computerResult) {
            gameState.playerBoard[data.computerResult.y][data.computerResult.x] = data.computerResult.result;
        }
        if (data.playerShips) gameState.playerShips = data.playerShips;

        gameState.phase = data.status === "finished" ? "finished" : "playing";
        renderBoards();

        if (data.status === "finished") {
            setStatus(data.winner === "player" ? "Gewonnen! Alle gegnerischen Schiffe sind versenkt." : "Verloren! Der Computer hat alle Schiffe versenkt.");
        } else {
            const playerMessage = data.playerResult.result === "sunk" ? "Du hast ein Schiff versenkt." : data.playerResult.result === "hit" ? "Treffer!" : "Daneben.";
            const computerMessage = data.computerResult.result === "sunk" ? " Der Computer hat ein Schiff versenkt." : data.computerResult.result === "hit" ? " Der Computer hat getroffen." : " Der Computer hat danebengeschossen.";
            setStatus(`${playerMessage}${computerMessage} Du bist wieder am Zug.`);
        }
    } catch (error) {
        setStatus(error.message);
    } finally {
        shotInProgress = false;
        renderBoards();
    }
}

// Start der Anwendung
document.addEventListener("DOMContentLoaded", initGame);
