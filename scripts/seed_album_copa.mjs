/**
 * Seed inicial do Álbum da Copa 2026.
 *
 * Popula:
 *  - 48 seleções (todas as classificadas potenciais — pode dar update no grupo depois)
 *  - Pra cada seleção: 1 escudo + 18 cromos genéricos placeholder
 *
 * Idempotente: usa ON CONFLICT (code) DO NOTHING — pode rodar quantas vezes quiser.
 *
 * Uso:
 *   railway run node scripts/seed_album_copa.mjs
 *
 * Quando o user mandar os PNGs/nomes reais dos jogadores, cria outro script
 * (ou roda update direto no banco) pra preencher photo_url e nomes.
 */

import 'dotenv/config';
import dns from 'node:dns/promises';

if (process.env.DATABASE_URL && process.env.DATABASE_PUBLIC_URL) {
    try { await dns.lookup(new URL(process.env.DATABASE_URL).hostname); }
    catch { process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL; }
}
const { pool } = await import('../src/db/pool.js');

// 48 seleções — code (ISO 3 letras FIFA), nome, flag_iso (flagcdn)
const SELECOES = [
    // Sul-América
    ['BRA', 'Brasil',          'br'],
    ['ARG', 'Argentina',       'ar'],
    ['URU', 'Uruguai',         'uy'],
    ['COL', 'Colômbia',        'co'],
    ['EQU', 'Equador',         'ec'],
    ['PAR', 'Paraguai',        'py'],
    // Europa
    ['ALE', 'Alemanha',        'de'],
    ['FRA', 'França',          'fr'],
    ['ESP', 'Espanha',         'es'],
    ['POR', 'Portugal',        'pt'],
    ['ITA', 'Itália',          'it'],
    ['ING', 'Inglaterra',      'gb-eng'],
    ['HOL', 'Holanda',         'nl'],
    ['BEL', 'Bélgica',         'be'],
    ['CRO', 'Croácia',         'hr'],
    ['SUI', 'Suíça',           'ch'],
    ['DIN', 'Dinamarca',       'dk'],
    ['POL', 'Polônia',         'pl'],
    ['SUE', 'Suécia',          'se'],
    ['SER', 'Sérvia',          'rs'],
    ['AUT', 'Áustria',         'at'],
    ['UCR', 'Ucrânia',         'ua'],
    ['REP', 'República Checa', 'cz'],
    ['HUN', 'Hungria',         'hu'],
    // CONCACAF (anfitriões + classificados)
    ['MEX', 'México',          'mx'],
    ['CAN', 'Canadá',          'ca'],
    ['USA', 'Estados Unidos',  'us'],
    ['CRC', 'Costa Rica',      'cr'],
    ['JAM', 'Jamaica',         'jm'],
    ['PAN', 'Panamá',          'pa'],
    // África
    ['MAR', 'Marrocos',        'ma'],
    ['SEN', 'Senegal',         'sn'],
    ['NGA', 'Nigéria',         'ng'],
    ['EGI', 'Egito',           'eg'],
    ['CIV', 'Costa do Marfim', 'ci'],
    ['CMR', 'Camarões',        'cm'],
    ['GHA', 'Gana',            'gh'],
    ['ARG_ALG', 'Argélia',     'dz'],
    // Ásia
    ['JPN', 'Japão',           'jp'],
    ['KOR', 'Coreia do Sul',   'kr'],
    ['IRA', 'Irã',             'ir'],
    ['ARA', 'Arábia Saudita',  'sa'],
    ['QAT', 'Catar',           'qa'],
    ['AUS', 'Austrália',       'au'],
    ['UZB', 'Uzbequistão',     'uz'],
    ['JOR', 'Jordânia',        'jo'],
    // Oceania (geralmente 1 vaga)
    ['NZL', 'Nova Zelândia',   'nz'],
];

// Posições genéricas pros placeholders dos jogadores (1 escudo + 18 jogadores)
const POSICOES_BASE = [
    { ord:  1, pos: 'GOL' }, { ord:  2, pos: 'GOL' }, { ord:  3, pos: 'GOL' },
    { ord:  4, pos: 'ZAG' }, { ord:  5, pos: 'ZAG' }, { ord:  6, pos: 'ZAG' }, { ord:  7, pos: 'ZAG' },
    { ord:  8, pos: 'LAT' }, { ord:  9, pos: 'LAT' },
    { ord: 10, pos: 'MEI' }, { ord: 11, pos: 'MEI' }, { ord: 12, pos: 'MEI' }, { ord: 13, pos: 'MEI' },
    { ord: 14, pos: 'ATA' }, { ord: 15, pos: 'ATA' }, { ord: 16, pos: 'ATA' }, { ord: 17, pos: 'ATA' }, { ord: 18, pos: 'ATA' },
];

(async () => {
    try {
        let selInseridas = 0, cromosInseridos = 0;

        for (let i = 0; i < SELECOES.length; i++) {
            const [code, name, flagIso] = SELECOES[i];
            const ordem = i + 1;

            const { rows } = await pool.query(`
                INSERT INTO album_selecoes (code, name, flag_iso, ordem)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (code) DO UPDATE SET
                    name = EXCLUDED.name,
                    flag_iso = EXCLUDED.flag_iso,
                    ordem = EXCLUDED.ordem
                RETURNING id, (xmax = 0) AS inserted
            `, [code, name, flagIso, ordem]);
            const selecaoId = rows[0].id;
            if (rows[0].inserted) selInseridas++;

            // Escudo (cromo #00)
            const escudoCode = `${code}-00`;
            const r1 = await pool.query(`
                INSERT INTO album_cromos (code, selecao_id, ordem, tipo, nome, raridade)
                VALUES ($1, $2, 0, 'escudo', $3, 'rara')
                ON CONFLICT (code) DO NOTHING
                RETURNING id
            `, [escudoCode, selecaoId, `Escudo ${name}`]);
            if (r1.rows.length) cromosInseridos++;

            // 18 jogadores placeholder (preenche depois com nome real)
            for (const p of POSICOES_BASE) {
                const cromoCode = `${code}-${String(p.ord).padStart(2, '0')}`;
                const nomePlaceholder = `${p.pos} #${p.ord} — ${name}`;
                const r2 = await pool.query(`
                    INSERT INTO album_cromos (code, selecao_id, ordem, tipo, nome, posicao, raridade)
                    VALUES ($1, $2, $3, 'jogador', $4, $5, 'comum')
                    ON CONFLICT (code) DO NOTHING
                    RETURNING id
                `, [cromoCode, selecaoId, p.ord, nomePlaceholder, p.pos]);
                if (r2.rows.length) cromosInseridos++;
            }

            if ((i + 1) % 10 === 0) console.log(`[seed-album]  ${i + 1}/${SELECOES.length} seleções...`);
        }

        console.log('\n[seed-album] ============= RESUMO =============');
        console.log(`  Seleções inseridas/atualizadas: ${SELECOES.length}`);
        console.log(`  (Selecoes novas:                ${selInseridas})`);
        console.log(`  Cromos novos:                   ${cromosInseridos}`);

        // Total final no banco
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
