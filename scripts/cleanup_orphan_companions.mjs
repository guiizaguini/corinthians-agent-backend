/**
 * Limpa companion links órfãos: linhas em `attendance_companions`
 * onde o `companion_user_id` NÃO tem attendance própria pro mesmo jogo.
 *
 * Cenário: usuário deleta a attendance dele, mas continua aparecendo como
 * companion em attendances de outros (problema antes do fix em ac59887).
 *
 * Uso:
 *   railway run node scripts/cleanup_orphan_companions.mjs
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
        console.log('[cleanup] usando DATABASE_PUBLIC_URL');
        process.env.DATABASE_URL = publicUrl;
    }
}

await maybeSwapToPublicUrl();
const { pool } = await import('../src/db/pool.js');

(async () => {
    try {
        // Lista os links órfãos antes de deletar (pra log)
        const { rows: preview } = await pool.query(`
            SELECT
                ac.attendance_id,
                ac.companion_user_id,
                ac.status,
                a.game_id,
                a.user_id AS owner_id,
                ow.username AS owner_username,
                cu.username AS companion_username
            FROM attendance_companions ac
            JOIN attendances a ON a.id = ac.attendance_id
            JOIN users ow ON ow.id = a.user_id
            JOIN users cu ON cu.id = ac.companion_user_id
            WHERE NOT EXISTS (
                SELECT 1 FROM attendances a2
                WHERE a2.user_id = ac.companion_user_id
                  AND a2.game_id = a.game_id
            )
        `);

        if (!preview.length) {
            console.log('[cleanup] Nenhum companion órfão encontrado.');
            return;
        }

        console.log(`[cleanup] ${preview.length} links órfãos:`);
        for (const r of preview.slice(0, 20)) {
            console.log(`  - attendance#${r.attendance_id} (owner @${r.owner_username}, game ${r.game_id})`);
            console.log(`      companion: @${r.companion_username} [${r.status}] — sem attendance própria`);
        }
        if (preview.length > 20) console.log(`  ...e mais ${preview.length - 20}`);

        // Deleta
        const { rowCount } = await pool.query(`
            DELETE FROM attendance_companions ac
            USING attendances a
            WHERE ac.attendance_id = a.id
              AND NOT EXISTS (
                  SELECT 1 FROM attendances a2
                  WHERE a2.user_id = ac.companion_user_id
                    AND a2.game_id = a.game_id
              )
        `);
        console.log(`\n[cleanup] ${rowCount} links removidos. OK.`);
    } catch (err) {
        console.error('[cleanup] ERRO:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
})();
