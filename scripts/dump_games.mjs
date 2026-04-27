/**
 * Dump dos games pra validação/enriquecimento por agente de IA.
 *
 * Uso:
 *   railway run node scripts/dump_games.mjs > games.json
 *   railway run node scripts/dump_games.mjs --club=corinthians > corinthians.json
 *   railway run node scripts/dump_games.mjs --club=corinthians --year=2026 --full > 2026.json
 *
 * Filtros opcionais:
 *   --club=<slug>   só os games do clube (ex: corinthians, palmeiras)
 *   --year=<ano>    só de um ano
 *   --full          inclui TODOS os campos + indica o que falta enriquecer
 *                   (autores_gols, gols_texto, publico_total, estadio, fase)
 */
import dns from 'node:dns/promises';
import 'dotenv/config';

// Mesma fallback DNS pra rodar via `railway run` localmente
if (process.env.DATABASE_URL && process.env.DATABASE_PUBLIC_URL) {
    try { await dns.lookup(new URL(process.env.DATABASE_URL).hostname); }
    catch { process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL; }
}

const { pool } = await import('../src/db/pool.js');

// Parse args
const args = Object.fromEntries(
    process.argv.slice(2)
        .filter(a => a.startsWith('--'))
        .map(a => a.replace(/^--/, '').split('='))
);

const conds = [];
const params = [];
if (args.club) {
    params.push(args.club);
    conds.push(`c.slug = $${params.length}`);
}
if (args.year) {
    params.push(parseInt(args.year));
    conds.push(`EXTRACT(YEAR FROM g.data) = $${params.length}`);
}
const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

const isFull = 'full' in args;

const sql = isFull ? `
    SELECT
        g.id, g.data, g.horario, g.dia_semana,
        g.time_casa, g.time_visitante, g.mando,
        g.gols_casa, g.gols_visitante, g.resultado,
        g.campeonato, g.fase, g.genero,
        g.estadio, g.publico_total,
        g.foi_classico, g.teve_penal,
        g.titulo_conquistado, g.autores_gols, g.gols_texto,
        c.slug AS clube_catalogo
    FROM games g
    JOIN clubs c ON c.id = g.club_id
    ${where}
    ORDER BY g.data ASC, g.id ASC
` : `
    SELECT
        g.data,
        g.time_casa,
        g.time_visitante,
        g.gols_casa,
        g.gols_visitante,
        g.campeonato,
        c.slug AS clube_catalogo
    FROM games g
    JOIN clubs c ON c.id = g.club_id
    ${where}
    ORDER BY g.data ASC, g.id ASC
`;

const { rows } = await pool.query(sql, params);

let dump;
if (isFull) {
    // Formato completo com todos os campos + lista do que falta enriquecer
    dump = rows.map(r => {
        const falta = [];
        if (!r.estadio)        falta.push('estadio');
        if (!r.publico_total)  falta.push('publico_total');
        if (!r.gols_texto)     falta.push('gols_texto');
        if (!r.autores_gols)   falta.push('autores_gols');
        if (!r.fase && /Paulista|Brasileiro|Libertadores|Sul-?Americana|Copa do Brasil/i.test(r.campeonato || '')) {
            falta.push('fase');
        }
        return {
            id: r.id,
            data: r.data.toISOString().slice(0, 10),
            horario: r.horario,
            dia_semana: r.dia_semana,
            casa: r.time_casa,
            visitante: r.time_visitante,
            mando: r.mando,
            placar: (r.gols_casa != null && r.gols_visitante != null)
                ? `${r.gols_casa}x${r.gols_visitante}` : null,
            gols_casa: r.gols_casa,
            gols_visitante: r.gols_visitante,
            resultado: r.resultado,  // V/E/D do ponto de vista do clube
            campeonato: r.campeonato,
            fase: r.fase,
            genero: r.genero,
            estadio: r.estadio,
            publico_total: r.publico_total,
            foi_classico: r.foi_classico,
            teve_penal: r.teve_penal,
            titulo_conquistado: r.titulo_conquistado,
            autores_gols: r.autores_gols,
            gols_texto: r.gols_texto,
            clube_catalogo: r.clube_catalogo,
            falta: falta.length ? falta : null,
        };
    });
} else {
    // Formato enxuto: data ISO + times + placar
    dump = rows.map(r => ({
        data: r.data.toISOString().slice(0, 10),
        casa: r.time_casa,
        visitante: r.time_visitante,
        placar: (r.gols_casa != null && r.gols_visitante != null)
            ? `${r.gols_casa}x${r.gols_visitante}` : null,
        gols_casa: r.gols_casa,
        gols_visitante: r.gols_visitante,
        campeonato: r.campeonato,
        clube_catalogo: r.clube_catalogo,
    }));
}

console.log(JSON.stringify(dump, null, 2));

await pool.end();
