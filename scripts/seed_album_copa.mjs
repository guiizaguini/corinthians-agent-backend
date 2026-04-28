/**
 * Seed do Álbum FIGURINHAS COPA 2026 (Panini).
 *
 * Estrutura REAL do álbum (conforme prints + correção pelo Gabriel):
 *  - 12 grupos (A-L) com 4 seleções cada = 48 seleções
 *  - 20 cromos numerados (XXX-01 a XXX-20) por seleção = 960
 *  - Categoria FWC History (FIFA World Cup): cromos 09-14 (6 cromos)
 *  - Categoria Coca-Cola: 14 cromos (CC-01 a CC-14)
 *  Total: 48*20 + 6 + 14 = 980 cromos
 *
 * Idempotente: ON CONFLICT (code) DO NOTHING. Pode rodar quantas vezes quiser
 * sem duplicar. Pra ATUALIZAR nomes/photos depois, faz UPDATE direto.
 *
 * Uso:
 *   railway run node scripts/seed_album_copa.mjs
 */

import 'dotenv/config';
import dns from 'node:dns/promises';

if (process.env.DATABASE_URL && process.env.DATABASE_PUBLIC_URL) {
    try { await dns.lookup(new URL(process.env.DATABASE_URL).hostname); }
    catch { process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL; }
}
const { pool } = await import('../src/db/pool.js');

// ============================================================
// 12 grupos com 4 seleções cada — formato [code, name, flag_iso]
// Ordem exata dos prints do álbum (Grupo A → L).
// ============================================================
const GRUPOS = {
    A: [
        ['MEX', 'México',          'mx'],
        ['RSA', 'África do Sul',   'za'],
        ['KOR', 'Coreia do Sul',   'kr'],
        ['CZE', 'República Tcheca','cz'],
    ],
    B: [
        ['CAN', 'Canadá',          'ca'],
        ['BIH', 'Bósnia',          'ba'],
        ['QAT', 'Catar',           'qa'],
        ['SUI', 'Suíça',           'ch'],
    ],
    C: [
        ['BRA', 'Brasil',          'br'],
        ['MAR', 'Marrocos',        'ma'],
        ['HAI', 'Haiti',           'ht'],
        ['SCO', 'Escócia',         'gb-sct'],
    ],
    D: [
        ['USA', 'Estados Unidos',  'us'],
        ['PAR', 'Paraguai',        'py'],
        ['AUS', 'Austrália',       'au'],
        ['TUR', 'Turquia',         'tr'],
    ],
    E: [
        ['GER', 'Alemanha',        'de'],
        ['CUW', 'Curaçao',         'cw'],
        ['CIV', 'Costa do Marfim', 'ci'],
        ['ECU', 'Equador',         'ec'],
    ],
    F: [
        ['NED', 'Holanda',         'nl'],
        ['JPN', 'Japão',           'jp'],
        ['SWE', 'Suécia',          'se'],
        ['TUN', 'Tunísia',         'tn'],
    ],
    G: [
        ['BEL', 'Bélgica',         'be'],
        ['EGY', 'Egito',           'eg'],
        ['IRN', 'Irã',             'ir'],
        ['NZL', 'Nova Zelândia',   'nz'],
    ],
    H: [
        ['ESP', 'Espanha',         'es'],
        ['CPV', 'Cabo Verde',      'cv'],
        ['KSA', 'Arábia Saudita',  'sa'],
        ['URU', 'Uruguai',         'uy'],
    ],
    I: [
        ['FRA', 'França',          'fr'],
        ['SEN', 'Senegal',         'sn'],
        ['IRQ', 'Iraque',          'iq'],
        ['NOR', 'Noruega',         'no'],
    ],
    J: [
        ['ARG', 'Argentina',       'ar'],
        ['ALG', 'Argélia',         'dz'],
        ['AUT', 'Áustria',         'at'],
        ['JOR', 'Jordânia',        'jo'],
    ],
    K: [
        ['POR', 'Portugal',        'pt'],
        ['COD', 'Congo',           'cd'],
        ['UZB', 'Uzbequistão',     'uz'],
        ['COL', 'Colômbia',        'co'],
    ],
    L: [
        ['ENG', 'Inglaterra',      'gb-eng'],
        ['CRO', 'Croácia',         'hr'],
        ['GHA', 'Gana',            'gh'],
        ['PAN', 'Panamá',          'pa'],
    ],
};

