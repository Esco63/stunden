const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/database.sqlite');

// Benutzer-Tabelle (Admins & Mitarbeiter)
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user' -- 'admin' oder 'user'
  )
`);

// Stunden-Einträge-Tabelle
db.run(`
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT,
    hours REAL,
    description TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

console.log("Setup abgeschlossen. Tabellen wurden erstellt.");
db.close();
