
const sqlite = require('better-sqlite3');
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sqliteDb = new sqlite('data/asistencias.db');
const pgUrl = process.env.DATABASE_URL;

if (!pgUrl) {
    console.error('DATABASE_URL is missing in environment variables');
    process.exit(1);
}

const sql = neon(pgUrl);

function sanitizeDate(dateString) {
    if (!dateString) return null;
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString; // Let it fail or try to fix if needed
    
    const y = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    const d = parseInt(parts[2]);
    
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
        return dateString;
    }
    
    // Fix invalid days (like June 31 -> June 30)
    const lastDay = new Date(y, m, 0).getDate();
    const fixedDay = Math.min(d, lastDay);
    return `${y}-${m.toString().padStart(2, '0')}-${fixedDay.toString().padStart(2, '0')}`;
}

async function migrate() {
    console.log('--- STARTING SANITIZED MIGRATION TO NEON ---');

    try {
        // 1. Create Tables
        console.log('Creating tables...');
        await sql.query(`
            CREATE TABLE IF NOT EXISTS alumnos (
                id SERIAL PRIMARY KEY,
                nombre TEXT,
                apellido TEXT,
                grupo TEXT
            )`);
        await sql.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE,
                password TEXT,
                rol TEXT
            )`);
        await sql.query(`
            CREATE TABLE IF NOT EXISTS asistencias (
                id SERIAL PRIMARY KEY,
                alumno_id INTEGER REFERENCES alumnos(id),
                fecha DATE,
                presente INTEGER,
                usuario_id INTEGER REFERENCES usuarios(id)
            )`);

        // 2. Migrate Alumnos
        console.log('Migrating alumnos...');
        const alumnos = sqliteDb.prepare('SELECT * FROM alumnos').all();
        for (const a of alumnos) {
            await sql.query('INSERT INTO alumnos (id, nombre, apellido, grupo) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, apellido = EXCLUDED.apellido, grupo = EXCLUDED.grupo', [a.id, a.nombre, a.apellido, a.grupo]);
        }

        // 3. Migrate Usuarios
        console.log('Migrating usuarios...');
        const usuarios = sqliteDb.prepare('SELECT * FROM usuarios').all();
        for (const u of usuarios) {
            await sql.query('INSERT INTO usuarios (id, username, password, rol) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, password = EXCLUDED.password, rol = EXCLUDED.rol', [u.id, u.username, u.password, u.rol]);
        }

        // 4. Migrate Asistencias (Batching + Sanitization)
        console.log('Migrating asistencias (Batching + Sanitization)...');
        const asistencias = sqliteDb.prepare('SELECT * FROM asistencias').all();
        const batchSize = 100;
        for (let i = 0; i < asistencias.length; i += batchSize) {
            const batch = asistencias.slice(i, i + batchSize);
            const placeholders = batch.map((_, idx) => `($${idx * 5 + 1}, $${idx * 5 + 2}, $${idx * 5 + 3}, $${idx * 5 + 4}, $${idx * 5 + 5})`).join(',');
            const values = batch.flatMap(asis => [asis.id, asis.alumno_id, sanitizeDate(asis.fecha), asis.presente, asis.usuario_id]);
            
            await sql.query(`INSERT INTO asistencias (id, alumno_id, fecha, presente, usuario_id) VALUES ${placeholders} ON CONFLICT (id) DO NOTHING`, values);
            if (i % 1000 === 0) console.log(`Migrated ${i + batch.length} / ${asistencias.length} asistencias`);
        }

        // 5. Reset Serial Sequences
        console.log('Resetting sequences...');
        await sql.query("SELECT setval('alumnos_id_seq', (SELECT MAX(id) FROM alumnos))");
        await sql.query("SELECT setval('usuarios_id_seq', (SELECT MAX(id) FROM usuarios))");
        await sql.query("SELECT setval('asistencias_id_seq', (SELECT MAX(id) FROM asistencias))");

        console.log('--- MIGRATION COMPLETE ---');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        sqliteDb.close();
    }
}

migrate();
