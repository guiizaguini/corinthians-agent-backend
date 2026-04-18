/**
 * Roda as migrações (schema + seed).
 * Uso:
 *   npm run migrate         -> só o schema
 *   npm run migrate seed    -> schema + seed
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db/pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.resolve(__dirname, '..', 'sql');

const withSeed = process.argv.includes('seed');
const files = ['01_schema.sql'];
if (withSeed) files.push('02_seed.sql');

(async () => {
    try {
        for (const f of files) {
            const sql = fs.readFileSync(path.join(sqlDir, f), 'utf-8');
            console.log(`[migrate] aplicando ${f}...`);
            await pool.query(sql);
            console.log(`[migrate] ${f} OK`);
        }
        const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM jogos');
        console.log(`[migrate] total de jogos no banco: ${rows[0].n}`);
    } catch (err) {
        console.error('[migrate] ERRO:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
})();
