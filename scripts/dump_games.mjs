/**
 * Dump enxuto dos games (data, times, placar) pra validação por agente de IA.
 *
 * Uso:
 *   railway run node scripts/dump_games.mjs > games.json
 *   railway run node scripts/dump_games.mjs --club=corinthians > corinthians.json
 *
 * Filtros opcionais:
 *   --club=<slug>   só os games do clube (ex: corinthians, palmeiras)
 *   --year=<ano>    só de um ano
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

const sql = `
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

// Formato enxuto: data ISO + times + placar
const dump = rows.map(r => ({
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

console.log(JSON.stringify(dump, null, 2));

await pool.end();
