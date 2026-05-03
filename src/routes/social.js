import express from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { computeAchievements, ACHIEVEMENTS } from '../utils/achievements.js';
import { fetchBolaoStats } from '../utils/bolaoStats.js';
import { logUser } from '../utils/logger.js';

// Map de id → metadata da conquista (nome, icon, raridade, descrição) pra
// enriquecer rows do feed sem precisar de outro fetch no front.
const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

/**
 * Rotas de rede social: busca de users, amizades, comparação de stats.
 * requireUser é aplicado upstream.
 */
const router = express.Router();

const USERNAME_RE = /^[a-z0-9_.]{3,30}$/i;

// =============================================================
// GET /social/users/search?q=...
// Busca por username (prefix) ou display_name (substring)
// =============================================================
router.get('/users/search', async (req, res, next) => {
    try {
        const q = String(req.query.q || '').trim();
        if (q.length < 2) return res.json({ users: [] });
        const like = `%${q.toLowerCase()}%`;
        const { rows } = await query(
            `SELECT u.id, u.username, u.display_name, c.name AS club_name, c.short_name AS club_short,
                    f.id AS friendship_id, f.status AS friendship_status, f.requester_id
             FROM users u
             LEFT JOIN clubs c ON c.id = u.club_id
             LEFT JOIN friendships f
               ON ((f.requester_id = $2 AND f.recipient_id = u.id)
                OR (f.recipient_id = $2 AND f.requester_id = u.id))
             WHERE u.id <> $2
               AND (
                 LOWER(u.username) LIKE $1
                 OR LOWER(u.display_name) LIKE $1
               )
             ORDER BY
               CASE WHEN LOWER(u.username) = LOWER($3) THEN 0 ELSE 1 END,
               u.username NULLS LAST,
               u.display_name
             LIMIT 20`,
            [like, req.user.id, q]
        );
        // Marca relação
        const out = rows.map(r => ({
            id: r.id,
            username: r.username,
            display_name: r.display_name,
            club_name: r.club_name,
            club_short: r.club_short,
            friendship: r.friendship_id ? {
                id: r.friendship_id,
                status: r.friendship_status,
                i_requested: r.requester_id === req.user.id,
            } : null,
        }));
        res.json({ users: out });
    } catch (err) { next(err); }
});

// =============================================================
// GET /social/friends
// Retorna { friends: [...accepted], incoming: [...pending], outgoing: [...pending] }
// =============================================================
router.get('/friends', async (req, res, next) => {
    try {
        const [friendshipsRes, companionsRes] = await Promise.all([
            query(
                `SELECT
                    f.id, f.status, f.requester_id, f.recipient_id, f.created_at,
                    CASE WHEN f.requester_id = $1 THEN f.recipient_id ELSE f.requester_id END AS other_id,
                    u.username, u.display_name, u.last_seen_at,
                    c.name AS club_name, c.short_name AS club_short, c.primary_color
                 FROM friendships f
                 JOIN users u ON u.id = (CASE WHEN f.requester_id = $1 THEN f.recipient_id ELSE f.requester_id END)
                 LEFT JOIN clubs c ON c.id = u.club_id
                 WHERE f.requester_id = $1 OR f.recipient_id = $1
                 ORDER BY f.created_at DESC`,
                [req.user.id]
            ),
            query(
                `SELECT COUNT(*)::int AS n FROM attendance_companions
                 WHERE companion_user_id = $1 AND status = 'PENDING'`,
                [req.user.id]
            ),
        ]);

        const friends = [], incoming = [], outgoing = [];
        for (const r of friendshipsRes.rows) {
            const item = {
                friendship_id: r.id,
                user_id: r.other_id,
                username: r.username,
                display_name: r.display_name,
                last_seen_at: r.last_seen_at,
                club_name: r.club_name,
                club_short: r.club_short,
                primary_color: r.primary_color,
                created_at: r.created_at,
            };
            if (r.status === 'ACCEPTED') friends.push(item);
            else if (r.requester_id === req.user.id) outgoing.push(item);
            else incoming.push(item);
        }
        res.json({
            friends,
            incoming,
            outgoing,
            companion_requests_count: companionsRes.rows[0]?.n || 0,
        });
    } catch (err) { next(err); }
});

