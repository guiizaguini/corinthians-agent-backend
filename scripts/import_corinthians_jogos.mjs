/**
 * Importa jogos do Corinthians a partir de um arquivo JSON.
 * Idempotente: roda quantas vezes quiser, atualiza os existentes.
 *
 * Uso:
 *   railway run node scripts/import_corinthians_jogos.mjs <caminho_do_json>
 *   railway run node scripts/import_corinthians_jogos.mjs "C:/Users/guilh/Downloads/corinthians_jogos.json"
 *
 * Comportamento:
 *  - INSERT … ON CONFLICT (club_id, data, time_casa, time_visitante, genero) DO UPDATE
 *  - Normaliza formato do minuto: "4' 2ºT" → "4'2T"
 *  - Normaliza gols_texto da mesma forma
 *  - Preserva attendances/notes (não toca neles)
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns/promises';

async function maybeSwapToPublicUrl() {
    const url = process.env.DATABASE_URL;
    const publicUrl = process.env.DATABASE_PUBLIC_URL;
    if (!url || !publicUrl) return;
    try {
        await dns.lookup(new URL(url).hostname);
    } catch {
        console.log('[import] DATABASE_URL interna não resolveu, usando DATABASE_PUBLIC_URL');
        process.env.DATABASE_URL = publicUrl;
    }
}

await maybeSwapToPublicUrl();
const { pool } = await import('../src/db/pool.js');

// ============== Helpers de normalização ==============

/** Normaliza minuto: "4' 2ºT" → "4'2T", "45+1' 1ºT" → "45+1'1T" */
function normalizeMinuto(m) {
    if (m === null || m === undefined || m === '') return null;
    return String(m).replace(/\s+/g, '').replace(/º/g, '');
}

