import express from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';

/**
 * CRUD de notas (histórias do torcedor sobre jogos).
 * Cada nota pertence ao user. Pode opcionalmente referenciar uma attendance/game.
 * requireUser é aplicado upstream.
 */
const router = express.Router();

const NoteSchema = z.object({
    title: z.string().max(140).optional().nullable(),
    body: z.string().min(1).max(8000),
    attendance_id: z.number().int().positive().optional().nullable(),
    game_id: z.number().int().positive().optional().nullable(),
});

const NoteUpdateSchema = NoteSchema.partial();

// =============================================================
// GET /notes — lista do user
// =============================================================
router.get('/', async (req, res, next) => {
    try {
        const { rows } = await query(
            `SELECT
                n.id, n.title, n.body, n.attendance_id, n.game_id,
                n.created_at, n.updated_at,
                g.data AS game_data, g.time_casa, g.time_visitante,
                g.gols_casa, g.gols_visitante, g.resultado,
                g.campeonato, g.estadio, g.fase
             FROM notes n
             LEFT JOIN games g ON g.id = n.game_id
             WHERE n.user_id = $1
             ORDER BY n.created_at DESC`,
            [req.user.id]
        );
        res.json({ count: rows.length, notes: rows });
    } catch (err) { next(err); }
});

// =============================================================
// POST /notes
// Se vier attendance_id, o game_id é derivado dela (e validado contra o user)
// =============================================================
router.post('/', async (req, res, next) => {
    try {
        const parsed = NoteSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: 'validation_failed',
                detalhes: parsed.error.flatten().fieldErrors,
            });
        }
        const { title, body, attendance_id, game_id } = parsed.data;

        let resolvedGameId = game_id ?? null;
        if (attendance_id) {
            const { rows: att } = await query(
                'SELECT game_id FROM attendances WHERE id = $1 AND user_id = $2',
                [attendance_id, req.user.id]
            );
            if (!att.length) return res.status(404).json({ error: 'attendance_not_found' });
            resolvedGameId = att[0].game_id;
        }

        const { rows } = await query(
            `INSERT INTO notes (user_id, attendance_id, game_id, title, body)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [req.user.id, attendance_id ?? null, resolvedGameId, title ?? null, body]
        );
        res.status(201).json({ note: rows[0] });
    } catch (err) { next(err); }
});

// =============================================================
// PATCH /notes/:id
// =============================================================
router.patch('/:id', async (req, res, next) => {
    try {
        const parsed = NoteUpdateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: 'validation_failed' });
        const data = parsed.data;

        // Resolve attendance → game se mudou
        if (data.attendance_id) {
            const { rows: att } = await query(
                'SELECT game_id FROM attendances WHERE id = $1 AND user_id = $2',
                [data.attendance_id, req.user.id]
            );
            if (!att.length) return res.status(404).json({ error: 'attendance_not_found' });
            data.game_id = att[0].game_id;
        } else if (data.attendance_id === null) {
            data.game_id = null;
        }

        const allowed = ['title','body','attendance_id','game_id'];
        const fields = [];
        const values = [];
        for (const k of allowed) {
            if (data[k] === undefined) continue;
            values.push(data[k]);
            fields.push(`${k} = $${values.length}`);
        }
        if (!fields.length) return res.status(400).json({ error: 'nenhum_campo_valido' });

        values.push(req.params.id);
        values.push(req.user.id);
        const { rows } = await query(
            `UPDATE notes SET ${fields.join(', ')}
             WHERE id = $${values.length - 1} AND user_id = $${values.length}
             RETURNING *`,
            values
        );
        if (!rows.length) return res.status(404).json({ error: 'note_not_found' });
        res.json({ note: rows[0] });
    } catch (err) { next(err); }
});

// =============================================================
// DELETE /notes/:id
// =============================================================
router.delete('/:id', async (req, res, next) => {
    try {
        const { rowCount } = await query(
            'DELETE FROM notes WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );
        if (!rowCount) return res.status(404).json({ error: 'note_not_found' });
        res.json({ removido: true });
    } catch (err) { next(err); }
});

export default router;
