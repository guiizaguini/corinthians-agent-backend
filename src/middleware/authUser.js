import { verifyToken } from '../auth/jwt.js';
import { query } from '../db/pool.js';

/**
 * Extrai o Bearer token de Authorization e carrega o usuário.
 * Popula req.user = { id, email, display_name, club_id, is_admin }.
 * Responde 401 se não houver token válido.
 */
export async function requireUser(req, res, next) {
    try {
        const header = req.get('authorization') || '';
        const m = header.match(/^Bearer\s+(.+)$/i);
        if (!m) return res.status(401).json({ error: 'missing_token' });

        let payload;
        try {
            payload = verifyToken(m[1]);
        } catch {
            return res.status(401).json({ error: 'invalid_token' });
        }

        const { rows } = await query(
            `SELECT id, email, display_name, club_id, is_admin
             FROM users WHERE id = $1`,
            [payload.sub]
        );
        if (!rows.length) return res.status(401).json({ error: 'user_not_found' });

        req.user = rows[0];

        // Atualiza last_seen_at do user (fire-and-forget, throttle 1min)
        query(
            `UPDATE users SET last_seen_at = NOW()
             WHERE id = $1
               AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '1 minute')`,
            [rows[0].id]
        ).catch(() => {});

        next();
    } catch (err) {
        next(err);
    }
}

/**
 * Exige que o usuário autenticado seja admin (is_admin = TRUE).
 * Use DEPOIS de requireUser.
 */
export function requireAdmin(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'not_authenticated' });
    if (!req.user.is_admin) return res.status(403).json({ error: 'admin_required' });
    next();
}
