/**
 * Gera e insere os 104 jogos da Copa do Mundo 2026 (formato FIFA 48 times).
 *
 * Times placeholder: A1..L4 (48 times = 12 grupos × 4)
 * Mata-mata: "Vencedor 1A", "Vencedor M73", etc.
 * Datas e sedes baseadas no calendário oficial FIFA.
 *
 * Idempotente: ON CONFLICT DO NOTHING pelo UNIQUE (club_id, data, time_casa, time_visitante, genero).
 *
 * Uso: railway run node scripts/seed_copa_2026_full.mjs
 */
import dns from 'node:dns/promises';
import 'dotenv/config';

if (process.env.DATABASE_URL && process.env.DATABASE_PUBLIC_URL) {
    try { await dns.lookup(new URL(process.env.DATABASE_URL).hostname); }
    catch { process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL; }
}

const { pool } = await import('../src/db/pool.js');

const { rows: c } = await pool.query("SELECT id FROM clubs WHERE slug = 'copa-do-mundo-2026'");
if (!c.length) {
    console.error('Clube "copa-do-mundo-2026" não existe. Rode migrate:v2 primeiro.');
    process.exit(1);
}
const clubId = c[0].id;

// Sedes (16)
const V = {
    AZT: 'Estádio Azteca (Cidade do México)',
    AKR: 'Estádio Akron (Guadalajara)',
    BBVA: 'Estádio BBVA (Monterrey)',
    BMO: 'BMO Field (Toronto)',
    BCP: 'BC Place (Vancouver)',
    MBZ: 'Mercedes-Benz (Atlanta)',
    GIL: 'Gillette (Boston)',
    ATT: 'AT&T (Dallas)',
    NRG: 'NRG (Houston)',
    ARH: 'Arrowhead (Kansas City)',
    SOFI: 'SoFi (Los Angeles)',
    HRK: 'Hard Rock (Miami)',
    MET: 'MetLife (East Rutherford)',
    LIN: 'Lincoln Financial (Philadelphia)',
    LEV: "Levi's Stadium (São Francisco)",
    LUM: 'Lumen (Seattle)',
};

// Pool de sedes pra distribuir jogos de grupo
const venueCycle = [V.MET, V.SOFI, V.MBZ, V.ATT, V.NRG, V.ARH, V.LIN, V.HRK, V.GIL, V.LEV, V.LUM, V.BMO, V.BCP, V.AZT, V.AKR, V.BBVA];

// Diassemana helper
const DIA_SEMANA = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
function diaSemana(iso) {
    const d = new Date(iso + 'T12:00:00Z');
    return DIA_SEMANA[d.getUTCDay()];
}

const games = [];
const push = (data, casa, visitante, fase, estadio) => {
    games.push({ data, casa, visitante, fase, estadio });
};

// ===== FASE DE GRUPOS (72 jogos, 11/06 a 27/06) =====
// 12 grupos (A-L), cada um com 6 jogos (round-robin)
// Distribuímos 4-5 jogos por dia em 16 dias
const groups = ['A','B','C','D','E','F','G','H','I','J','K','L'];
const roundRobin = [
    [0, 1], [2, 3],  // rodada 1
    [0, 2], [1, 3],  // rodada 2
    [0, 3], [1, 2],  // rodada 3
];

// Datas base de cada rodada (oficiais FIFA)
const groupStageDates = {
    // rodada 1: 11/06 - 17/06
    r1: ['2026-06-11','2026-06-12','2026-06-13','2026-06-14','2026-06-15','2026-06-16','2026-06-17'],
    // rodada 2: 18/06 - 22/06
    r2: ['2026-06-18','2026-06-19','2026-06-20','2026-06-21','2026-06-22'],
    // rodada 3: 23/06 - 27/06
    r3: ['2026-06-23','2026-06-24','2026-06-25','2026-06-26','2026-06-27'],
};

let venueIdx = 0;
const nextVenue = () => venueCycle[(venueIdx++) % venueCycle.length];

// Opener especial: 11/06 México x A2
push('2026-06-11', 'México', 'A2', 'Abertura · Grupo A · Rodada 1', V.AZT);

// Rodada 1 (demais jogos do grupo A já é o opener) — pula primeiro jogo do grupo A
for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi];
    // jogo 2 do grupo (A3 vs A4)
    const dateR1 = groupStageDates.r1[Math.min(gi, groupStageDates.r1.length - 1)];
    if (g === 'A') {
        // grupo A rodada 1 jogo 2 (A3 x A4) em 13/06
        push('2026-06-13', 'A3', 'A4', 'Grupo A · Rodada 1', nextVenue());
    } else {
        // distribui as rodadas 1 dos outros grupos
        const baseDate = groupStageDates.r1[Math.min(gi - 1, groupStageDates.r1.length - 1)];
        push(baseDate, `${g}1`, `${g}2`, `Grupo ${g} · Rodada 1`, nextVenue());
        push(baseDate, `${g}3`, `${g}4`, `Grupo ${g} · Rodada 1`, nextVenue());
    }
}

