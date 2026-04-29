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
                g.id, g.data, g.dia_semana, g.horario, g.time_casa, g.time_visitante,
                g.campeonato, g.estadio, g.gols_casa, g.gols_visitante, g.resultado,
                g.fase, g.autores_gols, g.publico_total,
                a.id AS attendance_id,
                a.status AS status_presenca,
                a.setor, a.assento, a.valor_pago, a.observacoes
             FROM games g
             LEFT JOIN attendances a ON a.game_id = g.id AND a.user_id = $2
             WHERE g.club_id = $1
             ORDER BY g.data ASC, g.horario ASC NULLS LAST, g.id ASC`,
            [t.id, req.user.id]
        );
        res.json({ tournament: t, count: rows.length, games: rows });
    } catch (err) { next(err); }
});

// =============================================================
// GET /tournaments/:slug/standings — tabela dos grupos do torneio
// Calcula PJ/V/E/D/GP/GC/SG/Pts pra cada selecao em cada grupo, baseado nos
// jogos com placar real (gols_casa/visitante). Atualiza automaticamente
// conforme o admin lanca resultados.
// =============================================================
router.get('/:slug/standings', async (req, res, next) => {
    try {
        const { rows: club } = await query(
            'SELECT id, slug, name FROM clubs WHERE slug = $1 AND is_tournament = TRUE',
            [req.params.slug]
        );
        if (!club.length) return res.status(404).json({ error: 'tournament_not_found' });
        const tournamentId = club[0].id;

        // Calcula stats agregados por (grupo, selecao). album_selecoes provê o
        // catalogo canonico de 48 selecoes + grupo (A..L). LEFT JOIN com os
        // games da fase de grupos (fase ~ 'Grupo [A-L]'), agregando como home
        // OU away. unaccent + LOWER pra evitar mismatch tipo "Mexico" vs "México".
        const { rows } = await query(`
            WITH grupo_games AS (
                SELECT
                    SUBSTRING(g.fase FROM 'Grupo ([A-L])') AS grupo,
                    g.time_casa, g.time_visitante,
                    g.gols_casa, g.gols_visitante
                FROM games g
                WHERE g.club_id = $1
                  AND g.fase ~ 'Grupo [A-L]'
                  AND g.gols_casa IS NOT NULL
                  AND g.gols_visitante IS NOT NULL
            ),
            team_appearances AS (
                SELECT grupo, LOWER(unaccent(time_casa)) AS time_norm,
                       gols_casa AS gols_pro, gols_visitante AS gols_contra
                FROM grupo_games
                UNION ALL
                SELECT grupo, LOWER(unaccent(time_visitante)) AS time_norm,
                       gols_visitante AS gols_pro, gols_casa AS gols_contra
                FROM grupo_games
            )
            SELECT
                s.grupo,
                s.code,
                s.name,
                s.flag_iso,
                s.ordem,
                COALESCE(COUNT(ta.time_norm), 0)::int AS pj,
                COALESCE(SUM(CASE WHEN ta.gols_pro > ta.gols_contra THEN 1 ELSE 0 END), 0)::int AS v,
                COALESCE(SUM(CASE WHEN ta.gols_pro = ta.gols_contra THEN 1 ELSE 0 END), 0)::int AS e,
                COALESCE(SUM(CASE WHEN ta.gols_pro < ta.gols_contra THEN 1 ELSE 0 END), 0)::int AS d,
                COALESCE(SUM(ta.gols_pro), 0)::int AS gp,
                COALESCE(SUM(ta.gols_contra), 0)::int AS gc,
                COALESCE(SUM(ta.gols_pro - ta.gols_contra), 0)::int AS sg,
                COALESCE(
                    SUM(CASE WHEN ta.gols_pro > ta.gols_contra THEN 3
                             WHEN ta.gols_pro = ta.gols_contra THEN 1 ELSE 0 END),
                    0
                )::int AS pts
            FROM album_selecoes s
            LEFT JOIN team_appearances ta
                ON ta.grupo = s.grupo
                AND ta.time_norm = LOWER(unaccent(s.name))
            WHERE s.grupo IS NOT NULL AND s.grupo <> ''
            GROUP BY s.grupo, s.code, s.name, s.flag_iso, s.ordem
            ORDER BY s.grupo, pts DESC, sg DESC, gp DESC, s.name
        `, [tournamentId]);

        // Agrupa por letra do grupo pra retorno mais ergonomico
        const groups = {};
        for (const r of rows) {
            if (!groups[r.grupo]) groups[r.grupo] = [];
            groups[r.grupo].push(r);
        }
        // Adiciona posicao (1..4) dentro de cada grupo apos sort
        for (const letra of Object.keys(groups)) {
            groups[letra].forEach((t, i) => { t.pos = i + 1; });
        }

        res.json({ tournament: club[0], groups });
    } catch (err) { next(err); }
});

export default router;