(async () => {
    try {
        let selsTouched = 0, cromosInseridos = 0;

        // Limpa cromos da estrutura antiga (XXX-00 era "escudo" no seed v1).
        // Hoje cada seleção tem só os 20 numerados — sem cromo 00.
        const { rowCount: deleted00 } = await pool.query(`
            DELETE FROM album_cromos WHERE code LIKE '%-00'
        `);
        if (deleted00) console.log(`[seed-album] Removidos ${deleted00} cromos antigos com sufixo -00 (escudos do seed v1)`);

        // Ordem do álbum: Grupos A-L (1-48), depois FWC History (49), Coca-Cola (50)
        let ordemSel = 1;

        // ============== Grupos A-L ==============
        for (const [letra, selecoes] of Object.entries(GRUPOS)) {
            for (const [code, name, flagIso] of selecoes) {
                // Insert/update da seleção
                const { rows } = await pool.query(`
                    INSERT INTO album_selecoes (code, name, flag_iso, grupo, ordem)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (code) DO UPDATE SET
                        name = EXCLUDED.name,
                        flag_iso = EXCLUDED.flag_iso,
                        grupo = EXCLUDED.grupo,
                        ordem = EXCLUDED.ordem
                    RETURNING id
                `, [code, name, flagIso, letra, ordemSel++]);
                const selecaoId = rows[0].id;
                selsTouched++;

                // 20 cromos numerados pra essa seleção
                for (let n = 1; n <= 20; n++) {
                    const cromoCode = `${code}-${String(n).padStart(2, '0')}`;
                    // Nome placeholder — será atualizado depois com nome real do jogador
                    const nomePlaceholder = `${name} #${n}`;
                    const r = await pool.query(`
                        INSERT INTO album_cromos (code, selecao_id, ordem, tipo, nome, raridade)
                        VALUES ($1, $2, $3, 'jogador', $4, 'comum')
                        ON CONFLICT (code) DO NOTHING
                        RETURNING id
                    `, [cromoCode, selecaoId, n, nomePlaceholder]);
                    if (r.rows.length) cromosInseridos++;
                }
            }
        }

        // ============== FWC History (FIFA World Cup History) ==============
        // Cromos comemorativos de copas anteriores: códigos 9-14 (6 cromos)
        {
            const { rows } = await pool.query(`
                INSERT INTO album_selecoes (code, name, flag_iso, grupo, ordem)
                VALUES ('FWC', 'FIFA World Cup History', NULL, NULL, $1)
                ON CONFLICT (code) DO UPDATE SET
                    name = EXCLUDED.name,
                    ordem = EXCLUDED.ordem
                RETURNING id
            `, [ordemSel++]);
            const fwcId = rows[0].id;
            selsTouched++;
            // Cromos FWC-09 a FWC-14 (rara/legend)
            for (let n = 9; n <= 14; n++) {
                const code = `FWC-${String(n).padStart(2, '0')}`;
                const r = await pool.query(`
                    INSERT INTO album_cromos (code, selecao_id, ordem, tipo, nome, raridade)
                    VALUES ($1, $2, $3, 'legenda', $4, 'legend')
                    ON CONFLICT (code) DO NOTHING
                    RETURNING id
                `, [code, fwcId, n, `FIFA World Cup History #${n}`]);
                if (r.rows.length) cromosInseridos++;
            }
        }

        // ============== Coca-Cola (14 cromos especiais) ==============
        {
            const { rows } = await pool.query(`
                INSERT INTO album_selecoes (code, name, flag_iso, grupo, ordem)
                VALUES ('CCO', 'Figurinhas da Coca-Cola', NULL, NULL, $1)
                ON CONFLICT (code) DO UPDATE SET
                    name = EXCLUDED.name,
                    ordem = EXCLUDED.ordem
                RETURNING id
            `, [ordemSel++]);
            const ccoId = rows[0].id;
            selsTouched++;
            for (let n = 1; n <= 14; n++) {
                const code = `CC-${String(n).padStart(2, '0')}`;
                const r = await pool.query(`
                    INSERT INTO album_cromos (code, selecao_id, ordem, tipo, nome, raridade)
                    VALUES ($1, $2, $3, 'especial', $4, 'especial')
                    ON CONFLICT (code) DO NOTHING
                    RETURNING id
                `, [code, ccoId, n, `Coca-Cola CC${n}`]);
                if (r.rows.length) cromosInseridos++;
            }
        }

        console.log('\n[seed-album] ============= RESUMO =============');
        console.log(`  Seleções inseridas/atualizadas: ${selsTouched}`);
        console.log(`  Cromos novos inseridos:         ${cromosInseridos}`);

        const { rows: tot } = await pool.query(`
            SELECT COUNT(DISTINCT s.id)::int AS sels, COUNT(c.id)::int AS cromos
            FROM album_selecoes s LEFT JOIN album_cromos c ON c.selecao_id = s.id
        `);
        console.log(`\n[seed-album] Total no banco: ${tot[0].sels} seleções, ${tot[0].cromos} cromos`);
        console.log('[seed-album] OK');
    } catch (err) {
        console.error('[seed-album] ERRO:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
})();
