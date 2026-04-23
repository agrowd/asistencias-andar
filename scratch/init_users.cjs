const sqlite = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'asistencias.db');
const db = new sqlite(dbPath);

console.log('Initializing DB at:', dbPath);

db.prepare("CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, rol TEXT)").run();

const hash = bcrypt.hashSync('admin123', 10);
try {
    db.prepare("INSERT INTO usuarios (username, password, rol) VALUES (?, ?, ?)").run('admin', hash, 'admin');
    console.log('Admin user created successfully');
} catch (e) {
    console.log('Admin user already exists');
}

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Current tables:', tables);
