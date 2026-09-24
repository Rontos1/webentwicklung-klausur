import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

// Enthält zum Teil mit KI generierten Code


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
// Statische Dateien aus dem frontend Ordner ausliefern
app.use(express.static(path.join(__dirname, "../frontend")));

// In-Memory-Speicher für Spiele
// Struktur eines Spiels:
// {
//     id: "uuid-oder-zahl",
//     status: "playing", // "playing", "finished"
//     playerShips: [...], // Array von Schiffen mit { coordinates: [{x, y}], hits: number, sunk: boolean }
//     computerShips: [...],
//     playerShots: [], // Verlauf der Spieler-Schüsse
//     computerShots: [], // Verlauf der Computer-Schüsse
//     winner: null
// }
const games = {};

/**
 * Validiert die Aufstellungsregeln für eine Schiffsflotte.
 * @param {Array} ships - Array von Schiffsobjekten
 * @returns {boolean} - true wenn gültig, sonst false
 */
function validateShipPlacement(ships) {
    if (!Array.isArray(ships) || ships.length !== 4) return false;

    const expectedSizes = [5, 4, 3, 2];
    const normalizedShips = [];
    for (const size of expectedSizes) {
        const ship = ships.find((candidate) => candidate.size === size);
        if (!ship || !Array.isArray(ship.coordinates) || ship.coordinates.length !== size) return false;

        const coordinates = ship.coordinates;
        const coordinateKeys = new Set(coordinates.map(({ x, y }) => `${x},${y}`));
        if (coordinateKeys.size !== size) return false;
        if (coordinates.some(({ x, y }) => !isValidCoordinate(x, y))) return false;

        const sameRow = coordinates.every(({ y }) => y === coordinates[0].y);
        const sameColumn = coordinates.every(({ x }) => x === coordinates[0].x);
        const axisValues = sameRow ? coordinates.map(({ x }) => x) : sameColumn ? coordinates.map(({ y }) => y) : [];
        if ((!sameRow && !sameColumn) || Math.max(...axisValues) - Math.min(...axisValues) !== size - 1) return false;
        normalizedShips.push(coordinates);
    }

    for (let firstIndex = 0; firstIndex < normalizedShips.length; firstIndex++) {
        for (let secondIndex = firstIndex + 1; secondIndex < normalizedShips.length; secondIndex++) {
            for (const firstCell of normalizedShips[firstIndex]) {
                for (const secondCell of normalizedShips[secondIndex]) {
                    if (Math.abs(firstCell.x - secondCell.x) <= 1 && Math.abs(firstCell.y - secondCell.y) <= 1) return false;
                }
            }
        }
    }
    return true;
}

function isValidCoordinate(x, y) {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < 10 && y >= 0 && y < 10;
}

function canPlaceGeneratedShip(coordinates, ships) {
    return coordinates.every((coordinate) => isValidCoordinate(coordinate.x, coordinate.y) && ships.every((ship) => ship.coordinates.every((occupiedCell) =>
        Math.abs(coordinate.x - occupiedCell.x) > 1 || Math.abs(coordinate.y - occupiedCell.y) > 1
    )));
}

/**
 * Generiert eine zufällige, gültige Platzierung für die Computer-Flotte.
 * @returns {Array} - Array von Schiffsobjekten
 */
function generateComputerShips() {
    const shipSizes = [5, 4, 3, 2];
    const ships = [];

    for (const size of shipSizes) {
        let placed = false;
        for (let attempt = 0; attempt < 1000 && !placed; attempt++) {
            const orientation = Math.random() < 0.5 ? "horizontal" : "vertical";
            const maxX = orientation === "horizontal" ? 10 - size : 9;
            const maxY = orientation === "vertical" ? 10 - size : 9;
            const startX = Math.floor(Math.random() * (maxX + 1));
            const startY = Math.floor(Math.random() * (maxY + 1));
            const coordinates = Array.from({ length: size }, (_, index) => ({
                x: startX + (orientation === "horizontal" ? index : 0),
                y: startY + (orientation === "vertical" ? index : 0)
            }));

            if (canPlaceGeneratedShip(coordinates, ships)) {
                ships.push({ size, coordinates, hits: 0, sunk: false });
                placed = true;
            }
        }
        if (!placed) return generateComputerShips();
    }
    return ships;
}

