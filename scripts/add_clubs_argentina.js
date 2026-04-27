#!/usr/bin/env node
/**
 * Insere/atualiza River Plate e Boca Juniors na tabela `clubs`.
 * Idempotente — pode rodar quantas vezes quiser.
 *
 * Uso:
 *   npm run migrate:argentina
 *   ou
 *   node scripts/add_clubs_argentina.js
 *
 * Em produção (Railway):
 *   railway run npm run migrate:argentina
 */
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
if (!dbUrl) {
    console.error('[argentina] DATABASE_URL não definida');
    process.exit(1);
}

const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('railway') || dbUrl.includes('amazonaws')
        ? { rejectUnauthorized: false }
        : undefined,
});

const CLUBS = [
    {
        slug: 'river-plate',
        name: 'River Plate',
        short_name: 'Millonario',
        primary_color: '#e53e3e',  // espelha SPFC
        secondary_color: '#000000',
    },
    {
        slug: 'boca-juniors',
        name: 'Boca Juniors',
        short_name: 'Xeneize',
        primary_color: '#3b82f6',  // espelha Cruzeiro
        secondary_color: '#ffffff',
    },
];

async function main() {
    const client = await pool.connect();
    try {
        for (const c of CLUBS) {
            const { rowCount } = await client.query(
                `INSERT INTO clubs (slug, name, short_name, primary_color, secondary_color)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (slug) DO UPDATE SET
                     name = EXCLUDED.name,
                     short_name = EXCLUDED.short_name,
                     primary_color = EXCLUDED.primary_color,
                     secondary_color = EXCLUDED.secondary_color`,
                [c.slug, c.name, c.short_name, c.primary_color, c.secondary_color]
            );
            console.log(`[argentina] ${c.slug}: ${rowCount === 1 ? 'OK' : 'noop'}`);
        }
        const { rows } = await client.query(
            `SELECT slug, name FROM clubs WHERE slug IN ('river-plate','boca-juniors') ORDER BY name`
        );
        console.log('[argentina] estado final:', rows);
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch((err) => {
    console.error('[argentina] ERRO:', err.message);
    process.exit(1);
});
