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
        next();
    } catch (err) {
        next(err);
    }
}