/** Normaliza gols_texto removendo "º" e espaços indesejados nos tempos */
function normalizeGolsTexto(s) {
    if (!s) return s;
    return String(s).replace(/(\d+(?:\+\d+)?)'\s*(\d?)º?T/g, (m, min, t) => `${min}'${t}T`);
}

/** Normaliza array de autores_gols, retorna JSONB-friendly */
function normalizeAutoresGols(autores) {
    if (!Array.isArray(autores) || !autores.length) return null;
    return autores.map(a => ({
        minuto: normalizeMinuto(a.minuto),
        autor: a.autor || null,
        time: a.time || null,
    }));
}

// Sanitiza string nullable
function nz(v, max = null) {
    if (v === null || v === undefined || v === '') return null;
    let s = String(v);
    if (max && s.length > max) s = s.substring(0, max);
    return s;
}

// ============== Main ==============

const filePath = process.argv[2];
if (!filePath) {
    console.error('Uso: node scripts/import_corinthians_jogos.mjs <caminho_do_json>');
    process.exit(1);
}

const fullPath = path.resolve(filePath);
if (!fs.existsSync(fullPath)) {
    console.error(`Arquivo não encontrado: ${fullPath}`);
    process.exit(1);
}

const raw = fs.readFileSync(fullPath, 'utf-8');
const jogos = JSON.parse(raw);

if (!Array.isArray(jogos)) {
    console.error('JSON precisa ser um array de jogos');
    process.exit(1);
}

console.log(`[import] Lendo ${jogos.length} jogos de ${path.basename(fullPath)}`);

(async () => {
    try {
        // Pega club_id do Corinthians
        const { rows: cRows } = await pool.query(
            "SELECT id FROM clubs WHERE slug = 'corinthians'"
        );
        if (!cRows.length) {
            throw new Error('Clube "corinthians" não encontrado no banco. Rode migrate:v2 primeiro.');
        }
        const clubId = cRows[0].id;
        console.log(`[import] club_id Corinthians = ${clubId}`);

        let inseridos = 0, atualizados = 0, erros = 0;
        const errosDetalhe = [];

        for (let i = 0; i < jogos.length; i++) {
            const j = jogos[i];
            try {
                const autoresGols = normalizeAutoresGols(j.autores_gols);
                const golsTextoNorm = normalizeGolsTexto(j.gols_texto);

                const result = await pool.query(`
                    INSERT INTO games (
                        club_id, data, dia_semana, horario,
                        time_casa, time_visitante, mando, campeonato, genero,
                        estadio, gols_casa, gols_visitante, resultado,
                        foi_classico, teve_penal, fase, titulo_conquistado,
                        autores_gols, gols_texto, publico_total
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                        $14, $15, $16, $17, $18::jsonb, $19, $20
                    )
                    ON CONFLICT (club_id, data, time_casa, time_visitante, genero) DO UPDATE SET
                        dia_semana = EXCLUDED.dia_semana,
                        horario = EXCLUDED.horario,
                        mando = EXCLUDED.mando,
                        campeonato = EXCLUDED.campeonato,
                        estadio = EXCLUDED.estadio,
                        gols_casa = EXCLUDED.gols_casa,
                        gols_visitante = EXCLUDED.gols_visitante,
                        resultado = EXCLUDED.resultado,
                        foi_classico = EXCLUDED.foi_classico,
                        teve_penal = EXCLUDED.teve_penal,
                        fase = EXCLUDED.fase,
                        titulo_conquistado = EXCLUDED.titulo_conquistado,
                        autores_gols = EXCLUDED.autores_gols,
                        gols_texto = EXCLUDED.gols_texto,
                        publico_total = EXCLUDED.publico_total
                    RETURNING (xmax = 0) AS inserted
                `, [
                    clubId,
                    j.data,
                    nz(j.dia_semana, 10),
                    nz(j.horario, 5),
                    nz(j.time_casa, 60),
                    nz(j.time_visitante, 60),
                    nz(j.mando, 10) || 'NEUTRO',
                    nz(j.campeonato, 40),
                    nz(j.genero, 10) || 'M',
                    nz(j.estadio, 60),
                    j.gols_casa ?? null,
                    j.gols_visitante ?? null,
                    j.resultado ?? null,
                    !!j.foi_classico,
                    !!j.teve_penal,
                    nz(j.fase, 40),
                    nz(j.titulo_conquistado, 60),
                    autoresGols ? JSON.stringify(autoresGols) : null,
                    golsTextoNorm,
                    j.publico_total ?? null,
                ]);

                if (result.rows[0]?.inserted) inseridos++;
                else atualizados++;

                // Log de progresso a cada 25
                if ((i + 1) % 25 === 0) {
                    console.log(`[import]  ${i + 1}/${jogos.length} processados...`);
                }
            } catch (err) {
                erros++;
                errosDetalhe.push({
                    idx: i,
                    data: j.data,
                    matchup: `${j.time_casa} × ${j.time_visitante}`,
                    erro: err.message,
                });
            }
        }

        console.log('\n[import] ============= RESUMO =============');
        console.log(`  Total processado:  ${jogos.length}`);
        console.log(`  Inseridos novos:   ${inseridos}`);
        console.log(`  Atualizados:       ${atualizados}`);
        console.log(`  Erros:             ${erros}`);
        if (errosDetalhe.length) {
            console.log('\n[import] Erros detalhados:');
            for (const e of errosDetalhe.slice(0, 20)) {
                console.log(`  - [${e.idx}] ${e.data} ${e.matchup}: ${e.erro}`);
            }
            if (errosDetalhe.length > 20) {
                console.log(`  ...e mais ${errosDetalhe.length - 20} erros`);
            }
        }

        // Conta total final
        const { rows: countRows } = await pool.query(
            'SELECT COUNT(*)::int AS n FROM games WHERE club_id = $1',
            [clubId]
        );
        console.log(`\n[import] Total de jogos do Corinthians no banco agora: ${countRows[0].n}`);
        console.log('[import] OK');
    } catch (err) {
        console.error('[import] ERRO:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
})();
