
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

async function migrate() {
    console.log('--- STARTING MIGRATION TO NEON ---');

    try {
        // 1. Create Tables
        console.log('Creating tables...');
        await sql(`
            CREATE TABLE IF NOT EXISTS alumnos (
                id SERIAL PRIMARY KEY,
                nombre TEXT,
                apellido TEXT,
                grupo TEXT
            );
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE,
                password TEXT,
                rol TEXT
            );
            CREATE TABLE IF NOT EXISTS asistencias (
                id SERIAL PRIMARY KEY,
                alumno_id INTEGER REFERENCES alumnos(id),
                fecha DATE,
                presente INTEGER,
                usuario_id INTEGER REFERENCES usuarios(id)
            );
        `);

        // 2. Migrate Alumnos
        console.log('Migrating alumnos...');
        const alumnos = sqliteDb.prepare('SELECT * FROM alumnos').all();
        for (const a of alumnos) {
            await sql('INSERT INTO alumnos (id, nombre, apellido, grupo) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, apellido = EXCLUDED.apellido, grupo = EXCLUDED.grupo', [a.id, a.nombre, a.apellido, a.grupo]);
        }

        // 3. Migrate Usuarios
        console.log('Migrating usuarios...');
        const usuarios = sqliteDb.prepare('SELECT * FROM usuarios').all();
        for (const u of usuarios) {
            await sql('INSERT INTO usuarios (id, username, password, rol) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, password = EXCLUDED.password, rol = EXCLUDED.rol', [u.id, u.username, u.password, u.rol]);
        }

        // 4. Migrate Asistencias
        console.log('Migrating asistencias...');
        const asistencias = sqliteDb.prepare('SELECT * FROM asistencias').all();
        for (const asis of asistencias) {
            await sql('INSERT INTO asistencias (id, alumno_id, fecha, presente, usuario_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING', [asis.id, asis.alumno_id, asis.fecha, asis.presente, asis.usuario_id]);
        }

        // 5. Reset Serial Sequences
        console.log('Resetting sequences...');
        await sql("SELECT setval('alumnos_id_seq', (SELECT MAX(id) FROM alumnos))");
        await sql("SELECT setval('usuarios_id_seq', (SELECT MAX(id) FROM usuarios))");
        await sql("SELECT setval('asistencias_id_seq', (SELECT MAX(id) FROM asistencias))");

        console.log('--- MIGRATION COMPLETE ---');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        sqliteDb.close();
    }
}

migrate();