// =============================================================
// POST /social/friends/request — manda pedido de amizade
// Aceita { username } ou { user_id }
// =============================================================
const RequestSchema = z.object({
    username: z.string().regex(USERNAME_RE).optional(),
    user_id: z.number().int().positive().optional(),
}).refine(d => d.username || d.user_id, { message: 'username ou user_id' });

router.post('/friends/request', async (req, res, next) => {
    try {
        const parsed = RequestSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: 'validation_failed' });

        let recipientId = parsed.data.user_id;
        if (!recipientId) {
            const { rows } = await query(
                'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
                [parsed.data.username]
            );
            if (!rows.length) return res.status(404).json({ error: 'user_not_found' });
            recipientId = rows[0].id;
        }

        if (recipientId === req.user.id) {
            return res.status(400).json({ error: 'cannot_friend_self' });
        }

        // Já existe amizade em qualquer direção?
        const { rows: existing } = await query(
            `SELECT id, status, requester_id FROM friendships
             WHERE (requester_id = $1 AND recipient_id = $2)
                OR (requester_id = $2 AND recipient_id = $1)`,
            [req.user.id, recipientId]
        );
        if (existing.length) {
            const e = existing[0];
            if (e.status === 'ACCEPTED') return res.status(409).json({ error: 'already_friends' });
            // Se já tem pending invertido, aceita automaticamente (handshake)
            if (e.status === 'PENDING' && e.requester_id !== req.user.id) {
                await query('UPDATE friendships SET status = $1 WHERE id = $2', ['ACCEPTED', e.id]);
                logUser('friend.accept', req.user, {
                    friendship_id: e.id,
                    other_user_id: recipientId,
                    via: 'auto_handshake',
                });
                return res.json({ friendship: { id: e.id, status: 'ACCEPTED' } });
            }
            return res.status(409).json({ error: 'request_already_pending' });
        }

        const { rows } = await query(
            `INSERT INTO friendships (requester_id, recipient_id, status)
             VALUES ($1, $2, 'PENDING')
             RETURNING id, status, created_at`,
            [req.user.id, recipientId]
        );
        logUser('friend.request', req.user, {
            friendship_id: rows[0].id,
            recipient_id: recipientId,
        });
        res.status(201).json({ friendship: rows[0] });
    } catch (err) { next(err); }
});

// =============================================================
// POST /social/friends/:id/accept — aceita pedido pendente
// Só o recipient pode aceitar
// =============================================================
router.post('/friends/:id/accept', async (req, res, next) => {
    try {
        const { rows } = await query(
            `UPDATE friendships SET status = 'ACCEPTED'
             WHERE id = $1 AND recipient_id = $2 AND status = 'PENDING'
             RETURNING *`,
            [req.params.id, req.user.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'request_not_found' });
        logUser('friend.accept', req.user, {
            friendship_id: rows[0].id,
            other_user_id: rows[0].requester_id,
        });
        res.json({ friendship: rows[0] });
    } catch (err) { next(err); }
});

// =============================================================
// DELETE /social/friends/:id — rejeita pendente OU desfaz amizade
// Qualquer um dos dois lados pode deletar
// =============================================================
router.delete('/friends/:id', async (req, res, next) => {
    try {
        const { rowCount } = await query(
            `DELETE FROM friendships
             WHERE id = $1 AND (requester_id = $2 OR recipient_id = $2)`,
            [req.params.id, req.user.id]
        );
        if (!rowCount) return res.status(404).json({ error: 'friendship_not_found' });
        logUser('friend.remove', req.user, { friendship_id: parseInt(req.params.id) });
        res.json({ removido: true });
    } catch (err) { next(err); }
});

