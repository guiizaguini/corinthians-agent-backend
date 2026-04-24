/**
 * Seed DEFINITIVO da Copa do Mundo 2026 — times reais já divulgados pela FIFA.
 *
 * Limpa os jogos placeholder da copa-do-mundo-2026 e re-insere:
 *   - 72 jogos de grupo (R1 com datas/horários oficiais, R2/R3 inferidas)
 *   - 16 Round of 32 (placeholders de classificação)
 *   - 8 Oitavas, 4 Quartas, 2 Semis, 1 Disputa 3º, 1 Final
 *
 * Round-robin FIFA standard: R1: 1x2/3x4, R2: 1x3/2x4, R3: 1x4/2x3
 *
 * Uso: railway run node scripts/seed_copa_2026_real.mjs
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

// =============================================================
// Grupos oficiais FIFA 2026 (divulgados)
// Slots 1-4 inferidos pela ordem de jogos da Rodada 1:
//   R1 jogo 1: seed1 x seed2 (primeiro jogo do dia)
//   R1 jogo 2: seed3 x seed4
// =============================================================
const grupos = {
    A: ['México', 'África do Sul', 'Coreia do Sul', 'Tchéquia'],
    B: ['Canadá', 'Bósnia e Herzegovina', 'Catar', 'Suíça'],
    C: ['Brasil', 'Marrocos', 'Haiti', 'Escócia'],
    D: ['Estados Unidos', 'Paraguai', 'Austrália', 'Turquia'],
    E: ['Alemanha', 'Curaçao', 'Costa do Marfim', 'Equador'],
    F: ['Holanda', 'Japão', 'Suécia', 'Tunísia'],
    G: ['Bélgica', 'Egito', 'Irã', 'Nova Zelândia'],
    H: ['Espanha', 'Cabo Verde', 'Arábia Saudita', 'Uruguai'],
    I: ['França', 'Senegal', 'Iraque', 'Noruega'],
    J: ['Argentina', 'Argélia', 'Áustria', 'Jordânia'],
    K: ['Portugal', 'RD Congo', 'Uzbequistão', 'Colômbia'],
    L: ['Inglaterra', 'Croácia', 'Gana', 'Panamá'],
};

// =============================================================
// Rodada 1 — datas e horários oficiais (dos prints da FIFA)
// Mapeamento: [grupo, slotA, slotB, data, hora]
// =============================================================
const r1Jogos = [
    ['A', 1, 2, '2026-06-11', '16:00'], // México x África do Sul
    ['A', 3, 4, '2026-06-11', '23:00'], // Coreia do Sul x Tchéquia
    ['B', 1, 2, '2026-06-12', '16:00'], // Canadá x Bósnia
    ['D', 1, 2, '2026-06-12', '22:00'], // EUA x Paraguai
    ['B', 3, 4, '2026-06-13', '16:00'], // Catar x Suíça
    ['C', 1, 2, '2026-06-13', '19:00'], // Brasil x Marrocos
    ['C', 3, 4, '2026-06-13', '22:00'], // Haiti x Escócia
    ['D', 3, 4, '2026-06-14', '01:00'], // Austrália x Turquia
    ['E', 1, 2, '2026-06-14', '14:00'], // Alemanha x Curaçao
    ['F', 1, 2, '2026-06-14', '17:00'], // Holanda x Japão
    ['E', 3, 4, '2026-06-14', '20:00'], // Costa do Marfim x Equador
    ['F', 3, 4, '2026-06-14', '23:00'], // Suécia x Tunísia
    ['H', 1, 2, '2026-06-15', '13:00'], // Espanha x Cabo Verde
    ['G', 1, 2, '2026-06-15', '16:00'], // Bélgica x Egito
    ['H', 3, 4, '2026-06-15', '19:00'], // Arábia Saudita x Uruguai
    ['G', 3, 4, '2026-06-15', '22:00'], // Irã x Nova Zelândia
    ['I', 1, 2, '2026-06-16', '16:00'], // França x Senegal
    ['I', 3, 4, '2026-06-16', '19:00'], // Iraque x Noruega
    ['J', 1, 2, '2026-06-16', '22:00'], // Argentina x Argélia
    ['J', 3, 4, '2026-06-17', '01:00'], // Áustria x Jordânia
    ['K', 1, 2, '2026-06-17', '14:00'], // Portugal x RD Congo
    ['L', 1, 2, '2026-06-17', '17:00'], // Inglaterra x Croácia
    ['L', 3, 4, '2026-06-17', '20:00'], // Gana x Panamá
    ['K', 3, 4, '2026-06-17', '23:00'], // Uzbequistão x Colômbia
];

// =============================================================
// Sedes (16) — distribuídas entre os jogos
// =============================================================
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
const venuePool = [V.AZT, V.BMO, V.SOFI, V.MET, V.AKR, V.BCP, V.MBZ, V.ATT, V.NRG, V.ARH, V.GIL, V.LEV, V.LUM, V.HRK, V.LIN, V.BBVA];
let vIdx = 0;
const nextVenue = () => venuePool[(vIdx++) % venuePool.length];

// =============================================================
// Helper
// =============================================================
const DIA_SEMANA = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
function diaSemana(iso) {
    const d = new Date(iso + 'T12:00:00Z');
    return DIA_SEMANA[d.getUTCDay()];
}

// =============================================================
// Monta lista completa
// =============================================================
const games = [];

// --- Rodada 1: datas/horários oficiais ---
for (const [g, a, b, data, hora] of r1Jogos) {
    const times = grupos[g];
    games.push({
        data,
        casa: times[a - 1],
        visitante: times[b - 1],
        fase: `Grupo ${g} · Rodada 1`,
        estadio: `${nextVenue()} · ${hora}`,
    });
}

// --- Rodada 2: pareamento 1x3, 2x4 — datas 18-22/06 ---
const letters = Object.keys(grupos);
const r2Dates = ['2026-06-18','2026-06-19','2026-06-20','2026-06-21','2026-06-22'];
let dateIdx = 0;
for (const g of letters) {
    const times = grupos[g];
    const d = r2Dates[dateIdx % r2Dates.length];
    games.push({
        data: d,
        casa: times[0], visitante: times[2],  // seed1 x seed3
        fase: `Grupo ${g} · Rodada 2`,
        estadio: nextVenue(),
    });
    games.push({
        data: d,
        casa: times[1], visitante: times[3],  // seed2 x seed4
        fase: `Grupo ${g} · Rodada 2`,
        estadio: nextVenue(),
    });
    dateIdx++;
}

// --- Rodada 3: pareamento 1x4, 2x3 — datas 23-27/06 ---
const r3Dates = ['2026-06-23','2026-06-24','2026-06-25','2026-06-26','2026-06-27'];
dateIdx = 0;
for (const g of letters) {
    const times = grupos[g];
    const d = r3Dates[dateIdx % r3Dates.length];
    games.push({
        data: d,
        casa: times[0], visitante: times[3],  // seed1 x seed4
        fase: `Grupo ${g} · Rodada 3`,
        estadio: nextVenue(),
    });
    games.push({
        data: d,
        casa: times[1], visitante: times[2],  // seed2 x seed3
        fase: `Grupo ${g} · Rodada 3`,
        estadio: nextVenue(),
    });
    dateIdx++;
}

// --- Round of 32 (28/06 a 03/07) ---
const r32Dates = [
    '2026-06-28','2026-06-28',
    '2026-06-29','2026-06-29',
    '2026-06-30','2026-06-30',
    '2026-07-01','2026-07-01',
    '2026-07-02','2026-07-02',
    '2026-07-03','2026-07-03',
    '2026-07-03','2026-07-03','2026-07-03','2026-07-03',
];
for (let i = 0; i < 16; i++) {
    games.push({
        data: r32Dates[i],
        casa: `1º Grupo ${letters[i % 12]}`,
        visitante: `3º melhor ou 2º Grupo`,
        fase: `Round of 32 · Jogo ${i + 73}`,
        estadio: nextVenue(),
    });
}

// --- Oitavas de final (04/07 a 07/07) ---
const r16Dates = ['2026-07-04','2026-07-04','2026-07-05','2026-07-05','2026-07-06','2026-07-06','2026-07-07','2026-07-07'];
const r16Venues = [V.MBZ, V.ATT, V.MET, V.SOFI, V.NRG, V.ARH, V.HRK, V.LIN];
for (let i = 0; i < 8; i++) {
    games.push({
        data: r16Dates[i],
        casa: `Vencedor M${89 + (i*2)}`,
        visitante: `Vencedor M${90 + (i*2)}`,
        fase: `Oitavas de Final · Jogo ${i + 89}`,
        estadio: r16Venues[i],
    });
}

// --- Quartas (09-11/07) ---
const qfDates = ['2026-07-09','2026-07-09','2026-07-10','2026-07-11'];
const qfVenues = [V.MET, V.ATT, V.SOFI, V.MBZ];
for (let i = 0; i < 4; i++) {
    games.push({
        data: qfDates[i],
        casa: `Vencedor O${89 + (i*2) - 16}`,
        visitante: `Vencedor O${90 + (i*2) - 16}`,
        fase: `Quartas de Final`,
        estadio: qfVenues[i],
    });
}

// --- Semis (14 e 15/07) ---
games.push({ data: '2026-07-14', casa: 'Vencedor QF1', visitante: 'Vencedor QF2', fase: 'Semifinal', estadio: V.ATT });
games.push({ data: '2026-07-15', casa: 'Vencedor QF3', visitante: 'Vencedor QF4', fase: 'Semifinal', estadio: V.MBZ });

// --- 3º lugar (18/07) + FINAL (19/07) ---
games.push({ data: '2026-07-18', casa: 'Perdedor SF1', visitante: 'Perdedor SF2', fase: 'Disputa de 3º Lugar', estadio: V.HRK });
games.push({ data: '2026-07-19', casa: 'Vencedor SF1', visitante: 'Vencedor SF2', fase: 'FINAL', estadio: V.MET });

// =============================================================
// Executa: deleta tudo da Copa + reinsere
// =============================================================
console.log(`[seed] Limpando games antigos da Copa 2026...`);
await pool.query(
    `DELETE FROM games WHERE club_id = $1`,
    [clubId]
);

console.log(`[seed] Inserindo ${games.length} jogos...`);
let inserted = 0, errors = 0;
for (const g of games) {
    try {
        await pool.query(
            `INSERT INTO games (
                club_id, data, dia_semana, time_casa, time_visitante, mando,
                campeonato, genero, estadio, fase, gols_casa, gols_visitante, resultado
             ) VALUES ($1, $2, $3, $4, $5, 'NEUTRO', 'Copa do Mundo 2026', 'M', $6, $7, NULL, NULL, NULL)
             ON CONFLICT (club_id, data, time_casa, time_visitante, genero) DO NOTHING`,
            [clubId, g.data, diaSemana(g.data), g.casa, g.visitante, g.estadio, g.fase]
        );
        inserted++;
    } catch (err) {
        console.error(`[err] ${g.data} ${g.casa} x ${g.visitante}: ${err.message}`);
        errors++;
    }
}

const { rows: total } = await pool.query(
    "SELECT COUNT(*)::int AS n FROM games WHERE club_id = $1",
    [clubId]
);

console.log(`\n[seed] ${inserted} jogos inseridos, ${errors} erros`);
console.log(`[seed] Total na Copa 2026: ${total[0].n} jogos`);
console.log(`  - 24 jogos Rodada 1 (datas/horários oficiais FIFA)`);
console.log(`  - 24 jogos Rodada 2 (pareamento 1x3, 2x4)`);
console.log(`  - 24 jogos Rodada 3 (pareamento 1x4, 2x3)`);
console.log(`  - 32 jogos mata-mata (placeholders até definir times)`);

await pool.end();
