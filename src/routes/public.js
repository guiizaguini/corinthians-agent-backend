import express from 'express';
import { query } from '../db/pool.js';

/**
 * Rotas PÚBLICAS (sem API key) que servem somente dados READ-ONLY
 * pros dashboards. Nenhum campo sensível é exposto.
 */
const router = express.Router();

// =============================================================
// GET /public/snapshot
// Uma chamada só com TUDO que o dashboard precisa.
// =============================================================
router.get('/snapshot', async (req, res, next) => {
    try {
        const [
            geral,
            por_ano,
            por_campeonato,
            por_rival,
            por_estadio,
            por_setor,
            gastos_total,
            gastos_por_ano,
            top_goleadas,
            top_classicos,
            jogos,
        ] = await Promise.all([
            // Retrospecto geral
            query(`
                SELECT
                    COUNT(*)::int AS jogos,
                    SUM(CASE WHEN resultado='V' THEN 1 ELSE 0 END)::int AS vitorias,
                    SUM(CASE WHEN resultado='E' THEN 1 ELSE 0 END)::int AS empates,
                    SUM(CASE WHEN resultado='D' THEN 1 ELSE 0 END)::int AS derrotas,
                    COALESCE(SUM(CASE WHEN time_casa='Corinthians' THEN gols_casa ELSE gols_visitante END), 0)::int AS gols_pro,
                    COALESCE(SUM(CASE WHEN time_casa='Corinthians' THEN gols_visitante ELSE gols_casa END), 0)::int AS gols_contra,
                    ROUND(
                        (SUM(CASE WHEN resultado='V' THEN 3 ELSE 0 END)
                         + SUM(CASE WHEN resultado='E' THEN 1 ELSE 0 END))::numeric
                        / NULLIF(COUNT(*)*3, 0) * 100,
                        2
                    ) AS aproveitamento_pct,
                    COUNT(*) FILTER (WHERE foi_classico = TRUE)::int AS classicos,
                    COUNT(*) FILTER (WHERE teve_penal = TRUE)::int AS jogos_com_penal
                FROM jogos
                WHERE is_corinthians = TRUE AND status_presenca = 'PRESENTE' AND resultado IS NOT NULL
            `),
            query('SELECT * FROM v_retrospecto_por_ano'),
            query('SELECT * FROM v_retrospecto_por_campeonato'),
            query('SELECT * FROM v_retrospecto_por_rival'),
            query('SELECT * FROM v_retrospecto_por_estadio'),
            query(`
                SELECT setor,
                    COUNT(*)::int AS jogos,
                    SUM(CASE WHEN resultado='V' THEN 1 ELSE 0 END)::int AS vitorias,
                    SUM(CASE WHEN resultado='E' THEN 1 ELSE 0 END)::int AS empates,
                    SUM(CASE WHEN resultado='D' THEN 1 ELSE 0 END)::int AS derrotas,
                    ROUND(AVG(valor_pago) FILTER (WHERE valor_pago > 0), 2) AS ticket_medio
                FROM jogos
                WHERE is_corinthians = TRUE AND status_presenca = 'PRESENTE'
                  AND setor IS NOT NULL
                GROUP BY setor
                ORDER BY jogos DESC
            `),
            query(`
                SELECT
                    COUNT(*) FILTER (WHERE valor_pago IS NOT NULL AND valor_pago > 0)::int AS ingressos_pagos,
                    COALESCE(SUM(valor_pago), 0)::numeric AS gasto_total,
                    ROUND(AVG(valor_pago) FILTER (WHERE valor_pago > 0), 2) AS ticket_medio,
                    MIN(valor_pago) FILTER (WHERE valor_pago > 0) AS mais_barato,
                    MAX(valor_pago) AS mais_caro
                FROM jogos
            `),
            query('SELECT * FROM v_gastos_por_ano'),
            // Top goleadas (maior saldo positivo)
            query(`
                SELECT
                    id, data, time_casa, time_visitante, gols_casa, gols_visitante,
                    campeonato, estadio, resultado, foi_classico,
                    CASE WHEN time_casa='Corinthians' THEN time_visitante ELSE time_casa END AS adversario,
                    ABS(gols_casa - gols_visitante) AS saldo_abs
                FROM jogos
                WHERE is_corinthians = TRUE AND status_presenca = 'PRESENTE'
                  AND resultado = 'V' AND gols_casa IS NOT NULL
                ORDER BY ABS(gols_casa - gols_visitante) DESC, data DESC
                LIMIT 10
            `),
            // Todos os clássicos
            query(`
                SELECT
                    id, data, time_casa, time_visitante, gols_casa, gols_visitante,
                    campeonato, estadio, resultado,
                    CASE WHEN time_casa='Corinthians' THEN time_visitante ELSE time_casa END AS adversario
                FROM jogos
                WHERE is_corinthians = TRUE AND status_presenca = 'PRESENTE' AND foi_classico = TRUE
                ORDER BY data DESC
            `),
            // Todos os jogos (pra tabela filtrável)
            query(`
                SELECT
                    id, data, dia_semana, time_casa, time_visitante, campeonato, genero,
                    estadio, status_presenca, setor, assento, valor_pago,
                    gols_casa, gols_visitante, resultado, foi_classico, teve_penal,
                    is_corinthians, mando, fase, titulo_conquistado, autores_gols, publico_total, observacoes,
                    CASE WHEN time_casa='Corinthians' THEN time_visitante
                         WHEN time_visitante='Corinthians' THEN time_casa
                         ELSE time_casa || ' x ' || time_visitante END AS adversario
                FROM jogos
                ORDER BY data DESC
            `),
        ]);

        const g = geral.rows[0] ?? {};
        g.saldo_gols = (parseInt(g.gols_pro) || 0) - (parseInt(g.gols_contra) || 0);

        res.json({
            geral: g,
            por_ano: por_ano.rows,
            por_campeonato: por_campeonato.rows,
            por_rival: por_rival.rows,
            por_estadio: por_estadio.rows,
            por_setor: por_setor.rows,
            gastos: {
                total: gastos_total.rows[0],
                por_ano: gastos_por_ano.rows,
            },
            top_goleadas: top_goleadas.rows,
            classicos: top_classicos.rows,
            jogos: jogos.rows,
            ts: new Date().toISOString(),
        });
    } catch (err) { next(err); }
});

export default router;