// =============================================================
// GET /social/compare/:user_id — comparação de stats
// Requer amizade ACEITA
// =============================================================
router.get('/compare/:user_id', async (req, res, next) => {
    try {
        const otherId = parseInt(req.params.user_id);

        const { rows: f } = await query(
            `SELECT id FROM friendships
             WHERE status = 'ACCEPTED'
               AND ((requester_id = $1 AND recipient_id = $2)
                 OR (requester_id = $2 AND recipient_id = $1))`,
            [req.user.id, otherId]
        );
        if (!f.length) return res.status(403).json({ error: 'not_friends' });

        const statsSql = `
            SELECT
                u.id AS user_id, u.username, u.display_name, c.name AS club_name, c.short_name AS club_short,
                COUNT(g.id) FILTER (WHERE a.status='PRESENTE' AND g.resultado IS NOT NULL)::int AS jogos,
                SUM(CASE WHEN a.status='PRESENTE' AND g.resultado='V' THEN 1 ELSE 0 END)::int AS vitorias,
                SUM(CASE WHEN a.status='PRESENTE' AND g.resultado='E' THEN 1 ELSE 0 END)::int AS empates,
                SUM(CASE WHEN a.status='PRESENTE' AND g.resultado='D' THEN 1 ELSE 0 END)::int AS derrotas,
                ROUND(
                    (SUM(CASE WHEN a.status='PRESENTE' AND g.resultado='V' THEN 3 ELSE 0 END)
                     + SUM(CASE WHEN a.status='PRESENTE' AND g.resultado='E' THEN 1 ELSE 0 END))::numeric
                    / NULLIF(COUNT(g.id) FILTER (WHERE a.status='PRESENTE' AND g.resultado IS NOT NULL)*3, 0) * 100,
                    2
                ) AS aproveitamento_pct,
                COALESCE(SUM(a.valor_pago), 0)::numeric AS gasto_total,
                COUNT(g.id) FILTER (WHERE a.status='PRESENTE' AND g.foi_classico)::int AS classicos
             FROM users u
             LEFT JOIN clubs c ON c.id = u.club_id
             LEFT JOIN attendances a ON a.user_id = u.id
             LEFT JOIN games g ON g.id = a.game_id
             WHERE u.id = $1
             GROUP BY u.id, u.username, u.display_name, c.name, c.short_name
        `;

        const [meRes, friendRes, commonRes] = await Promise.all([
            query(statsSql, [req.user.id]),
            query(statsSql, [otherId]),
            query(`
                SELECT g.id, g.data, g.time_casa, g.time_visitante, g.gols_casa, g.gols_visitante, g.resultado
                FROM attendances a1
                JOIN attendances a2 ON a2.game_id = a1.game_id AND a2.user_id = $2 AND a2.status = 'PRESENTE'
                JOIN games g ON g.id = a1.game_id
                WHERE a1.user_id = $1 AND a1.status = 'PRESENTE'
                ORDER BY g.data DESC
            `, [req.user.id, otherId]),
        ]);

        res.json({
            me: meRes.rows[0],
            friend: friendRes.rows[0],
            common: {
                count: commonRes.rows.length,
                games: commonRes.rows,
            },
        });
    } catch (err) { next(err); }
});

