
import { neon } from '@neondatabase/serverless';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.DATABASE_URL !== undefined;

const DIALECT = isProduction ? {
    NOW: 'CURRENT_DATE',
    START_OF_MONTH: "date_trunc('month', CURRENT_DATE)::DATE"
} : {
    NOW: "date('now')",
    START_OF_MONTH: "date('now', 'start of month')"
};

let db;

if (isProduction) {
    const sql = neon(process.env.DATABASE_URL, { fullResults: true });
    db = {
        isAsync: true,
        prepare: (query) => {
            let finalQuery = query
                .replace(/DIALECT_NOW/g, DIALECT.NOW)
                .replace(/DIALECT_START_OF_MONTH/g, DIALECT.START_OF_MONTH);

            let count = 0;
            const pgQuery = finalQuery.replace(/\?/g, () => `$${++count}`);
            
            return {
                get: async (...params) => {
                    const res = await sql.query(pgQuery, params);
                    return res.rows[0];
                },
                all: async (...params) => {
                    const res = await sql.query(pgQuery, params);
                    return res.rows;
                },
                run: async (...params) => {
                    const res = await sql.query(pgQuery, params);
                    return { lastInsertRowid: res.rows[0]?.id || null, changes: res.rowCount };
                }
            };
        },
        transaction: (fn) => async (data) => {
            return await fn(data);
        }
    };
} else {
    // We wrap this in a way that Vercel's bundler hopefully ignores it or it doesn't crash the startup
    const initSqlite = async () => {
        const sqlite = (await import('better-sqlite3')).default;
        const dbPath = path.join(__dirname, 'data', 'asistencias.db');
        const sqliteDb = new sqlite(dbPath);
        return {
            isAsync: false,
            prepare: (query) => {
                let finalQuery = query
                    .replace(/DIALECT_NOW/g, DIALECT.NOW)
                    .replace(/DIALECT_START_OF_MONTH/g, DIALECT.START_OF_MONTH);
                    
                const stmt = sqliteDb.prepare(finalQuery);
                return {
                    get: async (...params) => stmt.get(...params),
                    all: async (...params) => stmt.all(...params),
                    run: async (...params) => {
                        const res = stmt.run(...params);
                        return { lastInsertRowid: res.lastInsertRowid, changes: res.changes };
                    }
                };
            },
            transaction: (fn) => (data) => sqliteDb.transaction(fn)(data)
        };
    };
    
    // For local dev, we can use top-level await
    db = await initSqlite();
}

export default db;
export { isProduction };