/**
 * POST /api/game
 * Erstellt ein neues Spiel und liefert die gameId und Lokations-URL zurück.
 */
app.post("/api/game", (req, res) => {
    const { ships } = req.body || {};

    if (!validateShipPlacement(ships)) {
        return res.status(422).json({ error: "Ungültige Schiffsaufstellung." });
    }

    const gameId = randomUUID();
    games[gameId] = {
        id: gameId,
        status: "playing",
        playerShips: ships.map((ship) => ({ ...ship, hits: 0, sunk: false })),
        computerShips: generateComputerShips(),
        playerShots: [],
        computerShots: [],
        winner: null
    };

    res.status(201).json({
        gameId,
        status: games[gameId].status,
        url: `/api/game/${gameId}`
    });
});

/**
 * GET /api/game
 * Liefert eine Liste aller aktiven/gespeicherten Spiele.
 */
app.get("/api/game", (req, res) => {
    const gameList = Object.values(games).map((game) => ({
        id: game.id,
        status: game.status
    }));
    res.json(gameList);
});

/**
 * GET /api/game/:id
 * Liefert den aktuellen Status des Spiels zurück (ohne die Positionen der gegnerischen Schiffe).
 */
app.get("/api/game/:id", (req, res) => {
    const { id } = req.params;
    const game = games[id];

    if (!game) return res.status(404).json({ error: "Spiel nicht gefunden." });
    res.json(getPublicGameState(game));
});

/**
 * POST /api/game/:id/shoot
 * Führt einen Schuss des Spielers aus und liefert die Ergebnisse beider Züge zurück.
 */
app.post("/api/game/:id/shoot", (req, res) => {
    const { id } = req.params;
    const { x, y } = req.body || {};
    const game = games[id];

    if (!game) return res.status(404).json({ error: "Spiel nicht gefunden." });
    if (game.status !== "playing") return res.status(409).json({ error: "Das Spiel ist bereits beendet." });
    if (!isValidCoordinate(x, y)) return res.status(400).json({ error: "Ungültige Koordinate." });
    if (game.playerShots.some((shot) => shot.x === x && shot.y === y)) {
        return res.status(409).json({ error: "Dieses Feld wurde bereits beschossen." });
    }

    const playerResult = shootAt(game.computerShips, x, y);
    game.playerShots.push({ x, y, result: playerResult.result });

    if (game.computerShips.every((ship) => ship.sunk)) {
        game.status = "finished";
        game.winner = "player";
        return res.json({
            ...getPublicGameState(game),
            playerResult,
            computerResult: null
        });
    }

    const availableCoordinates = [];
    for (let computerX = 0; computerX < 10; computerX++) {
        for (let computerY = 0; computerY < 10; computerY++) {
            if (!game.computerShots.some((shot) => shot.x === computerX && shot.y === computerY)) {
                availableCoordinates.push({ x: computerX, y: computerY });
            }
        }
    }

    const computerShot = availableCoordinates[Math.floor(Math.random() * availableCoordinates.length)];
    const computerResult = shootAt(game.playerShips, computerShot.x, computerShot.y);
    game.computerShots.push({ x: computerShot.x, y: computerShot.y, result: computerResult.result });

    if (game.playerShips.every((ship) => ship.sunk)) {
        game.status = "finished";
        game.winner = "computer";
    }

    res.json({
        ...getPublicGameState(game),
        playerResult,
        computerResult: { x: computerShot.x, y: computerShot.y, ...computerResult }
    });
});

function shootAt(ships, x, y) {
    const ship = ships.find((candidate) => candidate.coordinates.some((coordinate) => coordinate.x === x && coordinate.y === y));
    if (!ship) return { result: "miss", hit: false, sunk: false };

    ship.hits++;
    ship.sunk = ship.hits === ship.size;
    return { result: ship.sunk ? "sunk" : "hit", hit: true, sunk: ship.sunk };
}

function getPublicGameState(game) {
    return {
        gameId: game.id,
        status: game.status,
        winner: game.winner,
        playerShips: game.playerShips,
        playerShots: game.playerShots,
        computerShots: game.computerShots
    };
}

app.listen(PORT, () => {
    console.log(`Server läuft unter http://localhost:${PORT}`);
});
