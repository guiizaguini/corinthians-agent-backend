import express from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';

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
});

const GameUpdateSchema = GameCreateSchema.partial().omit({ club_id: true });

async function getClubById(clubId) {
    const { rows } = await query('SELECT id, name FROM clubs WHERE id = $1', [clubId]);
    return rows[0] || null;
}

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

        const { rows } = await query(
            `INSERT INTO games (
                club_id, data, dia_semana, time_casa, time_visitante, mando,
                campeonato, genero, estadio, gols_casa, gols_visitante, resultado,
                foi_classico, teve_penal, fase, titulo_conquistado, publico_total
             ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
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
                publico_total = EXCLUDED.publico_total
             RETURNING *`,
            [
                b.club_id, b.data, dia_semana, b.time_casa, b.time_visitante, mando,
                b.campeonato ?? null, b.genero ?? 'M', b.estadio ?? null,
                b.gols_casa ?? null, b.gols_visitante ?? null, resultado,
                b.foi_classico ?? false, b.teve_penal ?? false,
                b.fase ?? null, b.titulo_conquistado ?? null, b.publico_total ?? null,
            ]
        );

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
        if (!fields.length) return res.status(400).json({ error: 'nenhum_campo_valido' });

        values.push(req.params.id);
        const { rows } = await query(
            `UPDATE games SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
            values
        );
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
        res.json({ removido: true });
    } catch (err) { next(err); }
});

export default router;