// =============================================================
// GET /social/feed — atividades recentes dos amigos
// Mostra os ingressos mais recentes que os amigos registraram
// =============================================================
router.get('/feed', async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 30, 100);
        const { rows } = await query(
            `WITH friend_ids AS (
                SELECT CASE WHEN requester_id = $1 THEN recipient_id ELSE requester_id END AS user_id
                FROM friendships
                WHERE status = 'ACCEPTED' AND (requester_id = $1 OR recipient_id = $1)
                UNION SELECT $1
             )
             SELECT * FROM (
                SELECT
                    'attendance' AS type,
                    a.id AS ref_id,
                    -- Bumpa a atividade quando alguém confirma companhia (post vai pro topo)
                    GREATEST(
                        a.created_at,
                        COALESCE((
                            SELECT MAX(ac.confirmed_at)
                            FROM attendance_companions ac
                            WHERE ac.attendance_id = a.id AND ac.status = 'CONFIRMED'
                        ), a.created_at)
                    ) AS created_at,
                    u.id AS user_id, u.username, u.display_name,
                    c.name AS club_name, c.short_name AS club_short, c.primary_color,
                    g.id AS game_id, g.data, g.time_casa, g.time_visitante,
                    g.gols_casa, g.gols_visitante, g.resultado, g.campeonato, g.estadio,
                    a.setor AS setor,
                    -- Lista de companhias CONFIRMADAS (vira "X foi com Y")
                    COALESCE((
                        SELECT json_agg(json_build_object(
                            'user_id', cu.id,
                            'username', cu.username,
                            'display_name', cu.display_name
                        ) ORDER BY cu.display_name)
                        FROM attendance_companions ac
                        JOIN users cu ON cu.id = ac.companion_user_id
                        WHERE ac.attendance_id = a.id AND ac.status = 'CONFIRMED'
                    ), '[]'::json) AS companions,
                    NULL::varchar AS title, NULL::text AS body,
                    NULL::boolean AS is_public,
                    NULL::varchar AS achievement_id
                FROM attendances a
                JOIN users u ON u.id = a.user_id
                LEFT JOIN clubs c ON c.id = u.club_id
                JOIN games g ON g.id = a.game_id
                WHERE a.status = 'PRESENTE'
                  AND (
                      -- Owner é amigo
                      a.user_id IN (SELECT user_id FROM friend_ids)
                      -- OU qualquer companion CONFIRMED é amigo (post compartilhado)
                      OR EXISTS (
                          SELECT 1 FROM attendance_companions ac
                          WHERE ac.attendance_id = a.id
                            AND ac.status = 'CONFIRMED'
                            AND ac.companion_user_id IN (SELECT user_id FROM friend_ids)
                      )
                  )

                UNION ALL

                SELECT
                    'note' AS type,
                    n.id AS ref_id, n.created_at,
                    u.id AS user_id, u.username, u.display_name,
                    c.name AS club_name, c.short_name AS club_short, c.primary_color,
                    g.id AS game_id, g.data, g.time_casa, g.time_visitante,
                    g.gols_casa, g.gols_visitante, g.resultado, g.campeonato, g.estadio,
                    NULL::varchar AS setor,
                    '[]'::json AS companions,
                    n.title, n.body, n.is_public,
                    NULL::varchar AS achievement_id
                FROM notes n
                JOIN users u ON u.id = n.user_id
                LEFT JOIN clubs c ON c.id = u.club_id
                LEFT JOIN games g ON g.id = n.game_id
                WHERE (
                    (n.user_id IN (SELECT user_id FROM friend_ids WHERE user_id <> $1) AND n.is_public = TRUE)
                    OR n.user_id = $1
                )

                UNION ALL

                -- Conquistas desbloqueadas (próprias + de amigos).
                -- Filtra bulk_sync (1a sincronização de user antigo NÃO flooda
                -- o feed) e limita aos últimos 30 dias pra evitar lixo histórico.
                SELECT
                    'achievement' AS type,
                    ua.id AS ref_id, ua.unlocked_at AS created_at,
                    u.id AS user_id, u.username, u.display_name,
                    c.name AS club_name, c.short_name AS club_short, c.primary_color,
                    NULL::int AS game_id, NULL::date AS data,
                    NULL::varchar AS time_casa, NULL::varchar AS time_visitante,
                    NULL::int AS gols_casa, NULL::int AS gols_visitante,
                    NULL::varchar AS resultado, NULL::varchar AS campeonato,
                    NULL::varchar AS estadio,
                    NULL::varchar AS setor,
                    '[]'::json AS companions,
                    NULL::varchar AS title, NULL::text AS body, NULL::boolean AS is_public,
                    ua.achievement_id
                FROM user_achievements ua
                JOIN users u ON u.id = ua.user_id
                LEFT JOIN clubs c ON c.id = u.club_id
                WHERE ua.from_bulk_sync = FALSE
                  AND ua.unlocked_at > NOW() - INTERVAL '30 days'
                  AND ua.user_id IN (SELECT user_id FROM friend_ids)

                UNION ALL

                -- Palpites de bolão da Copa AGRUPADOS por (user, bolão).
                -- Em vez de N posts (1 por palpite), 1 post por (user, bolão)
                -- listando TODOS os palpites no body como JSON. Sem agrupar a
                -- timeline ficaria flooded — usuário pode ter 100+ palpites em
                -- 1 bolão e ainda estar em vários bolões.
                -- title  → nome do bolão
                -- body   → JSON: { bolao_id, count, palpites: [{...}] }
                SELECT
                    'palpite' AS type,
                    MIN(bp.id)::int AS ref_id,
                    MAX(bp.updated_at) AS created_at,
                    u.id AS user_id, u.username, u.display_name,
                    c.name AS club_name, c.short_name AS club_short, c.primary_color,
                    NULL::int AS game_id, NULL::date AS data,
                    NULL::varchar AS time_casa, NULL::varchar AS time_visitante,
                    NULL::int AS gols_casa, NULL::int AS gols_visitante,
                    NULL::varchar AS resultado, NULL::varchar AS campeonato,
                    NULL::varchar AS estadio,
                    NULL::varchar AS setor,
                    '[]'::json AS companions,
                    b.name AS title,
                    json_build_object(
                        'bolao_id', b.id,
                        'count', COUNT(bp.id),
                        'palpites', json_agg(json_build_object(
                            'game_id',         g.id,
                            'time_casa',       g.time_casa,
                            'time_visitante',  g.time_visitante,
                            'data',            g.data,
                            'gols_casa',       bp.gols_casa,
                            'gols_visitante',  bp.gols_visitante,
                            'fase',            g.fase,
                            'campeonato',      g.campeonato,
                            'gols_casa_real',  g.gols_casa,
                            'gols_visitante_real', g.gols_visitante,
                            'updated_at',      bp.updated_at
                        ) ORDER BY bp.updated_at DESC)
                    )::text AS body,
                    NULL::boolean AS is_public,
                    NULL::varchar AS achievement_id
                FROM bolao_palpites bp
                JOIN users u ON u.id = bp.user_id
                LEFT JOIN clubs c ON c.id = u.club_id
                JOIN games g ON g.id = bp.game_id
                JOIN boloes b ON b.id = bp.bolao_id
                WHERE bp.user_id IN (SELECT user_id FROM friend_ids)
                  AND bp.updated_at > NOW() - INTERVAL '30 days'
                GROUP BY u.id, u.username, u.display_name,
                         c.name, c.short_name, c.primary_color,
                         b.id, b.name
             ) sub
             ORDER BY created_at DESC
             LIMIT $2`,
            [req.user.id, limit]
        );

        // Enriquece linhas de conquista com nome/icon/raridade do catálogo
        // (catálogo é em JS, não em SQL — seria custoso replicar no banco)
        const feed = rows.map(r => {
            if (r.type !== 'achievement') return r;
            const meta = ACHIEVEMENT_BY_ID[r.achievement_id];
            if (!meta) return null; // orfã (catálogo mudou)
            return {
                ...r,
                achievement: {
                    id: meta.id,
                    name: meta.name,
                    description: meta.description,
                    i18n: meta.i18n,    // pra frontend traduzir nome/desc por idioma
                    icon: meta.icon,
                    rarity: meta.rarity,
                    category: meta.category,
                },
            };
        }).filter(Boolean);

        res.json({ count: feed.length, feed });
    } catch (err) { next(err); }
});

