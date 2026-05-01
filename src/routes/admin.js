import express from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { invalidate } from '../utils/cache.js';
import { logUser } from '../utils/logger.js';

/**
 * Rotas administrativas — assume requireUser + requireAdmin upstream.
 * Permite CRUD de games em todos os clubes.
 */
const router = express.Router();

const DIAS_SEMANA = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];

function diaDaSemana(dateStr) {
    const d = new Date(dateStr + 'T12:00:00Z');
    const idx = d.getUTCDay();
    return DIAS_SEMANA[(idx + 6) % 7];
}

function inferirMandoEResultado({ time_casa, time_visitante, club_name, gols_casa, gols_visitante }) {
    let mando = 'NEUTRO';
    if (time_casa === club_name) mando = 'MANDANTE';
    else if (time_visitante === club_name) mando = 'VISITANTE';

    let resultado = null;
    if (gols_casa != null && gols_visitante != null && (time_casa === club_name || time_visitante === club_name)) {
        const golsPro = time_casa === club_name ? gols_casa : gols_visitante;
        const golsCon = time_casa === club_name ? gols_visitante : gols_casa;
        if (golsPro > golsCon) resultado = 'V';
        else if (golsPro < golsCon) resultado = 'D';
        else resultado = 'E';
    }

    return { mando, resultado };
}

const AutorGolSchema = z.object({
    time: z.string().min(1).max(60),
    autor: z.string().min(1).max(80),
    minuto: z.number().int().min(0).max(150).nullable().optional(),
});

const GameCreateSchema = z.object({
    club_id: z.number().int().positive(),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD'),
    time_casa: z.string().min(1).max(60),
    time_visitante: z.string().min(1).max(60),
    campeonato: z.string().max(40).optional().nullable(),
    genero: z.enum(['M', 'F', 'S-20']).optional().default('M'),
    estadio: z.string().max(60).optional().nullable(),
    gols_casa: z.number().int().min(0).max(99).optional().nullable(),
    gols_visitante: z.number().int().min(0).max(99).optional().nullable(),
    foi_classico: z.boolean().optional().default(false),
    teve_penal: z.boolean().optional().default(false),
    fase: z.string().max(40).optional().nullable(),
    titulo_conquistado: z.string().max(60).optional().nullable(),
    publico_total: z.number().int().min(0).optional().nullable(),
    autores_gols: z.array(AutorGolSchema).optional().nullable(),
});

const GameUpdateSchema = GameCreateSchema.partial().omit({ club_id: true });

async function getClubById(clubId) {
    const { rows } = await query('SELECT id, name FROM clubs WHERE id = $1', [clubId]);
    return rows[0] || null;
}

// =============================================================
// GET /admin/clubs — lista TODOS os clubes (inclui tournaments hidden)
// =============================================================
router.get('/clubs', async (req, res, next) => {
    try {
        const { rows } = await query(
            `SELECT id, slug, name, short_name, primary_color, secondary_color, is_tournament, logo_url
             FROM clubs ORDER BY is_tournament ASC, name ASC`
        );
        res.json({ clubs: rows });
    } catch (err) { next(err); }
});

