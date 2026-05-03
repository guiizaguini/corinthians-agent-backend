/**
 * Fix: garante que a secao ESPECIAIS do album (FWC / "FIFA World Cup
 * History") tem TODOS os 19 cromos (FWC-01 a FWC-19), nao soh os 6
 * que tinham antes (FWC-09 a FWC-14).
 *
 * Estrategia:
 *  1. Acha ou cria a selecao 'Especiais' (busca por code 'FWC' ou 'ESP'
 *     ou name LIKE '%world cup%' / '%especiais%').
 *  2. UPSERT FWC-01..FWC-19 + '00' (cover) com ON CONFLICT UPDATE pra
 *     MOVER cromos que estejam em outras selecoes pra essa.
 *  3. Limpa selecoes orfas (que ficaram sem cromos depois do move).
 *
 * Idempotente — pode rodar quantas vezes quiser.
 *
 * Uso:
 *   railway run node scripts/fix_album_especiais.mjs
 */

import 'dotenv/config';
import dns from 'node:dns/promises';

if (process.env.DATABASE_URL && process.env.DATABASE_PUBLIC_URL) {
    try { await dns.lookup(new URL(process.env.DATABASE_URL).hostname); }
    catch { process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL; }
}
const { pool } = await import('../src/db/pool.js');

(async () => {
    try {
        // 1. Acha a selecao canonica "Especiais" (preferindo code FWC se existir)
        let { rows: existing } = await pool.query(`
            SELECT id, code, name FROM album_selecoes
            WHERE (code = 'FWC' OR code = 'ESP'
                   OR LOWER(name) LIKE '%fifa world cup%'
                   OR LOWER(name) LIKE '%especiais%')
              AND (grupo IS NULL OR grupo = '')
            ORDER BY
                CASE WHEN code = 'FWC' THEN 1
                     WHEN code = 'ESP' THEN 2
                     ELSE 3 END,
                id ASC
            LIMIT 1
        `);

        let espId;
        if (existing.length) {
            espId = existing[0].id;
            console.log(`[fix-especiais] Usando selecao existente: id=${espId}, code=${existing[0].code}, name="${existing[0].name}"`);
        } else {
            const { rows } = await pool.query(`
                INSERT INTO album_selecoes (code, name, flag_iso, grupo, ordem)
                VALUES ('FWC', 'FIFA World Cup History', NULL, NULL, 49)
                RETURNING id
            `);
            espId = rows[0].id;
            console.log(`[fix-especiais] Criou nova selecao: id=${espId}`);
        }

        // 2. UPSERT '00' (capa) — opcional, alguns users gostam de ter
        await pool.query(`
            INSERT INTO album_cromos (code, selecao_id, ordem, tipo, nome, raridade)
            VALUES ('00', $1, 0, 'especial', 'Capa do Album', 'especial')
            ON CONFLICT (code) DO UPDATE SET
                selecao_id = EXCLUDED.selecao_id,
                ordem = EXCLUDED.ordem
        `, [espId]);
        console.log(`[fix-especiais] '00' (capa) -> selecao ${espId}`);

        // 3. UPSERT FWC-01..FWC-19 — move pra Especiais qualquer um que
        //    esteja em outra selecao
        for (let n = 1; n <= 19; n++) {
            const code = `FWC-${String(n).padStart(2, '0')}`;
            await pool.query(`
                INSERT INTO album_cromos (code, selecao_id, ordem, tipo, nome, raridade)
                VALUES ($1, $2, $3, 'legenda', $4, 'legend')
                ON CONFLICT (code) DO UPDATE SET
                    selecao_id = EXCLUDED.selecao_id,
                    ordem = EXCLUDED.ordem
            `, [code, espId, n, `FIFA World Cup History #${n}`]);
        }
        console.log(`[fix-especiais] FWC-01..FWC-19 (19 cromos) -> selecao ${espId}`);

        // 4. Atualiza nome da selecao pra ficar consistente
        await pool.query(`
            UPDATE album_selecoes
            SET name = 'FIFA World Cup History',
                ordem = COALESCE(ordem, 49)
            WHERE id = $1
        `, [espId]);

        // 5. Limpa selecoes orfas (sem cromos) — provavel "Selecoes Especiais"
        //    que ficou vazia depois do move
        const { rows: orfas } = await pool.query(`
            SELECT s.id, s.code, s.name
            FROM album_selecoes s
            LEFT JOIN album_cromos c ON c.selecao_id = s.id
            WHERE c.id IS NULL
              AND s.id <> $1
              AND (s.grupo IS NULL OR s.grupo = '')
        `, [espId]);
        for (const o of orfas) {
            await pool.query('DELETE FROM album_selecoes WHERE id = $1', [o.id]);
            console.log(`[fix-especiais] Removida selecao orfa: id=${o.id}, code=${o.code}, name="${o.name}"`);
        }

        // 6. Verificacao final
        const { rows: stats } = await pool.query(`
            SELECT s.id, s.code, s.name, COUNT(c.id)::int AS cromos
            FROM album_selecoes s
            LEFT JOIN album_cromos c ON c.selecao_id = s.id
            WHERE s.grupo IS NULL OR s.grupo = ''
            GROUP BY s.id, s.code, s.name
            ORDER BY s.ordem ASC, s.id ASC
        `);
        console.log('\n[fix-especiais] ============= ESTADO FINAL =============');
        for (const s of stats) {
            console.log(`  id=${s.id}, code=${s.code}, name="${s.name}", cromos=${s.cromos}`);
        }

        const { rows: tot } = await pool.query('SELECT COUNT(*)::int AS n FROM album_cromos');
        console.log(`\n[fix-especiais] Total cromos no album: ${tot[0].n}`);
        console.log('[fix-especiais] OK');
    } catch (err) {
        console.error('[fix-especiais] ERRO:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
})();
