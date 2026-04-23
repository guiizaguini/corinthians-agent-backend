import express from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';

/**
 * CRUD de registros de presença do usuário autenticado.
 * Todas as rotas assumem req.user preenchido pelo requireUser (no server.js).
 */
const router = express.Router();

const AttendanceSchema = z.object({
    game_id: z.number().int().positive(),
    status: z.enum(['PRESENTE', 'AUSENTE']).optional().default('PRESENTE'),
    setor: z.string().max(60).optional().nullable(),
    assento: z.string().max(40).optional().nullable(),
    valor_pago: z.number().nonnegative().optional().nullable(),
    observacoes: z.string().max(2000).optional().nullable(),
});

const AttendanceUpdateSchema = AttendanceSchema.partial().omit({ game_id: true });

async function gameBelongsToUserClub(gameId, clubId) {
    const { rows } = await query(
        'SELECT 1 FROM games WHERE id = $1 AND club_id = $2',
        [gameId, clubId]
    );
    return rows.length > 0;
}

// =============================================================
// GET /attendances — lista do user autenticado
// =============================================================
router.get('/', async (req, res, next) => {
    try {
        const { rows } = await query(
            `SELECT
                a.id, a.game_id, a.status, a.setor, a.assento,
                a.valor_pago, a.observacoes, a.created_at, a.updated_at,
                g.data, g.time_casa, g.time_visitante, g.campeonato, g.estadio,
                g.gols_casa, g.gols_visitante, g.resultado, g.foi_classico
             FROM attendances a
             JOIN games g ON g.id = a.game_id
             WHERE a.user_id = $1
             ORDER BY g.data DESC, g.id DESC`,
            [req.user.id]
        );
        res.json({ count: rows.length, attendances: rows });
    } catch (err) { next(err); }
});

// =============================================================
// POST /attendances — cria (ou faz upsert) presença
// =============================================================
router.post('/', async (req, res, next) => {
    try {
        const parsed = AttendanceSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: 'validation_failed',
                detalhes: parsed.error.flatten().fieldErrors,
            });
        }
        const body = parsed.data;

        const ok = await gameBelongsToUserClub(body.game_id, req.user.club_id);
        if (!ok) return res.status(404).json({ error: 'game_not_found' });

        const { rows } = await query(
            `INSERT INTO attendances (user_id, game_id, status, setor, assento, valor_pago, observacoes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (user_id, game_id) DO UPDATE SET
                status = EXCLUDED.status,
                setor = EXCLUDED.setor,
                assento = EXCLUDED.assento,
                valor_pago = EXCLUDED.valor_pago,
                observacoes = EXCLUDED.observacoes
             RETURNING *`,
            [
                req.user.id, body.game_id, body.status ?? 'PRESENTE',
                body.setor ?? null, body.assento ?? null,
                body.valor_pago ?? null, body.observacoes ?? null,
            ]
        );
        res.status(201).json({ attendance: rows[0] });
    } catch (err) { next(err); }
});

// =============================================================
// PATCH /attendances/:id — atualiza presença do próprio user
// =============================================================
router.patch('/:id', async (req, res, next) => {
    try {
        const parsed = AttendanceUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: 'validation_failed',
                detalhes: parsed.error.flatten().fieldErrors,
            });
        }

        const allowed = ['status','setor','assento','valor_pago','observacoes'];
        const fields = [];
        const values = [];
        for (const [k, v] of Object.entries(parsed.data)) {
            if (!allowed.includes(k)) continue;
            values.push(v);
            fields.push(`${k} = $${values.length}`);
        }
        if (!fields.length) return res.status(400).json({ error: 'nenhum_campo_valido' });

        values.push(req.params.id);
        values.push(req.user.id);
        const { rows } = await query(
            `UPDATE attendances SET ${fields.join(', ')}
             WHERE id = $${values.length - 1} AND user_id = $${values.length}
             RETURNING *`,
            values
        );
        if (!rows.length) return res.status(404).json({ error: 'attendance_not_found' });
        res.json({ attendance: rows[0] });
    } catch (err) { next(err); }
});

// =============================================================
// DELETE /attendances/:id
// =============================================================
router.delete('/:id', async (req, res, next) => {
    try {
        const { rowCount } = await query(
            'DELETE FROM attendances WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );
        if (!rowCount) return res.status(404).json({ error: 'attendance_not_found' });
        res.json({ removido: true });
    } catch (err) { next(err); }
});

export default router;
