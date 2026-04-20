import express from 'express';
import { query } from '../db/pool.js';

const router = express.Router();

// =============================================================
// GET /estatisticas/retrospecto
// Retrospecto geral + filtros opcionais por ano/campeonato/rival
// =============================================================
router.get('/retrospecto', async (req, res, next) => {
    try {
        const { ano, campeonato, rival } = req.query;
        const conds = ['is_corinthians = TRUE', "status_presenca = 'PRESENTE'", 'resultado IS NOT NULL'];
        const params = [];

        if (ano)         { params.push(parseInt(ano));      conds.push(`EXTRACT(YEAR FROM data) = $${params.length}`); }
        if (campeonato)  { params.push(`%${campeonato}%`);  conds.push(`unaccent(campeonato) ILIKE unaccent($${params.length})`); }
        if (rival)       { params.push(`%${rival}%`);       conds.push(`(unaccent(time_visitante) ILIKE unaccent($${params.length}) OR unaccent(time_casa) ILIKE unaccent($${params.length}))`); }

        console.log('[retrospecto] filtros:', { ano, campeonato, rival }, 'SQL conds:', conds, 'params:', params);

        const { rows } = await query(`
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
                ) AS aproveitamento_pct
            FROM jogos
            WHERE ${conds.join(' AND ')}
        `, params);

        const r = rows[0] ?? {};
        r.saldo_gols = (r.gols_pro ?? 0) - (r.gols_contra ?? 0);
        console.log('[retrospecto] resultado:', r);
        res.json({ filtros: { ano, campeonato, rival }, retrospecto: r });
    } catch (err) {
        console.error('[retrospecto] ERRO:', err);
        next(err);
    }
});

// =============================================================
// GET /estatisticas/por-ano
// =============================================================
router.get('/por-ano', async (req, res, next) => {
    try {
        const { rows } = await query('SELECT * FROM v_retrospecto_por_ano');
        res.json(rows);
    } catch (err) { next(err); }
});

// =============================================================
// GET /estatisticas/por-campeonato
// =============================================================
router.get('/por-campeonato', async (req, res, next) => {
    try {
        const { rows } = await query('SELECT * FROM v_retrospecto_por_campeonato');
        res.json(rows);
    } catch (err) { next(err); }
});

// =============================================================
// GET /estatisticas/por-rival
// Query params:
//   top        — limita quantos retornar
//   order_by   — jogos | vitorias | empates | derrotas | gols_pro | gols_contra
//   order_dir  — asc | desc (default desc)
// =============================================================
router.get('/por-rival', async (req, res, next) => {
    try {
        const { top, order_by, order_dir } = req.query;

        const ORDER_WHITELIST = ['jogos','vitorias','empates','derrotas','gols_pro','gols_contra','adversario'];
        const col = ORDER_WHITELIST.includes(order_by) ? order_by : 'jogos';
        const dir = order_dir === 'asc' ? 'ASC' : 'DESC';

        const params = [];
        let sql = `SELECT * FROM v_retrospecto_por_rival ORDER BY ${col} ${dir}, adversario ASC`;
        if (top) { params.push(parseInt(top)); sql += ` LIMIT $${params.length}`; }

        const { rows } = await query(sql, params);
        res.json(rows);
    } catch (err) { next(err); }
});

// =============================================================
// GET /estatisticas/por-estadio
// =============================================================
router.get('/por-estadio', async (req, res, next) => {
    try {
        const { rows } = await query('SELECT * FROM v_retrospecto_por_estadio');
        res.json(rows);
    } catch (err) { next(err); }
});

// =============================================================
// GET /estatisticas/por-setor
// Query params:
//   top        — limita quantos retornar
//   order_by   — jogos | vitorias | empates | derrotas | ticket_medio
//   order_dir  — asc | desc (default desc)
// =============================================================
router.get('/por-setor', async (req, res, next) => {
    try {
        const { top, order_by, order_dir } = req.query;

        const ORDER_WHITELIST = ['jogos','vitorias','empates','derrotas','ticket_medio','setor'];
        const col = ORDER_WHITELIST.includes(order_by) ? order_by : 'jogos';
        const dir = order_dir === 'asc' ? 'ASC' : 'DESC';

        const params = [];
        let sql = `SELECT * FROM v_retrospecto_por_setor ORDER BY ${col} ${dir} NULLS LAST, setor ASC`;
        if (top) { params.push(parseInt(top)); sql += ` LIMIT $${params.length}`; }

        const { rows } = await query(sql, params);
        res.json(rows);
    } catch (err) { next(err); }
});

// =============================================================
// GET /estatisticas/gastos
// =============================================================
router.get('/gastos', async (req, res, next) => {
    try {
        const { rows: total } = await query(`
            SELECT
                COUNT(*) FILTER (WHERE valor_pago IS NOT NULL AND valor_pago > 0)::int AS ingressos_pagos,
                COALESCE(SUM(valor_pago), 0)::numeric AS gasto_total,
                ROUND(AVG(valor_pago) FILTER (WHERE valor_pago > 0), 2) AS ticket_medio,
                MIN(valor_pago) FILTER (WHERE valor_pago > 0) AS mais_barato,
                MAX(valor_pago) AS mais_caro
            FROM jogos
        `);
        const { rows: porAno } = await query('SELECT * FROM v_gastos_por_ano');
        res.json({ total: total[0], por_ano: porAno });
    } catch (err) { next(err); }
});

// =============================================================
// GET /estatisticas/resumo
// Tudo que o agente geralmente precisa em uma chamada só
// =============================================================
router.get('/resumo', async (req, res, next) => {
    try {
        const [geral, ano, camp, rival, estadio, gastos] = await Promise.all([
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
                    ) AS aproveitamento_pct
                FROM jogos
                WHERE is_corinthians = TRUE AND status_presenca = 'PRESENTE' AND resultado IS NOT NULL
            `),
            query('SELECT * FROM v_retrospecto_por_ano'),
            query('SELECT * FROM v_retrospecto_por_campeonato'),
            query('SELECT * FROM v_retrospecto_por_rival LIMIT 15'),
            query('SELECT * FROM v_retrospecto_por_estadio'),
            query(`
                SELECT
                    COALESCE(SUM(valor_pago), 0)::numeric AS gasto_total,
                    ROUND(AVG(valor_pago) FILTER (WHERE valor_pago > 0), 2) AS ticket_medio
                FROM jogos
            `),
        ]);

        res.json({
            geral: geral.rows[0],
            gastos: gastos.rows[0],
            por_ano: ano.rows,
            por_campeonato: camp.rows,
            top_rivais: rival.rows,
            por_estadio: estadio.rows,
        });
    } catch (err) { next(err); }
});

export default router;
