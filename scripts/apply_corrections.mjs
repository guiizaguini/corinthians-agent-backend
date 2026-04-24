/**
 * Aplica correções de placar a partir de um JSON enxuto.
 *
 * Uso:
 *   railway run node scripts/apply_corrections.mjs <caminho-do-json> [--dry-run]
 *
 * Formato esperado do JSON: array de objetos com:
 *   { data: "YYYY-MM-DD", casa, visitante, gols_casa, gols_visitante, clube_catalogo }
 *
 * Match: (clube_catalogo + data + time_casa + time_visitante)
 * Update: gols_casa, gols_visitante, resultado (recalculado da perspectiva do clube)
 *
 * --dry-run mostra o que seria alterado mas não escreve.
 */
import fs from 'node:fs';
import dns from 'node:dns/promises';
import 'dotenv/config';

if (process.env.DATABASE_URL && process.env.DATABASE_PUBLIC_URL) {
    try { await dns.lookup(new URL(process.env.DATABASE_URL).hostname); }
    catch { process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL; }
}

const { pool } = await import('../src/db/pool.js');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const jsonPath = args.find(a => !a.startsWith('--'));

if (!jsonPath) {
    console.error('Uso: node scripts/apply_corrections.mjs <caminho-do-json> [--dry-run]');
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
console.log(`[apply] ${data.length} entradas no JSON`);
if (dryRun) console.log('[apply] DRY RUN — nada será escrito');

// Resolve club name -> id
const { rows: clubs } = await pool.query('SELECT id, slug, name FROM clubs');
const clubBySlug = Object.fromEntries(clubs.map(c => [c.slug, c]));

function calcResultado(clubName, time_casa, gols_casa, gols_visitante) {
    if (gols_casa == null || gols_visitante == null) return null;
    if (time_casa !== clubName && /* visitante */ true) {
        // Pode ser que o clube seja o visitante
    }
    const proCasa = (time_casa === clubName);
    const golsPro = proCasa ? gols_casa : gols_visitante;
    const golsCon = proCasa ? gols_visitante : gols_casa;
    if (golsPro > golsCon) return 'V';
    if (golsPro < golsCon) return 'D';
    return 'E';
}

let updated = 0, notFound = 0, unchanged = 0, errors = 0;
const notFoundList = [];

for (const entry of data) {
    const club = clubBySlug[entry.clube_catalogo];
    if (!club) {
        console.warn(`[skip] clube ${entry.clube_catalogo} não existe`);
        errors++;
        continue;
    }

    try {
        // Match exato (mesma data, mesma ordem casa/visitante)
        let existing = (await pool.query(
            `SELECT id, gols_casa, gols_visitante, resultado, data, time_casa, time_visitante, campeonato
             FROM games
             WHERE club_id = $1 AND data = $2
               AND time_casa = $3 AND time_visitante = $4`,
            [club.id, entry.data, entry.casa, entry.visitante]
        )).rows;
        let swapped = false;

        // Fallback 1: casa/visitante invertidos (mesma data)
        if (!existing.length) {
            const swap = await pool.query(
                `SELECT id, gols_casa, gols_visitante, resultado, data, time_casa, time_visitante, campeonato
                 FROM games
                 WHERE club_id = $1 AND data = $2
                   AND time_casa = $3 AND time_visitante = $4`,
                [club.id, entry.data, entry.visitante, entry.casa]
            );
            if (swap.rows.length === 1) {
                existing = swap.rows;
                swapped = true;
                console.log(`[swap] ${entry.data} | mandante invertido (DB: ${swap.rows[0].time_casa} x ${swap.rows[0].time_visitante})`);
            }
        }

        // Fallback 2: fuzzy ILIKE no nome dos times + data ± 3 dias
        if (!existing.length) {
            const fuzzy = await pool.query(
                `SELECT id, gols_casa, gols_visitante, resultado, data, time_casa, time_visitante, campeonato
                 FROM games
                 WHERE club_id = $1
                   AND ABS(EXTRACT(EPOCH FROM (data::timestamp - $2::timestamp)))/86400 <= 3
                   AND ((unaccent(time_casa) ILIKE unaccent($3) AND unaccent(time_visitante) ILIKE unaccent($4))
                     OR (unaccent(time_casa) ILIKE unaccent($4) AND unaccent(time_visitante) ILIKE unaccent($3)))
                 LIMIT 2`,
                [club.id, entry.data, `%${entry.casa}%`, `%${entry.visitante}%`]
            );
            if (fuzzy.rows.length === 1) {
                existing = fuzzy.rows;
                const m = existing[0];
                console.log(`[fuzzy] ${entry.data} ${entry.casa}x${entry.visitante} → match com ${m.data.toISOString().slice(0,10)} ${m.time_casa}x${m.time_visitante}`);
            } else if (fuzzy.rows.length > 1) {
                console.warn(`[ambiguo] ${entry.data} ${entry.casa}x${entry.visitante} → ${fuzzy.rows.length} candidatos, pulando`);
            }
        }

        // Fallback 3: data exata + club_id, qualquer adversário. Se der match único,
        // atualiza TAMBÉM os nomes dos times (caso tenham mudado, ex: Nacional URU → PAR)
        let updateTeamNames = false;
        if (!existing.length) {
            const byDate = await pool.query(
                `SELECT id, gols_casa, gols_visitante, resultado, data, time_casa, time_visitante, campeonato
                 FROM games
                 WHERE club_id = $1 AND data = $2
                 LIMIT 2`,
                [club.id, entry.data]
            );
            if (byDate.rows.length === 1) {
                existing = byDate.rows;
                updateTeamNames = true;
                const m = existing[0];
                console.log(`[date-only] ${entry.data} ${entry.casa}x${entry.visitante} → match único na data (DB: ${m.time_casa} x ${m.time_visitante})`);
            } else if (byDate.rows.length > 1) {
                console.warn(`[ambiguo-date] ${entry.data} ${entry.casa}x${entry.visitante} → ${byDate.rows.length} jogos nessa data, pulando`);
            }
        }

        if (!existing.length) {
            notFound++;
            notFoundList.push(`${entry.data} | ${entry.casa} x ${entry.visitante}`);
            continue;
        }

        const cur = existing[0];

        // Decide os nomes dos times que vão ficar no banco
        const newCasa = updateTeamNames ? entry.casa : cur.time_casa;
        const newVis  = updateTeamNames ? entry.visitante : cur.time_visitante;

        // Gols a armazenar seguem a ordem (casa, visitante) NO BANCO
        let newGc, newGv;
        if (updateTeamNames) {
            // Banco vai ficar com a ordem do JSON
            newGc = entry.gols_casa;
            newGv = entry.gols_visitante;
        } else if (swapped) {
            // Banco tem ordem invertida em relação ao JSON
            newGc = entry.gols_visitante;
            newGv = entry.gols_casa;
        } else {
            newGc = entry.gols_casa;
            newGv = entry.gols_visitante;
        }

        // Resultado + mando calculados considerando a ORDEM FINAL no banco
        const newRes = calcResultado(club.name, newCasa, newGc, newGv);
        let newMando = 'NEUTRO';
        if (newCasa === club.name) newMando = 'MANDANTE';
        else if (newVis === club.name) newMando = 'VISITANTE';
        const newCamp = entry.campeonato ?? cur.campeonato;

        const teamsMudaram = updateTeamNames && (cur.time_casa !== newCasa || cur.time_visitante !== newVis);
        const placarMudou = cur.gols_casa !== newGc || cur.gols_visitante !== newGv || cur.resultado !== newRes;
        const campMudou = (cur.campeonato || '') !== (newCamp || '');

        if (!placarMudou && !campMudou && !teamsMudaram) {
            unchanged++;
            continue;
        }

        const partes = [];
        if (teamsMudaram) partes.push(`times: ${cur.time_casa} x ${cur.time_visitante} → ${newCasa} x ${newVis}`);
        if (placarMudou) partes.push(`placar: ${cur.gols_casa}x${cur.gols_visitante} (${cur.resultado || '—'}) → ${newGc}x${newGv} (${newRes || '—'})`);
        if (campMudou) partes.push(`camp: ${cur.campeonato || '—'} → ${newCamp || '—'}`);
        console.log(`[diff] ${entry.data} | ${entry.casa} x ${entry.visitante} | ${partes.join(' · ')}`);

        if (!dryRun) {
            await pool.query(
                `UPDATE games
                 SET gols_casa = $1, gols_visitante = $2, resultado = $3, campeonato = $4,
                     time_casa = $5, time_visitante = $6, mando = $7
                 WHERE id = $8`,
                [newGc, newGv, newRes, newCamp, newCasa, newVis, newMando, cur.id]
            );
        }
        updated++;
    } catch (err) {
        console.error(`[err] ${entry.data} | ${entry.casa} x ${entry.visitante}: ${err.message}`);
        errors++;
    }
}

console.log('\n[apply] Resumo:');
console.log(`  ${updated} jogos ${dryRun ? 'seriam atualizados' : 'atualizados'}`);
console.log(`  ${unchanged} já estavam corretos`);
console.log(`  ${notFound} não encontrados no banco`);
console.log(`  ${errors} erros`);

if (notFoundList.length) {
    console.log('\n[apply] Não encontrados (primeiros 30):');
    notFoundList.slice(0, 30).forEach(l => console.log('  -', l));
}

await pool.end();