// =============================================================
// GET /admin/games — lista com filtros (paginado)
// =============================================================
router.get('/games', async (req, res, next) => {
    try {
        const { club_id, ano, search, limit = 50, offset = 0 } = req.query;

        const conds = [];
        const params = [];

        if (club_id) { params.push(parseInt(club_id)); conds.push(`g.club_id = $${params.length}`); }
        if (ano)     { params.push(parseInt(ano));     conds.push(`EXTRACT(YEAR FROM g.data) = $${params.length}`); }
        if (search)  {
            params.push(`%${search}%`);
            conds.push(`(unaccent(g.time_casa) ILIKE unaccent($${params.length})
                      OR unaccent(g.time_visitante) ILIKE unaccent($${params.length})
                      OR unaccent(g.campeonato) ILIKE unaccent($${params.length})
                      OR unaccent(g.estadio) ILIKE unaccent($${params.length}))`);
        }

        const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
        params.push(Math.min(parseInt(limit), 500));
        params.push(parseInt(offset));

        const { rows } = await query(
            `SELECT g.*, c.slug AS club_slug, c.name AS club_name
             FROM games g JOIN clubs c ON c.id = g.club_id
             ${where}
             ORDER BY g.data DESC, g.id DESC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        const { rows: countRows } = await query(
            `SELECT COUNT(*)::int AS total FROM games g ${where}`,
            params.slice(0, params.length - 2)
        );

        res.json({ total: countRows[0].total, count: rows.length, games: rows });
    } catch (err) { next(err); }
});

// =============================================================
// POST /admin/games — cria jogo novo no catálogo de um clube
// =============================================================
router.post('/games', async (req, res, next) => {
    try {
        const parsed = GameCreateSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: 'validation_failed',
                detalhes: parsed.error.flatten().fieldErrors,
            });
        }
        const b = parsed.data;

        const club = await getClubById(b.club_id);
        if (!club) return res.status(400).json({ error: 'club_not_found' });

        const dia_semana = diaDaSemana(b.data);
        const { mando, resultado } = inferirMandoEResultado({
            time_casa: b.time_casa,
            time_visitante: b.time_visitante,
            club_name: club.name,
            gols_casa: b.gols_casa,
            gols_visitante: b.gols_visitante,
        });

        const autoresJson = b.autores_gols && b.autores_gols.length ? JSON.stringify(b.autores_gols) : null;
        const { rows } = await query(
            `INSERT INTO games (
                club_id, data, dia_semana, time_casa, time_visitante, mando,
                campeonato, genero, estadio, gols_casa, gols_visitante, resultado,
                foi_classico, teve_penal, fase, titulo_conquistado, publico_total, autores_gols
             ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb
             )
             ON CONFLICT (club_id, data, time_casa, time_visitante, genero)
             DO UPDATE SET
                gols_casa = EXCLUDED.gols_casa,
                gols_visitante = EXCLUDED.gols_visitante,
                resultado = EXCLUDED.resultado,
                estadio = EXCLUDED.estadio,
                campeonato = EXCLUDED.campeonato,
                foi_classico = EXCLUDED.foi_classico,
                teve_penal = EXCLUDED.teve_penal,
                fase = EXCLUDED.fase,
                titulo_conquistado = EXCLUDED.titulo_conquistado,
                publico_total = EXCLUDED.publico_total,
                autores_gols = EXCLUDED.autores_gols
             RETURNING *`,
            [
                b.club_id, b.data, dia_semana, b.time_casa, b.time_visitante, mando,
                b.campeonato ?? null, b.genero ?? 'M', b.estadio ?? null,
                b.gols_casa ?? null, b.gols_visitante ?? null, resultado,
                b.foi_classico ?? false, b.teve_penal ?? false,
                b.fase ?? null, b.titulo_conquistado ?? null, b.publico_total ?? null,
                autoresJson,
            ]
        );

        // Invalida caches: criar/upsert game tambem afeta snapshot/games/ranking
        invalidate.gameUpdated();
        logUser('admin.game.upsert', req.user, {
            game_id: rows[0].id,
            data: b.data,
            time_casa: b.time_casa,
            time_visitante: b.time_visitante,
            placar: (b.gols_casa != null && b.gols_visitante != null) ? `${b.gols_casa}x${b.gols_visitante}` : null,
            club_id: b.club_id,
        });
        res.status(201).json({ game: rows[0] });
    } catch (err) { next(err); }
});

// =============================================================
// PATCH /admin/games/:id — edita qualquer campo
// =============================================================
router.patch('/games/:id', async (req, res, next) => {
    try {
        const parsed = GameUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: 'validation_failed',
                detalhes: parsed.error.flatten().fieldErrors,
            });
        }
        const b = parsed.data;

        const { rows: existing } = await query(
            `SELECT g.*, c.name AS club_name
             FROM games g JOIN clubs c ON c.id = g.club_id
             WHERE g.id = $1`,
            [req.params.id]
        );
        if (!existing.length) return res.status(404).json({ error: 'game_not_found' });
        const cur = existing[0];

        // Se time/placar mudou, recalcula mando + resultado
        const newTimeCasa = b.time_casa ?? cur.time_casa;
        const newTimeVis = b.time_visitante ?? cur.time_visitante;
        const newGolsCasa = b.gols_casa !== undefined ? b.gols_casa : cur.gols_casa;
        const newGolsVis = b.gols_visitante !== undefined ? b.gols_visitante : cur.gols_visitante;
        const { mando, resultado } = inferirMandoEResultado({
            time_casa: newTimeCasa,
            time_visitante: newTimeVis,
            club_name: cur.club_name,
            gols_casa: newGolsCasa,
            gols_visitante: newGolsVis,
        });

        const dia_semana = b.data ? diaDaSemana(b.data) : cur.dia_semana;

        const allowedMap = {
            data: b.data, dia_semana, time_casa: b.time_casa, time_visitante: b.time_visitante,
            campeonato: b.campeonato, genero: b.genero, estadio: b.estadio,
            gols_casa: b.gols_casa, gols_visitante: b.gols_visitante,
            foi_classico: b.foi_classico, teve_penal: b.teve_penal,
            fase: b.fase, titulo_conquistado: b.titulo_conquistado,
            publico_total: b.publico_total,
            mando, resultado,
        };

        const fields = [];
        const values = [];
        for (const [k, v] of Object.entries(allowedMap)) {
            if (v === undefined) continue;
            values.push(v);
            fields.push(`${k} = $${values.length}`);
        }
        // autores_gols é JSONB — tratamento especial
        if (b.autores_gols !== undefined) {
            const autoresJson = b.autores_gols && b.autores_gols.length ? JSON.stringify(b.autores_gols) : null;
            values.push(autoresJson);
            fields.push(`autores_gols = $${values.length}::jsonb`);
        }
        if (!fields.length) return res.status(400).json({ error: 'nenhum_campo_valido' });

        values.push(req.params.id);
        const { rows } = await query(
            `UPDATE games SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
            values
        );
        // Invalida caches: snapshot, achievements, games, ranking de boloes.
        // Sem isso, o user veria o resultado antigo por ate 5 min (TTL).
        invalidate.gameUpdated();
        logUser('admin.game.update', req.user, {
            game_id: rows[0].id,
            time_casa: rows[0].time_casa,
            time_visitante: rows[0].time_visitante,
            placar: (rows[0].gols_casa != null && rows[0].gols_visitante != null)
                ? `${rows[0].gols_casa}x${rows[0].gols_visitante}` : null,
            fields_updated: Object.keys(allowedMap).filter(k => allowedMap[k] !== undefined).join(','),
        });
        res.json({ game: rows[0] });
    } catch (err) { next(err); }
});

// =============================================================
// DELETE /admin/games/:id
// =============================================================
router.delete('/games/:id', async (req, res, next) => {
    try {
        const { rowCount } = await query('DELETE FROM games WHERE id = $1', [req.params.id]);
        if (!rowCount) return res.status(404).json({ error: 'game_not_found' });
        invalidate.gameUpdated();
        logUser('admin.game.delete', req.user, { game_id: parseInt(req.params.id) });
        res.json({ removido: true });
    } catch (err) { next(err); }
});

export default router;
