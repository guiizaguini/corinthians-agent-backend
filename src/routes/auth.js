import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { signToken } from '../auth/jwt.js';
import { requireUser } from '../middleware/authUser.js';

const router = express.Router();

const SignupSchema = z.object({
    email: z.string().email().max(200),
    password: z.string().min(8).max(120),
    display_name: z.string().min(1).max(80).optional(),
    club_slug: z.string().min(1).max(40).nullable().optional(),
});

const UpdateMeSchema = z.object({
    display_name: z.string().min(1).max(80).optional(),
    club_slug: z.string().min(1).max(40).nullable().optional(),
});

const LoginSchema = z.object({
    email: z.string().email().max(200),
    password: z.string().min(1).max(120),
});

async function getClubIdBySlug(slug) {
    const { rows } = await query('SELECT id FROM clubs WHERE slug = $1', [slug]);
    return rows[0]?.id ?? null;
}

function publicUser(u) {
    return {
        id: u.id,
        email: u.email,
        display_name: u.display_name,
        club_id: u.club_id,
        is_admin: u.is_admin ?? false,
    };
}

// =============================================================
// POST /auth/signup
// =============================================================
router.post('/signup', async (req, res, next) => {
    try {
        const parsed = SignupSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: 'validation_failed',
                detalhes: parsed.error.flatten().fieldErrors,
            });
        }
        const { email, password, display_name } = parsed.data;
        const slug = parsed.data.club_slug;

        let clubId = null;
        if (slug) {
            clubId = await getClubIdBySlug(slug);
            if (!clubId) {
                return res.status(400).json({ error: 'club_not_found', slug });
            }
        }

        const emailLc = email.toLowerCase();
        const existing = await query('SELECT id FROM users WHERE email = $1', [emailLc]);
        if (existing.rows.length) {
            return res.status(409).json({ error: 'email_already_registered' });
        }

        const hash = await bcrypt.hash(password, 10);
        const { rows } = await query(
            `INSERT INTO users (email, password_hash, display_name, club_id)
             VALUES ($1, $2, $3, $4)
             RETURNING id, email, display_name, club_id, is_admin`,
            [emailLc, hash, display_name ?? null, clubId]
        );
        const user = rows[0];
        const token = signToken({ sub: user.id, email: user.email });
        res.status(201).json({ token, user: publicUser(user) });
    } catch (err) { next(err); }
});

// =============================================================
// POST /auth/login
// =============================================================
router.post('/login', async (req, res, next) => {
    try {
        const parsed = LoginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'validation_failed' });
        }
        const { email, password } = parsed.data;
        const emailLc = email.toLowerCase();

        const { rows } = await query(
            `SELECT id, email, password_hash, display_name, club_id, is_admin
             FROM users WHERE email = $1`,
            [emailLc]
        );
        const user = rows[0];
        if (!user) return res.status(401).json({ error: 'invalid_credentials' });

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

        const token = signToken({ sub: user.id, email: user.email });
        res.json({ token, user: publicUser(user) });
    } catch (err) { next(err); }
});

// =============================================================
// GET /auth/me
// =============================================================
router.get('/me', requireUser, async (req, res, next) => {
    try {
        const { rows } = await query(
            `SELECT u.id, u.email, u.display_name, u.club_id, u.is_admin,
                    c.slug AS club_slug, c.name AS club_name, c.short_name AS club_short,
                    c.primary_color, c.secondary_color
             FROM users u
             LEFT JOIN clubs c ON c.id = u.club_id
             WHERE u.id = $1`,
            [req.user.id]
        );
        res.json({ user: rows[0] });
    } catch (err) { next(err); }
});

// =============================================================
// PATCH /auth/me — muda clube ou display_name
// =============================================================
router.patch('/me', requireUser, async (req, res, next) => {
    try {
        const parsed = UpdateMeSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'validation_failed' });
        }
        const { display_name, club_slug } = parsed.data;

        const fields = [];
        const values = [];

        if (display_name !== undefined) {
            values.push(display_name);
            fields.push(`display_name = $${values.length}`);
        }
        if (club_slug !== undefined) {
            let clubId = null;
            if (club_slug) {
                clubId = await getClubIdBySlug(club_slug);
                if (!clubId) return res.status(400).json({ error: 'club_not_found' });
            }
            values.push(clubId);
            fields.push(`club_id = $${values.length}`);
        }
        if (!fields.length) return res.status(400).json({ error: 'nenhum_campo_valido' });

        values.push(req.user.id);
        const { rows } = await query(
            `UPDATE users SET ${fields.join(', ')}
             WHERE id = $${values.length}
             RETURNING id, email, display_name, club_id, is_admin`,
            values
        );
        res.json({ user: rows[0] });
    } catch (err) { next(err); }
});

export default router;
