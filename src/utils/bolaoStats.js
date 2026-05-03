/**
 * Stats de bolão da Copa pra catálogo de conquistas.
 *
 * Funciona pra QUALQUER user (com ou sem clube selecionado — botmaker /
 * white-label sem clube tambem ganha conquistas de bolao normalmente).
 *
 * Retorna:
 *   boloes_count       — quantidade de boloes que o user esta inscrito
 *   palpites_count     — total de palpites feitos
 *   acertos_exatos     — quantas vezes acertou placar exato (jogo ja tem resultado)
 *   palpitou_tudo      — palpitou em TODOS os jogos com times confirmados em algum bolao
 *   max_pontos_bolao   — maior pontuacao em qualquer bolao do user
 *   foi_top1 / foi_top3 — esta no topX agora E pelo menos 1 jogo da Copa ja teve
 *                        resultado (gate pra evitar achievement antes da Copa comecar)
 *   campeao_bolao      — top1 e a final ja foi jogada
 */

import { query } from '../db/pool.js';

const TOURNAMENT_SLUG = 'copa-do-mundo-2026';
// Constantes de pontuação — espelho de BOLAO_PONTOS em routes/bolao.js.
// Duplicado aqui pra evitar ciclo de import (utils nao deveria importar routes).
const PLACAR_EXATO = 15;
const VENCEDOR_E_SALDO = 10;
const VENCEDOR = 7;
const EMPATE_CORRETO = 5;

const ZERO = {
    boloes_count: 0,
    palpites_count: 0,
    acertos_exatos: 0,
    palpitou_tudo: false,
    max_pontos_bolao: 0,
    foi_top1: false,
    foi_top3: false,
    campeao_bolao: false,
};

export async function fetchBolaoStats(uid) {
    if (!uid) return { ...ZERO };

    try {
        const [counts, ranking] = await Promise.all([
            query(`
                SELECT
                    (SELECT COUNT(*)::int FROM bolao_members WHERE user_id = $1) AS boloes_count,
                    (SELECT COUNT(*)::int FROM bolao_palpites WHERE user_id = $1) AS palpites_count,
                    (SELECT COUNT(*)::int
                     FROM bolao_palpites p
                     JOIN games g ON g.id = p.game_id
                     WHERE p.user_id = $1
                       AND g.gols_casa IS NOT NULL
                       AND g.gols_visitante IS NOT NULL
                       AND p.gols_casa = g.gols_casa
                       AND p.gols_visitante = g.gols_visitante
                    ) AS acertos_exatos,
                    -- Pelo menos 1 jogo da Copa ja tem resultado (gate p/ top1/top3)
                    EXISTS (
                        SELECT 1 FROM games g
                        JOIN clubs c ON c.id = g.club_id
                        WHERE c.slug = $2 AND g.gols_casa IS NOT NULL
                    ) AS copa_comecou,
                    -- Final ja foi jogada (gate p/ campeao_bolao)
                    EXISTS (
                        SELECT 1 FROM games g
                        JOIN clubs c ON c.id = g.club_id
                        WHERE c.slug = $2
                          AND LOWER(COALESCE(g.fase, '')) = 'final'
                          AND g.gols_casa IS NOT NULL
                    ) AS copa_acabou
            `, [uid, TOURNAMENT_SLUG]),
            query(`
                WITH meus_boloes AS (
                    SELECT bolao_id FROM bolao_members WHERE user_id = $1
                ),
                all_rank AS (
                    SELECT
                        bm.bolao_id,
                        bm.user_id,
                        COALESCE(SUM(
                            CASE
                                WHEN p.gols_casa = g.gols_casa AND p.gols_visitante = g.gols_visitante THEN $2
                                WHEN p.gols_casa = p.gols_visitante AND g.gols_casa = g.gols_visitante THEN $5
                                WHEN SIGN(p.gols_casa - p.gols_visitante) = SIGN(g.gols_casa - g.gols_visitante)
                                    AND (p.gols_casa - p.gols_visitante) = (g.gols_casa - g.gols_visitante) THEN $3
                                WHEN SIGN(p.gols_casa - p.gols_visitante) = SIGN(g.gols_casa - g.gols_visitante) THEN $4
                                ELSE 0
                            END
                        ), 0)::int AS pontos
                    FROM bolao_members bm
                    LEFT JOIN bolao_palpites p
                        ON p.user_id = bm.user_id AND p.bolao_id = bm.bolao_id
                    LEFT JOIN games g
                        ON g.id = p.game_id
                        AND g.gols_casa IS NOT NULL AND g.gols_visitante IS NOT NULL
                    WHERE bm.bolao_id IN (SELECT bolao_id FROM meus_boloes)
                    GROUP BY bm.bolao_id, bm.user_id
                ),
                posicoes AS (
                    SELECT bolao_id, user_id, pontos,
                           RANK() OVER (PARTITION BY bolao_id ORDER BY pontos DESC) AS posicao
                    FROM all_rank
                ),
                jogos_palpitaveis AS (
                    SELECT COUNT(*)::int AS total
                    FROM games g
                    JOIN clubs c ON c.id = g.club_id
                    WHERE c.slug = $6
                      AND g.time_casa IS NOT NULL AND g.time_visitante IS NOT NULL
                      AND g.time_casa <> '?' AND g.time_visitante <> '?'
                ),
                palpites_por_bolao AS (
                    SELECT bolao_id, COUNT(*)::int AS n
                    FROM bolao_palpites
                    WHERE user_id = $1
                    GROUP BY bolao_id
                )
                SELECT
                    MIN(po.posicao)::int AS min_posicao,
                    MAX(po.pontos)::int AS max_pontos,
                    BOOL_OR(pu.n >= jp.total AND jp.total > 0) AS palpitou_tudo
                FROM posicoes po
                LEFT JOIN palpites_por_bolao pu ON pu.bolao_id = po.bolao_id
                CROSS JOIN jogos_palpitaveis jp
                WHERE po.user_id = $1
            `, [uid, PLACAR_EXATO, VENCEDOR_E_SALDO, VENCEDOR, EMPATE_CORRETO, TOURNAMENT_SLUG]),
        ]);

        const c = counts.rows[0] || {};
        const r = ranking.rows[0] || {};
        const minPos = r.min_posicao != null ? r.min_posicao : null;
        const copaComecou = !!c.copa_comecou;
        const copaAcabou = !!c.copa_acabou;

        return {
            boloes_count:      c.boloes_count || 0,
            palpites_count:    c.palpites_count || 0,
            acertos_exatos:    c.acertos_exatos || 0,
            palpitou_tudo:     !!r.palpitou_tudo,
            max_pontos_bolao:  r.max_pontos || 0,
            foi_top1:          copaComecou && minPos === 1,
            foi_top3:          copaComecou && minPos !== null && minPos <= 3,
            campeao_bolao:     copaAcabou && minPos === 1,
        };
    } catch (err) {
        // Tabelas de bolao podem nao existir num ambiente fresh — degrade gracefully
        console.warn('[bolaoStats] fallback to zero:', err.message);
        return { ...ZERO };
    }
}
