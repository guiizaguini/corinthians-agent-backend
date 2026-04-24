/**
 * Seed DEFINITIVO da Copa do Mundo 2026 baseado no XLSX oficial.
 * Usa scripts/copa_2026_data.json (gerado a partir do XLSX).
 *
 * Uso: railway run node scripts/seed_copa_xlsx.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dns from 'node:dns/promises';
import 'dotenv/config';

if (process.env.DATABASE_URL && process.env.DATABASE_PUBLIC_URL) {
    try { await dns.lookup(new URL(process.env.DATABASE_URL).hostname); }
    catch { process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL; }
}

const { pool } = await import('../src/db/pool.js');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'copa_2026_data.json'), 'utf-8'));

const { rows: c } = await pool.query("SELECT id FROM clubs WHERE slug = 'copa-do-mundo-2026'");
if (!c.length) { console.error('Clube copa-do-mundo-2026 não existe'); process.exit(1); }
const clubId = c[0].id;

// Mapeia cada time ao seu grupo (A-L) — inferido dos prints/xlsx oficiais
const TEAM_TO_GROUP = {
    'México': 'A', 'África do Sul': 'A', 'Coreia do Sul': 'A', 'A definir (UEFA Path D)': 'A',
    'Canadá': 'B', 'A definir (UEFA Path A)': 'B', 'Catar': 'B', 'Suíça': 'B',
    'Brasil': 'C', 'Marrocos': 'C', 'Haiti': 'C', 'Escócia': 'C',
    'EUA': 'D', 'Paraguai': 'D', 'Austrália': 'D', 'A definir (UEFA Path C)': 'D',
    'Alemanha': 'E', 'Curaçao': 'E', 'Costa do Marfim': 'E', 'Equador': 'E',
    'Holanda': 'F', 'Japão': 'F', 'A definir (UEFA Path B)': 'F', 'Tunísia': 'F',
    'Bélgica': 'G', 'Egito': 'G', 'Irã': 'G', 'Nova Zelândia': 'G',
    'Espanha': 'H', 'Cabo Verde': 'H', 'Arábia Saudita': 'H', 'Uruguai': 'H',
    'França': 'I', 'Senegal': 'I', 'A definir (IC Path 2)': 'I', 'Noruega': 'I',
    'Argentina': 'J', 'Argélia': 'J', 'Áustria': 'J', 'Jordânia': 'J',
    'Portugal': 'K', 'A definir (IC Path 1)': 'K', 'Uzbequistão': 'K', 'Colômbia': 'K',
    'Inglaterra': 'L', 'Croácia': 'L', 'Gana': 'L', 'Panamá': 'L',
};

function detectGroup(mand, vis) {
    return TEAM_TO_GROUP[mand] || TEAM_TO_GROUP[vis] || null;
}

function detectRodada(numero) {
    // Na fase de grupos (números 1-72), cada rodada tem 24 jogos
    if (numero <= 24) return 1;
    if (numero <= 48) return 2;
    if (numero <= 72) return 3;
    return null;
}

function buildFase(j) {
    if (j.fase === 'Fase de Grupos') {
        const g = detectGroup(j.mandante, j.visitante);
        const r = detectRodada(j.numero);
        if (g && r) return `Grupo ${g} · Rodada ${r}`;
        return j.fase;
    }
    if (j.fase === 'Oitavas de 32') return `Oitavas de 32 · Jogo ${j.numero}`;
    if (j.fase === 'Oitavas de final') return `Oitavas de Final · Jogo ${j.numero}`;
    if (j.fase === 'Quartas de final') return `Quartas de Final`;
    if (j.fase === 'Semifinal') return `Semifinal`;
    if (j.fase === 'Disputa 3º lugar') return `Disputa de 3º Lugar`;
    if (j.fase === 'Final') return `FINAL`;
    return j.fase;
}

const DIA_SEMANA = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
function diaSemana(iso) {
    const d = new Date(iso + 'T12:00:00Z');
    return DIA_SEMANA[d.getUTCDay()];
}

// Limpa e re-insere
console.log(`[seed] Limpando games antigos da Copa 2026...`);
await pool.query('DELETE FROM games WHERE club_id = $1', [clubId]);

console.log(`[seed] Inserindo ${data.length} jogos do XLSX oficial...`);
let inserted = 0, errors = 0;
for (const j of data) {
    try {
        const fase = buildFase(j);
        await pool.query(
            `INSERT INTO games (
                club_id, data, dia_semana, horario, time_casa, time_visitante, mando,
                campeonato, genero, estadio, fase, gols_casa, gols_visitante, resultado
             ) VALUES ($1, $2, $3, $4, $5, $6, 'NEUTRO', 'Copa do Mundo 2026', 'M', $7, $8, NULL, NULL, NULL)
             ON CONFLICT (club_id, data, time_casa, time_visitante, genero) DO NOTHING`,
            [clubId, j.data, diaSemana(j.data), j.horario, j.mandante, j.visitante, j.estadio, fase]
        );
        inserted++;
    } catch (err) {
        console.error(`[err] jogo #${j.numero} ${j.mandante} x ${j.visitante}: ${err.message}`);
        errors++;
    }
}

console.log(`\n[seed] ${inserted}/${data.length} jogos inseridos, ${errors} erros`);
await pool.end();
