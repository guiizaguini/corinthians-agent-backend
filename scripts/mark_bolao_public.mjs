/**
 * Marca bolão(ões) como público(s) — qualquer usuário pode entrar sem invite_code.
 *
 * Por default marca o ID 1 (bolão "oficial" da Copa). Aceita IDs extras via argv.
 *
 * Uso:
 *   railway run node scripts/mark_bolao_public.mjs           # só ID=1
 *   railway run node scripts/mark_bolao_public.mjs 1 5 12    # IDs custom
 *
 * Idempotente: rodar de novo só reafirma o flag = TRUE.
 */

import 'dotenv/config';
import dns from 'node:dns/promises';

async function maybeSwapToPublicUrl() {
    const url = process.env.DATABASE_URL;
    const publicUrl = process.env.DATABASE_PUBLIC_URL;
    if (!url || !publicUrl) return;
    try {
        await dns.lookup(new URL(url).hostname);
    } catch {
        console.log('[mark-public] usando DATABASE_PUBLIC_URL');
        process.env.DATABASE_URL = publicUrl;
    }
}

await maybeSwapToPublicUrl();
const { pool } = await import('../src/db/pool.js');

const ids = process.argv.slice(2).map(Number).filter(Number.isInteger);
const targets = ids.length ? ids : [1];

(async () => {
    try {
        // Garante que a coluna existe (no caso de schema antigo)
        await pool.query(`
            ALTER TABLE boloes ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE
        `);

        // Marca os bolões alvo como público
        const { rows } = await pool.query(`
            UPDATE boloes
            SET is_public = TRUE
            WHERE id = ANY($1::int[])
            RETURNING id, name, is_public
        `, [targets]);

        if (!rows.length) {
            console.log(`[mark-public] Nenhum bolão encontrado pros IDs: ${targets.join(', ')}`);
            process.exit(1);
        }

        console.log('[mark-public] bolões marcados como públicos:');
        for (const b of rows) {
            console.log(`  - #${b.id} "${b.name}" → is_public=${b.is_public}`);
        }

        // Mostra estado geral dos públicos
        const { rows: all } = await pool.query(`
            SELECT b.id, b.name,
                   (SELECT COUNT(*)::int FROM bolao_members WHERE bolao_id = b.id) AS members
            FROM boloes b
            WHERE b.is_public = TRUE
            ORDER BY b.id
        `);
        console.log(`\n[mark-public] Total de bolões públicos no banco: ${all.length}`);
        for (const b of all) console.log(`  #${b.id} "${b.name}" — ${b.members} membros`);
    } catch (err) {
        console.error('[mark-public] ERRO:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
})();