// =============================================================
// GET /social/users/:user_id/attendances — coleção do amigo
// Requer amizade ACEITA
// =============================================================
router.get('/users/:user_id/attendances', async (req, res, next) => {
    try {
        const otherId = parseInt(req.params.user_id);

        const { rows: f } = await query(
            `SELECT 1 FROM friendships
             WHERE status = 'ACCEPTED'
               AND ((requester_id = $1 AND recipient_id = $2)
                 OR (requester_id = $2 AND recipient_id = $1))`,
            [req.user.id, otherId]
        );
        if (!f.length && otherId !== req.user.id) {
            return res.status(403).json({ error: 'not_friends' });
        }

        const { rows: userRows } = await query(
            `SELECT u.id, u.username, u.display_name, u.created_at,
                    c.id AS club_id, c.slug AS club_slug, c.name AS club_name,
                    c.short_name AS club_short, c.primary_color, c.secondary_color
             FROM users u LEFT JOIN clubs c ON c.id = u.club_id
             WHERE u.id = $1`,
            [otherId]
        );
        if (!userRows.length) return res.status(404).json({ error: 'user_not_found' });

        const { rows: games } = await query(
            `SELECT
                a.id AS attendance_id, a.status AS status_presenca,
                a.setor, a.assento, a.valor_pago, a.observacoes,
                g.id, g.data, g.dia_semana, g.time_casa, g.time_visitante,
                g.mando, g.campeonato, g.genero, g.estadio,
                g.gols_casa, g.gols_visitante, g.resultado,
                g.foi_classico, g.teve_penal, g.fase, g.titulo_conquistado,
                g.autores_gols, g.gols_texto, g.publico_total
             FROM attendances a
             JOIN games g ON g.id = a.game_id
             WHERE a.user_id = $1
             ORDER BY g.data DESC`,
            [otherId]
        );

        // Stats agregados + tudo que as conquistas precisam (mesma fórmula do /me/achievements)
        const otherClubId = userRows[0].club_id;
        const [statsAgg, statsExtras, notas, amigos, companions] = await Promise.all([
            query(
                `SELECT
                    COUNT(*) FILTER (WHERE a.status='PRESENTE' AND g.resultado IS NOT NULL)::int AS jogos,
                    SUM(CASE WHEN a.status='PRESENTE' AND g.resultado='V' THEN 1 ELSE 0 END)::int AS vitorias,
                    SUM(CASE WHEN a.status='PRESENTE' AND g.resultado='E' THEN 1 ELSE 0 END)::int AS empates,
                    SUM(CASE WHEN a.status='PRESENTE' AND g.resultado='D' THEN 1 ELSE 0 END)::int AS derrotas,
                    ROUND(
                        (SUM(CASE WHEN a.status='PRESENTE' AND g.resultado='V' THEN 3 ELSE 0 END)
                         + SUM(CASE WHEN a.status='PRESENTE' AND g.resultado='E' THEN 1 ELSE 0 END))::numeric
                        / NULLIF(COUNT(*) FILTER (WHERE a.status='PRESENTE' AND g.resultado IS NOT NULL)*3, 0) * 100,
                        2
                    ) AS aproveitamento_pct
                 FROM attendances a JOIN games g ON g.id = a.game_id
                 WHERE a.user_id = $1`,
                [otherId]
            ),
            // Stats extras pra conquistas: clássicos + títulos (filtrado pelo clube do user)
            otherClubId
                ? query(
                    `SELECT
                        COUNT(*) FILTER (WHERE g.foi_classico = TRUE)::int AS classicos,
                        COUNT(*) FILTER (WHERE g.titulo_conquistado IS NOT NULL AND g.titulo_conquistado <> '')::int AS titulos,
                        ROUND(
                            (SUM(CASE WHEN g.resultado='V' THEN 3 ELSE 0 END)
                             + SUM(CASE WHEN g.resultado='E' THEN 1 ELSE 0 END))::numeric
                            / NULLIF(COUNT(*)*3, 0) * 100,
                            0
                        )::int AS aproveitamento_pct_int
                     FROM attendances a
                     JOIN games g ON g.id = a.game_id
                     WHERE a.user_id = $1
                       AND a.status = 'PRESENTE'
                       AND g.club_id = $2
                       AND g.resultado IS NOT NULL`,
                    [otherId, otherClubId]
                )
                : Promise.resolve({ rows: [{ classicos: 0, titulos: 0, aproveitamento_pct_int: 0 }] }),
            query('SELECT COUNT(*)::int AS n FROM notes WHERE user_id = $1', [otherId]),
            query(
                `SELECT COUNT(*)::int AS n FROM friendships
                 WHERE status = 'ACCEPTED'
                   AND (requester_id = $1 OR recipient_id = $1)`,
                [otherId]
            ),
            query(
                `SELECT COUNT(DISTINCT a.id)::int AS n
                 FROM attendances a
                 JOIN attendance_companions ac ON ac.attendance_id = a.id
                 WHERE a.user_id = $1`,
                [otherId]
            ),
        ]);

        const stats = statsAgg.rows[0];
        const e = statsExtras.rows[0] || {};

        // Bolao stats — sempre roda, independente do user ter clube ou nao
        // (white-label Botmaker tambem ganha conquistas de bolao).
        const bolaoStats = await fetchBolaoStats(otherId);

        // Stats que o catálogo de conquistas espera
        const achStats = {
            jogos:                  stats?.jogos || 0,
            vitorias:               stats?.vitorias || 0,
            empates:                stats?.empates || 0,
            derrotas:               stats?.derrotas || 0,
            classicos:              e.classicos || 0,
            titulos:                e.titulos || 0,
            aproveitamento_pct:     e.aproveitamento_pct_int || 0,
            notas:                  notas.rows[0]?.n || 0,
            amigos:                 amigos.rows[0]?.n || 0,
            jogos_com_companions:   companions.rows[0]?.n || 0,
            ...bolaoStats,
        };
        const achievements = computeAchievements(achStats);

        res.json({
            user: userRows[0],
            stats,
            count: games.length,
            games,
            achievements,
        });
    } catch (err) { next(err); }
});

