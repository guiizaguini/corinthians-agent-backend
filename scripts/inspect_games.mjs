/**
 * Inspeciona jogos do banco que casam com um termo de busca.
 * Uso: railway run node scripts/inspect_games.mjs <termo> [--club=corinthians]
 *   ex: railway run node scripts/inspect_games.mjs Oeste
 *   ex: railway run node scripts/inspect_games.mjs Remo --club=corinthians
 */
import dns from 'node:dns/promises';
import 'dotenv/config';

if (process.env.DATABASE_URL && process.env.DATABASE_PUBLIC_URL) {
    try { await dns.lookup(new URL(process.env.DATABASE_URL).hostname); }
    catch { process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL; }
}

const { pool } = await import('../src/db/pool.js');

const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.replace(/^--/, '').split('=')));
const term = args.find(a => !a.startsWith('--'));

if (!term) {
    console.error('Uso: node scripts/inspect_games.mjs <termo> [--club=slug]');
    process.exit(1);
}

const params = [`%${term}%`];
const conds = [`(unaccent(g.time_casa) ILIKE unaccent($1) OR unaccent(g.time_visitante) ILIKE unaccent($1))`];
if (flags.club) {
    params.push(flags.club);
    conds.push(`c.slug = $${params.length}`);
}

const { rows } = await pool.query(
    `SELECT g.id, g.data::text, g.time_casa, g.time_visitante,
            g.gols_casa, g.gols_visitante, g.resultado, g.campeonato,
            c.slug AS clube
     FROM games g JOIN clubs c ON c.id = g.club_id
     WHERE ${conds.join(' AND ')}
     ORDER BY g.data DESC`,
    params
);

console.log(`${rows.length} jogos encontrados contendo "${term}":\n`);
for (const r of rows) {
    const placar = r.gols_casa != null ? `${r.gols_casa}x${r.gols_visitante}` : '—';
    console.log(`  [id ${r.id}] ${r.data} | ${r.time_casa} x ${r.time_visitante} | ${placar} (${r.resultado || '—'}) | ${r.campeonato || '—'}`);
}

await pool.end();
