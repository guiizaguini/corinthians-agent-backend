import express from 'express';
import { query } from '../db/pool.js';

/**
 * Torneios (World Cup, Libertadores, etc) — clubs com is_tournament=TRUE.
 * requireUser é aplicado upstream.
 */
const router = express.Router();

// =============================================================
// GET /tournaments — lista os torneios disponíveis
// =============================================================
router.get('/', async (req, res, next) => {
    try {
        const { rows } = await query(
            `SELECT id, slug, name, short_name, primary_color, secondary_color, logo_url
             FROM clubs WHERE is_tournament = TRUE
             ORDER BY name`
        );
        res.json({ tournaments: rows });
    } catch (err) { next(err); }
});

// =============================================================
// GET /tournaments/:slug/games — jogos do torneio + attendance do user
// =============================================================
router.get('/:slug/games', async (req, res, next) => {
    try {
        const { rows: club } = await query(
            'SELECT id, slug, name, primary_color, secondary_color, logo_url FROM clubs WHERE slug = $1 AND is_tournament = TRUE',
            [req.params.slug]
        );
        if (!club.length) return res.status(404).json({ error: 'tournament_not_found' });
        const t = club[0];

        const { rows } = await query(
            `SELECT
                g.id, g.data, g.dia_semana, g.time_casa, g.time_visitante,
                g.campeonato, g.estadio, g.gols_casa, g.gols_visitante, g.resultado,
                g.fase, g.autores_gols, g.publico_total,
                a.id AS attendance_id,
                a.status AS status_presenca,
                a.setor, a.assento, a.valor_pago, a.observacoes
             FROM games g
             LEFT JOIN attendances a ON a.game_id = g.id AND a.user_id = $2
             WHERE g.club_id = $1
             ORDER BY g.data ASC, g.id ASC`,
            [t.id, req.user.id]
        );
        res.json({ tournament: t, count: rows.length, games: rows });
    } catch (err) { next(err); }
});

export default router;