// =============================================================
// GET /social/companion-requests — pendings que outros me marcaram
// =============================================================
router.get('/companion-requests', async (req, res, next) => {
    try {
        const { rows } = await query(`
            SELECT
                ac.attendance_id,
                ac.companion_user_id,
                ac.created_at,
                a.id AS attendance_id_full,
                a.user_id AS owner_id,
                ow.username AS owner_username,
                ow.display_name AS owner_display_name,
                g.id AS game_id,
                g.data AS game_data,
                g.time_casa, g.time_visitante,
                g.campeonato, g.estadio, g.gols_casa, g.gols_visitante
            FROM attendance_companions ac
            JOIN attendances a ON a.id = ac.attendance_id
            JOIN users ow ON ow.id = a.user_id
            JOIN games g ON g.id = a.game_id
            WHERE ac.companion_user_id = $1
              AND ac.status = 'PENDING'
            ORDER BY ac.created_at DESC
        `, [req.user.id]);
        res.json({ requests: rows });
    } catch (err) { next(err); }
});

// =============================================================
// POST /social/companion-requests/:attendance_id/accept
// =============================================================
router.post('/companion-requests/:attendance_id/accept', async (req, res, next) => {
    try {
        const { rowCount } = await query(
            `UPDATE attendance_companions
             SET status = 'CONFIRMED', confirmed_at = NOW(), responded_at = NOW()
             WHERE attendance_id = $1 AND companion_user_id = $2 AND status = 'PENDING'`,
            [req.params.attendance_id, req.user.id]
        );
        if (!rowCount) return res.status(404).json({ error: 'request_not_found' });

        // Pega o dono e o game_id da attendance original
        const { rows: ow } = await query(
            'SELECT user_id, game_id FROM attendances WHERE id = $1',
            [req.params.attendance_id]
        );

        // Garante o link reverso (mutual): owner original vira companion CONFIRMED
        // na attendance do confirmador (existente ou recém-criada). Sem isso o feed
        // não consegue agrupar os dois eventos.
        let createdAttendance = null;
        if (ow.length) {
            const gameId = ow[0].game_id;
            const ownerId = ow[0].user_id;
            const { rows: existing } = await query(
                'SELECT id FROM attendances WHERE user_id = $1 AND game_id = $2',
                [req.user.id, gameId]
            );
            let myAttendanceId;
            if (!existing.length) {
                const { rows: newRows } = await query(
                    `INSERT INTO attendances (user_id, game_id, status)
                     VALUES ($1, $2, 'PRESENTE')
                     RETURNING id, game_id`,
                    [req.user.id, gameId]
                );
                createdAttendance = newRows[0];
                myAttendanceId = createdAttendance.id;
            } else {
                myAttendanceId = existing[0].id;
            }
            // Insere o owner como companion CONFIRMED na MINHA attendance
            // (idempotente via ON CONFLICT — se já existir, faz UPDATE pra CONFIRMED).
            await query(
                `INSERT INTO attendance_companions
                    (attendance_id, companion_user_id, status, confirmed_at, responded_at)
                 VALUES ($1, $2, 'CONFIRMED', NOW(), NOW())
                 ON CONFLICT (attendance_id, companion_user_id) DO UPDATE SET
                    status = 'CONFIRMED',
                    confirmed_at = COALESCE(attendance_companions.confirmed_at, NOW()),
                    responded_at = NOW()`,
                [myAttendanceId, ownerId]
            );
        }

        // Invalida caches afetados
        if (ow.length) {
            const { invalidate } = await import('../utils/cache.js');
            invalidate.user(ow[0].user_id);
            invalidate.user(req.user.id);
        }

        logUser('companion.accept', req.user, {
            attendance_id: parseInt(req.params.attendance_id),
            owner_id: ow[0]?.user_id,
            game_id: ow[0]?.game_id,
        });
        res.json({
            confirmed: true,
            // Quando preenchido, o frontend abre o modal pro user refinar setor/valor
            created_attendance: createdAttendance,
        });
    } catch (err) { next(err); }
});

// =============================================================
// DELETE /social/companion-requests/:attendance_id — recusa
// Remove o link (a pessoa marcou errado, ou a companhia não rolou)
// =============================================================
router.delete('/companion-requests/:attendance_id', async (req, res, next) => {
    try {
        const { rowCount, rows } = await query(
            `DELETE FROM attendance_companions
             WHERE attendance_id = $1 AND companion_user_id = $2
             RETURNING (SELECT user_id FROM attendances WHERE id = attendance_id) AS owner_id`,
            [req.params.attendance_id, req.user.id]
        );
        if (!rowCount) return res.status(404).json({ error: 'request_not_found' });
        const ownerId = rows[0]?.owner_id;
        if (ownerId) {
            const { invalidate } = await import('../utils/cache.js');
            invalidate.user(ownerId);
        }
        logUser('companion.reject', req.user, {
            attendance_id: parseInt(req.params.attendance_id),
            owner_id: ownerId,
        });
        res.json({ rejected: true });
    } catch (err) { next(err); }
});

export default router;
