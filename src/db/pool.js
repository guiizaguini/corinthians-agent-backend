import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

/**
 * Pool único para toda a aplicação.
 * Railway injeta DATABASE_URL automaticamente quando você provisiona um Postgres.
 */
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('railway')
        ? { rejectUnauthorized: false }
        : false,
    max: 10,
    idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
    console.error('[pg] erro inesperado no pool:', err);
});

export async function query(text, params) {
    const start = Date.now();
    const res = await pool.query(text, params);
    const ms = Date.now() - start;
    if (process.env.LOG_QUERIES === '1') {
        console.log(`[pg] ${ms}ms | ${text.substring(0, 80)}`);
    }
    return res;
}
