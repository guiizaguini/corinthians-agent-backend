import express from 'express';
import { query } from '../db/pool.js';

/**
 * Catálogo de jogos do clube do usuário.
 * Protegido por requireUser (passado no server.js).
 * Retorna jogos do club_id do req.user, enriquecidos com o
 * registro de presença do próprio user (LEFT JOIN attendances).
 */
const router = express.Router();

// =============================================================
// GET /games — lista jogos do catálogo do clube do user
// Filtros: ano, rival, campeonato, so_presenca (1 = só jogos que tenho attendance)
// =============================================================
router.get('/', async (req, res, next) => {
    try {
        const {
            ano, rival, campeonato, estadio,
            so_presenca,
            limit = 500, offset = 0, order = 'desc',
        } = req.query;

        const conds = ['g.club_id = $1'];
        const params = [req.user.club_id];

        if (ano)        { params.push(parseInt(ano));     conds.push(`EXTRACT(YEAR FROM g.data) = $${params.length}`); }
        if (rival)      { params.push(`%${rival}%`);      conds.push(`(unaccent(g.time_visitante) ILIKE unaccent($${params.length}) OR unaccent(g.time_casa) ILIKE unaccent($${params.length}))`); }
        if (campeonato) { params.push(`%${campeonato}%`); conds.push(`unaccent(g.campeonato) ILIKE unaccent($${params.length})`); }
        if (estadio)    { params.push(`%${estadio}%`);    conds.push(`unaccent(g.estadio) ILIKE unaccent($${params.length})`); }

        if (so_presenca === '1' || so_presenca === 'true') {
            conds.push(`a.id IS NOT NULL AND a.status = 'PRESENTE'`);
        }

        const ord = order === 'asc' ? 'ASC' : 'DESC';
        params.push(req.user.id); // pra LEFT JOIN attendances
        const userIdx = params.length;

        params.push(Math.min(parseInt(limit), 1000));
        params.push(parseInt(offset));

        const sql = `
            SELECT
                g.id, g.data, g.dia_semana, g.time_casa, g.time_visitante,
                g.mando, g.campeonato, g.genero, g.estadio,
                g.gols_casa, g.gols_visitante, g.resultado,
                g.foi_classico, g.teve_penal, g.fase, g.titulo_conquistado,
                g.autores_gols, g.gols_texto, g.publico_total,
                a.id           AS attendance_id,
                a.status       AS status_presenca,
                a.setor        AS setor,
                a.assento      AS assento,
                a.valor_pago   AS valor_pago,
                a.observacoes  AS observacoes,
                COALESCE((
                    SELECT json_agg(json_build_object(
                        'user_id', u.id,
                        'username', u.username,
                        'display_name', u.display_name
                    ))
                    FROM attendance_companions ac
                    JOIN users u ON u.id = ac.companion_user_id
                    WHERE ac.attendance_id = a.id
                ), '[]'::json) AS companions,
                CASE
                    WHEN g.time_casa = (SELECT name FROM clubs WHERE id = g.club_id) THEN g.time_visitante
                    WHEN g.time_visitante = (SELECT name FROM clubs WHERE id = g.club_id) THEN g.time_casa
                    ELSE g.time_casa || ' x ' || g.time_visitante
                END AS adversario
            FROM games g
            LEFT JOIN attendances a
              ON a.game_id = g.id AND a.user_id = $${userIdx}
            WHERE ${conds.join(' AND ')}
            ORDER BY g.data ${ord}, g.id ${ord}
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `;
        const { rows } = await query(sql, params);

        const { rows: countRows } = await query(
            `SELECT COUNT(*)::int AS total
             FROM games g
             LEFT JOIN attendances a ON a.game_id = g.id AND a.user_id = $${userIdx}
             WHERE ${conds.join(' AND ')}`,
            params.slice(0, userIdx)
        );

        res.json({ total: countRows[0].total, count: rows.length, games: rows });
    } catch (err) { next(err); }
});

// =============================================================
// GET /games/:id
// =============================================================
router.get('/:id', async (req, res, next) => {
    try {
        const { rows } = await query(
            `SELECT
                g.*,
                a.id AS attendance_id, a.status AS status_presenca,
                a.setor, a.assento, a.valor_pago, a.observacoes
             FROM games g
             LEFT JOIN attendances a ON a.game_id = g.id AND a.user_id = $1
             WHERE g.id = $2 AND g.club_id = $3`,
            [req.user.id, req.params.id, req.user.club_id]
        );
        if (!rows.length) return res.status(404).json({ error: 'game_not_found' });
        res.json(rows[0]);
    } catch (err) { next(err); }
});

export default router;
