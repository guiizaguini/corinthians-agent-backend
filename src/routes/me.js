import express from 'express';
import { query } from '../db/pool.js';

/**
 * Estatísticas por usuário autenticado.
 * Monta o "snapshot" completo que a dashboard consome, mas filtrado
 * pelas attendances do próprio user (status='PRESENTE').
 */
const router = express.Router();

// Compartilha os filtros "jogos que o user efetivamente foi"
// user_id é $1, club_id é $2 em todas as queries abaixo.
const WHERE_PRESENTE = `
    a.user_id = $1
    AND a.status = 'PRESENTE'
    AND g.club_id = $2
    AND g.resultado IS NOT NULL
`;

// =============================================================
// GET /me/snapshot — tudo que o dashboard precisa, numa chamada só
// =============================================================
router.get('/snapshot', async (req, res, next) => {
    try {
        const uid = req.user.id;
        const cid = req.user.club_id;

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
            classicos,
            all_games,
            club_info,
        ] = await Promise.all([
            query(`
                SELECT
                    COUNT(*)::int AS jogos,
                    SUM(CASE WHEN g.resultado='V' THEN 1 ELSE 0 END)::int AS vitorias,
                    SUM(CASE WHEN g.resultado='E' THEN 1 ELSE 0 END)::int AS empates,
                    SUM(CASE WHEN g.resultado='D' THEN 1 ELSE 0 END)::int AS derrotas,
                    COALESCE(SUM(CASE WHEN g.time_casa = c.name THEN g.gols_casa ELSE g.gols_visitante END), 0)::int AS gols_pro,
                    COALESCE(SUM(CASE WHEN g.time_casa = c.name THEN g.gols_visitante ELSE g.gols_casa END), 0)::int AS gols_contra,
                    ROUND(
                        (SUM(CASE WHEN g.resultado='V' THEN 3 ELSE 0 END)
                         + SUM(CASE WHEN g.resultado='E' THEN 1 ELSE 0 END))::numeric
                        / NULLIF(COUNT(*)*3, 0) * 100,
                        2
                    ) AS aproveitamento_pct,
                    COUNT(*) FILTER (WHERE g.foi_classico = TRUE)::int AS classicos,
                    COUNT(*) FILTER (WHERE g.teve_penal = TRUE)::int AS jogos_com_penal
                FROM attendances a
                JOIN games g ON g.id = a.game_id
                JOIN clubs c ON c.id = g.club_id
                WHERE ${WHERE_PRESENTE}
            `, [uid, cid]),

            query(`
                SELECT
                    EXTRACT(YEAR FROM g.data)::int AS ano,
                    COUNT(*)::int AS jogos,
                    SUM(CASE WHEN g.resultado='V' THEN 1 ELSE 0 END)::int AS vitorias,
                    SUM(CASE WHEN g.resultado='E' THEN 1 ELSE 0 END)::int AS empates,
                    SUM(CASE WHEN g.resultado='D' THEN 1 ELSE 0 END)::int AS derrotas,
                    COALESCE(SUM(CASE WHEN g.time_casa = c.name THEN g.gols_casa ELSE g.gols_visitante END), 0)::int AS gols_pro,
                    COALESCE(SUM(CASE WHEN g.time_casa = c.name THEN g.gols_visitante ELSE g.gols_casa END), 0)::int AS gols_contra,
                    ROUND(
                        (SUM(CASE WHEN g.resultado='V' THEN 3 ELSE 0 END)
                         + SUM(CASE WHEN g.resultado='E' THEN 1 ELSE 0 END))::numeric
                        / NULLIF(COUNT(*)*3, 0) * 100,
                        2
                    ) AS aproveitamento_pct
                FROM attendances a
                JOIN games g ON g.id = a.game_id
                JOIN clubs c ON c.id = g.club_id
                WHERE ${WHERE_PRESENTE}
                GROUP BY ano
                ORDER BY ano
            `, [uid, cid]),

            query(`
                SELECT
                    g.campeonato,
                    COUNT(*)::int AS jogos,
                    SUM(CASE WHEN g.resultado='V' THEN 1 ELSE 0 END)::int AS vitorias,
                    SUM(CASE WHEN g.resultado='E' THEN 1 ELSE 0 END)::int AS empates,
                    SUM(CASE WHEN g.resultado='D' THEN 1 ELSE 0 END)::int AS derrotas,
                    COALESCE(SUM(CASE WHEN g.time_casa = c.name THEN g.gols_casa ELSE g.gols_visitante END), 0)::int AS gols_pro,
                    COALESCE(SUM(CASE WHEN g.time_casa = c.name THEN g.gols_visitante ELSE g.gols_casa END), 0)::int AS gols_contra,
                    ROUND(
                        (SUM(CASE WHEN g.resultado='V' THEN 3 ELSE 0 END)
                         + SUM(CASE WHEN g.resultado='E' THEN 1 ELSE 0 END))::numeric
                        / NULLIF(COUNT(*)*3, 0) * 100,
                        2
                    ) AS aproveitamento_pct
                FROM attendances a
                JOIN games g ON g.id = a.game_id
                JOIN clubs c ON c.id = g.club_id
                WHERE ${WHERE_PRESENTE}
                GROUP BY g.campeonato
                ORDER BY jogos DESC
            `, [uid, cid]),

            query(`
                SELECT
                    CASE WHEN g.time_casa = c.name THEN g.time_visitante ELSE g.time_casa END AS adversario,
                    COUNT(*)::int AS jogos,
                    SUM(CASE WHEN g.resultado='V' THEN 1 ELSE 0 END)::int AS vitorias,
                    SUM(CASE WHEN g.resultado='E' THEN 1 ELSE 0 END)::int AS empates,
                    SUM(CASE WHEN g.resultado='D' THEN 1 ELSE 0 END)::int AS derrotas,
                    COALESCE(SUM(CASE WHEN g.time_casa = c.name THEN g.gols_casa ELSE g.gols_visitante END), 0)::int AS gols_pro,
                    COALESCE(SUM(CASE WHEN g.time_casa = c.name THEN g.gols_visitante ELSE g.gols_casa END), 0)::int AS gols_contra
                FROM attendances a
                JOIN games g ON g.id = a.game_id
                JOIN clubs c ON c.id = g.club_id
                WHERE ${WHERE_PRESENTE}
                GROUP BY adversario
                ORDER BY jogos DESC, adversario
            `, [uid, cid]),

            query(`
                SELECT
                    g.estadio,
                    COUNT(*)::int AS jogos,
                    SUM(CASE WHEN g.resultado='V' THEN 1 ELSE 0 END)::int AS vitorias,
                    SUM(CASE WHEN g.resultado='E' THEN 1 ELSE 0 END)::int AS empates,
                    SUM(CASE WHEN g.resultado='D' THEN 1 ELSE 0 END)::int AS derrotas
                FROM attendances a
                JOIN games g ON g.id = a.game_id
                WHERE a.user_id = $1 AND a.status = 'PRESENTE'
                  AND g.club_id = $2 AND g.resultado IS NOT NULL
                GROUP BY g.estadio
                ORDER BY jogos DESC
            `, [uid, cid]),

            query(`
                SELECT
                    a.setor,
                    COUNT(*)::int AS jogos,
                    SUM(CASE WHEN g.resultado='V' THEN 1 ELSE 0 END)::int AS vitorias,
                    SUM(CASE WHEN g.resultado='E' THEN 1 ELSE 0 END)::int AS empates,
                    SUM(CASE WHEN g.resultado='D' THEN 1 ELSE 0 END)::int AS derrotas,
                    ROUND(AVG(a.valor_pago) FILTER (WHERE a.valor_pago > 0), 2) AS ticket_medio
                FROM attendances a
                JOIN games g ON g.id = a.game_id
                WHERE a.user_id = $1 AND a.status = 'PRESENTE' AND g.club_id = $2
                  AND a.setor IS NOT NULL AND a.setor <> ''
                GROUP BY a.setor
                ORDER BY jogos DESC
            `, [uid, cid]),

            query(`
                SELECT
                    COUNT(*) FILTER (WHERE a.valor_pago IS NOT NULL AND a.valor_pago > 0)::int AS ingressos_pagos,
                    COALESCE(SUM(a.valor_pago), 0)::numeric AS gasto_total,
                    ROUND(AVG(a.valor_pago) FILTER (WHERE a.valor_pago > 0), 2) AS ticket_medio,
                    MIN(a.valor_pago) FILTER (WHERE a.valor_pago > 0) AS mais_barato,
                    MAX(a.valor_pago) AS mais_caro
                FROM attendances a
                JOIN games g ON g.id = a.game_id
                WHERE a.user_id = $1 AND g.club_id = $2
            `, [uid, cid]),

            query(`
                SELECT
                    EXTRACT(YEAR FROM g.data)::int AS ano,
                    COUNT(*) FILTER (WHERE a.valor_pago IS NOT NULL)::int AS ingressos_pagos,
                    COALESCE(SUM(a.valor_pago), 0)::numeric AS gasto_total,
                    ROUND(AVG(a.valor_pago) FILTER (WHERE a.valor_pago > 0), 2) AS ticket_medio,
                    MIN(a.valor_pago) FILTER (WHERE a.valor_pago > 0) AS ingresso_mais_barato,
                    MAX(a.valor_pago) AS ingresso_mais_caro
                FROM attendances a
                JOIN games g ON g.id = a.game_id
                WHERE a.user_id = $1 AND g.club_id = $2
                  AND a.valor_pago IS NOT NULL AND a.valor_pago > 0
                GROUP BY ano
                ORDER BY ano
            `, [uid, cid]),

            query(`
                SELECT
                    g.id, g.data, g.time_casa, g.time_visitante,
                    g.gols_casa, g.gols_visitante, g.campeonato, g.estadio,
                    g.resultado, g.foi_classico,
                    CASE WHEN g.time_casa = c.name THEN g.time_visitante ELSE g.time_casa END AS adversario,
                    ABS(g.gols_casa - g.gols_visitante) AS saldo_abs
                FROM attendances a
                JOIN games g ON g.id = a.game_id
                JOIN clubs c ON c.id = g.club_id
                WHERE a.user_id = $1 AND a.status = 'PRESENTE' AND g.club_id = $2
                  AND g.resultado = 'V' AND g.gols_casa IS NOT NULL
                ORDER BY ABS(g.gols_casa - g.gols_visitante) DESC, g.data DESC
                LIMIT 10
            `, [uid, cid]),

            query(`
                SELECT
                    g.id, g.data, g.time_casa, g.time_visitante,
                    g.gols_casa, g.gols_visitante, g.campeonato, g.estadio, g.resultado,
                    CASE WHEN g.time_casa = c.name THEN g.time_visitante ELSE g.time_casa END AS adversario
                FROM attendances a
                JOIN games g ON g.id = a.game_id
                JOIN clubs c ON c.id = g.club_id
                WHERE a.user_id = $1 AND a.status = 'PRESENTE' AND g.club_id = $2
                  AND g.foi_classico = TRUE
                ORDER BY g.data DESC
            `, [uid, cid]),

            query(`
                SELECT
                    g.id, g.data, g.dia_semana, g.time_casa, g.time_visitante,
                    g.campeonato, g.genero, g.estadio,
                    g.gols_casa, g.gols_visitante, g.resultado,
                    g.foi_classico, g.teve_penal, g.mando, g.fase,
                    g.titulo_conquistado, g.autores_gols, g.gols_texto, g.publico_total,
                    a.status AS status_presenca,
                    a.setor, a.assento, a.valor_pago, a.observacoes,
                    CASE WHEN g.time_casa = c.name THEN g.time_visitante
                         WHEN g.time_visitante = c.name THEN g.time_casa
                         ELSE g.time_casa || ' x ' || g.time_visitante END AS adversario
                FROM attendances a
                JOIN games g ON g.id = a.game_id
                JOIN clubs c ON c.id = g.club_id
                WHERE a.user_id = $1 AND g.club_id = $2
                ORDER BY g.data DESC
            `, [uid, cid]),

            query(
                `SELECT id, slug, name, short_name, primary_color, secondary_color
                 FROM clubs WHERE id = $1`,
                [cid]
            ),
        ]);

        const g = geral.rows[0] ?? {};
        g.saldo_gols = (parseInt(g.gols_pro) || 0) - (parseInt(g.gols_contra) || 0);

        res.json({
            club: club_info.rows[0] ?? null,
            user: {
                id: req.user.id,
                email: req.user.email,
                display_name: req.user.display_name,
            },
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
            classicos: classicos.rows,
            jogos: all_games.rows,
            ts: new Date().toISOString(),
        });
    } catch (err) { next(err); }
});

export default router;
