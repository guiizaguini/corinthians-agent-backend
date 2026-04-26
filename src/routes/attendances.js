import express from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { invalidate } from '../utils/cache.js';

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
    companion_user_ids: z.array(z.number().int().positive()).optional(),
});

const AttendanceUpdateSchema = AttendanceSchema.partial().omit({ game_id: true });

// Sincroniza a lista de companions de uma attendance:
//  - Remove os que saíram da lista
//  - Adiciona os novos como PENDING (precisam de aceite do amigo pra virar CONFIRMED)
//  - Mantém os existentes (com qualquer status: PENDING/CONFIRMED/REJECTED)
async function syncCompanions(attendanceId, ownerUserId, companionIds) {
    // Pega o que já existe na attendance
    const { rows: existing } = await query(
        `SELECT companion_user_id FROM attendance_companions WHERE attendance_id = $1`,
        [attendanceId]
    );
    const existingSet = new Set(existing.map(r => r.companion_user_id));

    if (!companionIds) companionIds = [];

    // Remove os que não estão mais na lista
    const toRemove = [...existingSet].filter(id => !companionIds.includes(id));
    if (toRemove.length) {
        await query(
            `DELETE FROM attendance_companions
             WHERE attendance_id = $1 AND companion_user_id = ANY($2)`,
            [attendanceId, toRemove]
        );
    }

    if (!companionIds.length) return;

    // Filtra novos só pra amigos ACEITOS (evita marcar estranhos)
    const { rows: friends } = await query(
        `SELECT CASE WHEN requester_id = $1 THEN recipient_id ELSE requester_id END AS friend_id
         FROM friendships
         WHERE status = 'ACCEPTED'
           AND (requester_id = $1 OR recipient_id = $1)`,
        [ownerUserId]
    );
    const friendSet = new Set(friends.map(r => r.friend_id));
    const newOnes = companionIds.filter(
        id => !existingSet.has(id) && friendSet.has(id) && id !== ownerUserId
    );

    for (const id of newOnes) {
        await query(
            `INSERT INTO attendance_companions (attendance_id, companion_user_id, status)
             VALUES ($1, $2, 'PENDING')
             ON CONFLICT DO NOTHING`,
            [attendanceId, id]
        );
    }
}

async function canUserAttendGame(gameId, userClubId) {
    // Permite: game do clube do user OU de qualquer tournament (Copa, etc)
    const { rows } = await query(
        `SELECT 1 FROM games g
         JOIN clubs c ON c.id = g.club_id
         WHERE g.id = $1 AND (c.id = $2 OR c.is_tournament = TRUE)`,
        [gameId, userClubId]
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
                g.gols_casa, g.gols_visitante, g.resultado, g.foi_classico,
                COALESCE((
                    SELECT json_agg(json_build_object(
                        'user_id', u.id,
                        'username', u.username,
                        'display_name', u.display_name
                    ))
                    FROM attendance_companions ac
                    JOIN users u ON u.id = ac.companion_user_id
                    WHERE ac.attendance_id = a.id
                ), '[]'::json) AS companions
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

        const ok = await canUserAttendGame(body.game_id, req.user.club_id);
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
        if (body.companion_user_ids !== undefined) {
            await syncCompanions(rows[0].id, req.user.id, body.companion_user_ids);
        }
        invalidate.user(req.user.id);
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

        let attendance;
        if (fields.length) {
            values.push(req.params.id);
            values.push(req.user.id);
            const { rows } = await query(
                `UPDATE attendances SET ${fields.join(', ')}
                 WHERE id = $${values.length - 1} AND user_id = $${values.length}
                 RETURNING *`,
                values
            );
            if (!rows.length) return res.status(404).json({ error: 'attendance_not_found' });
            attendance = rows[0];
        } else {
            const { rows } = await query(
                'SELECT * FROM attendances WHERE id = $1 AND user_id = $2',
                [req.params.id, req.user.id]
            );
            if (!rows.length) return res.status(404).json({ error: 'attendance_not_found' });
            attendance = rows[0];
        }

        if (parsed.data.companion_user_ids !== undefined) {
            await syncCompanions(attendance.id, req.user.id, parsed.data.companion_user_ids);
        }

        invalidate.user(req.user.id);
        res.json({ attendance });
    } catch (err) { next(err); }
});

// =============================================================
// DELETE /attendances/:id
// =============================================================
router.delete('/:id', async (req, res, next) => {
    try {
        // Antes de deletar, pega o game_id pra limpar companion links em outras attendances
        const { rows: att } = await query(
            'SELECT game_id FROM attendances WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );
        if (!att.length) return res.status(404).json({ error: 'attendance_not_found' });
        const gameId = att[0].game_id;

        // Pega os user_ids dos donos das attendances onde eu sou companion (pra invalidar cache)
        const { rows: ownersAffected } = await query(
            `SELECT DISTINCT a.user_id
             FROM attendance_companions ac
             JOIN attendances a ON a.id = ac.attendance_id
             WHERE ac.companion_user_id = $1 AND a.game_id = $2`,
            [req.user.id, gameId]
        );

        // Remove eu (req.user.id) de companions em QUALQUER attendance desse jogo —
        // se eu não fui mais, não posso continuar listado como companion na de ninguém.
        await query(
            `DELETE FROM attendance_companions ac
             USING attendances a
             WHERE ac.attendance_id = a.id
               AND a.game_id = $2
               AND ac.companion_user_id = $1`,
            [req.user.id, gameId]
        );

        // Deleta a attendance (cascade derruba seus próprios companions)
        await query('DELETE FROM attendances WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]);

        // Invalida cache de quem foi afetado
        invalidate.user(req.user.id);
        for (const o of ownersAffected) invalidate.user(o.user_id);

        res.json({ removido: true });
    } catch (err) { next(err); }
});

export default router;
