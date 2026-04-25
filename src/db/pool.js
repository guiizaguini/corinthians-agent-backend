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
    // 25 conexões — suficiente pra 200-500 users ativos no plano Hobby do Railway.
    // Railway PG Hobby permite até ~100 conexões simultâneas, então estamos bem dentro do limite.
    max: parseInt(process.env.PG_POOL_MAX || '25'),
    idleTimeoutMillis: 30_000,
    // Timeout pra obter conexão do pool — evita request ficar pendurado infinitamente
    connectionTimeoutMillis: 5_000,
    // Timeout de query — mata queries que demoram > 30s (segurança)
    statement_timeout: 30_000,
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