// Rodada 2 — cada grupo 2 jogos
for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi];
    const d = groupStageDates.r2[gi % groupStageDates.r2.length];
    push(d, `${g}1`, `${g}3`, `Grupo ${g} · Rodada 2`, nextVenue());
    push(d, `${g}2`, `${g}4`, `Grupo ${g} · Rodada 2`, nextVenue());
}

// Rodada 3 — cada grupo 2 jogos (usualmente simultâneos)
for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi];
    const d = groupStageDates.r3[gi % groupStageDates.r3.length];
    push(d, `${g}1`, `${g}4`, `Grupo ${g} · Rodada 3`, nextVenue());
    push(d, `${g}2`, `${g}3`, `Grupo ${g} · Rodada 3`, nextVenue());
}

// ===== ROUND OF 32 (16 jogos, 28/06 a 03/07) =====
// 32 times classificam (top 2 de cada grupo + 8 melhores 3os)
const r32Venues = [V.MET, V.SOFI, V.MBZ, V.ATT, V.NRG, V.ARH, V.LIN, V.HRK,
                   V.GIL, V.LEV, V.LUM, V.BMO, V.BCP, V.AZT, V.AKR, V.BBVA];
const r32Dates = [
    '2026-06-28','2026-06-28',
    '2026-06-29','2026-06-29',
    '2026-06-30','2026-06-30',
    '2026-07-01','2026-07-01',
    '2026-07-02','2026-07-02',
    '2026-07-02',
    '2026-07-03','2026-07-03','2026-07-03',
    '2026-07-03','2026-07-03',
];
for (let i = 0; i < 16; i++) {
    push(r32Dates[i], `1º Grupo ${groups[i % 12]}`, `3º/2º Grupo`, `Round of 32 · Jogo ${i + 73}`, r32Venues[i % r32Venues.length]);
}

// ===== ROUND OF 16 / OITAVAS (8 jogos, 04/07 a 07/07) =====
const r16Dates = [
    '2026-07-04','2026-07-04',
    '2026-07-05','2026-07-05',
    '2026-07-06','2026-07-06',
    '2026-07-07','2026-07-07',
];
const r16Venues = [V.MBZ, V.ATT, V.MET, V.SOFI, V.NRG, V.ARH, V.HRK, V.LIN];
for (let i = 0; i < 8; i++) {
    push(r16Dates[i], `Vencedor M${89 + (i*2)}`, `Vencedor M${90 + (i*2)}`, `Oitavas de Final · Jogo ${i + 89}`, r16Venues[i]);
}

// ===== QUARTAS DE FINAL (4 jogos, 09/07 a 11/07) =====
const qfDates = ['2026-07-09','2026-07-09','2026-07-10','2026-07-11'];
const qfVenues = [V.MET, V.ATT, V.SOFI, V.MBZ];
for (let i = 0; i < 4; i++) {
    push(qfDates[i], `Vencedor M${97 + (i*2) - 16}`, `Vencedor M${98 + (i*2) - 16}`, `Quartas de Final`, qfVenues[i]);
}

// ===== SEMIFINAIS (2 jogos, 14 e 15/07) =====
push('2026-07-14', 'Vencedor QF1', 'Vencedor QF2', 'Semifinal', V.ATT);
push('2026-07-15', 'Vencedor QF3', 'Vencedor QF4', 'Semifinal', V.MBZ);

// ===== DISPUTA DE 3º (18/07) =====
push('2026-07-18', 'Perdedor SF1', 'Perdedor SF2', 'Disputa de 3º Lugar', V.HRK);

// ===== FINAL (19/07) =====
push('2026-07-19', 'Vencedor SF1', 'Vencedor SF2', 'FINAL', V.MET);

console.log(`[seed] gerando ${games.length} jogos da Copa 2026...`);

let inserted = 0, skipped = 0, errors = 0;
for (const g of games) {
    try {
        const r = await pool.query(
            `INSERT INTO games (
                club_id, data, dia_semana, time_casa, time_visitante, mando,
                campeonato, genero, estadio, fase, gols_casa, gols_visitante, resultado
             ) VALUES ($1, $2, $3, $4, $5, 'NEUTRO', 'Copa do Mundo 2026', 'M', $6, $7, NULL, NULL, NULL)
             ON CONFLICT (club_id, data, time_casa, time_visitante, genero) DO NOTHING`,
            [clubId, g.data, diaSemana(g.data), g.casa, g.visitante, g.estadio, g.fase]
        );
        if (r.rowCount) inserted++; else skipped++;
    } catch (err) {
        console.error(`[err] ${g.data} ${g.casa} x ${g.visitante}: ${err.message}`);
        errors++;
    }
}

const { rows: total } = await pool.query(
    "SELECT COUNT(*)::int AS n FROM games WHERE club_id = $1",
    [clubId]
);

console.log(`\n[seed] Resumo:`);
console.log(`  ${inserted} novos jogos inseridos`);
console.log(`  ${skipped} já existiam (pulados)`);
console.log(`  ${errors} erros`);
console.log(`  ${total[0].n} total de jogos na Copa 2026`);

await pool.end();
