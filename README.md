# Schiffeversenken - Klausurprojekt

Dieses Verzeichnis enthält die Ausgangsdateien für den praktischen Teil der Klausur.

## Projektstruktur

- `frontend/`: Enthält die Client-Dateien
  - `index.html`: Das HTML-Gerüst (Teil A)
  - `style.css`: Das Stylesheet für das Grid-Layout und die Spielfelder (Teil B)
  - `battleship.js`: Die Spiel-Logik im Client (Teil C und Teil E)
- `backend/`: Enthält den Express-Server
  - `package.json`: Projektkonfiguration und Abhängigkeiten (Express, Nodemon)
  - `server.js`: Der Node.js/Express-Server mit RESTful API (Teil D)

## Installation und Ausführung

1. Navigieren Sie in den Ordner `backend/`:
   ```bash
   cd backend
   ```
2. Installieren Sie die Abhängigkeiten:
   ```bash
   npm install
   ```
3. Starten Sie den Server im Entwicklungsmodus (mit automatischem Hot-Reload bei Dateiänderungen):
   ```bash
   npm run dev
   ```
   Oder im normalen Modus:
   ```bash
   npm start
   ```
4. Öffnen Sie Ihren Browser und rufen Sie die Anwendung auf:
   [http://localhost:3000](http://localhost:3000)
