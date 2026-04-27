
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
    console.log('Starting Neon migration...');
    try {
        await sql`ALTER TABLE asistencias ADD COLUMN IF NOT EXISTS observacion TEXT`;
        console.log('✅ Column observacion added or already exists in Neon');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
}

migrate();
