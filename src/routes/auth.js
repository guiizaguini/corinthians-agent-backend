import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { query } from '../db/pool.js';
import { signToken } from '../auth/jwt.js';
import { requireUser } from '../middleware/authUser.js';

const router = express.Router();

const USERNAME_RE = /^[a-z0-9_.]{3,30}$/i;

// Google OAuth — verificador de ID token. Aceita qualquer um dos client IDs
// listados em GOOGLE_CLIENT_ID (pode ser CSV se tiver web + iOS, etc).
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client() : null;
const googleAudiences = GOOGLE_CLIENT_ID.split(',').map(s => s.trim()).filter(Boolean);

const SignupSchema = z.object({
    email: z.string().email().max(200),
    password: z.string().min(8).max(120),
    display_name: z.string().min(1).max(80).optional(),
    club_slug: z.string().min(1).max(40).nullable().optional(),
    username: z.string().regex(USERNAME_RE, 'use letras/números/_/., 3 a 30 caracteres'),
});

const UpdateMeSchema = z.object({
    display_name: z.string().min(1).max(80).optional(),
    club_slug: z.string().min(1).max(40).nullable().optional(),
    username: z.string().regex(/^[a-z0-9_.]{3,30}$/i, 'use letras/números/_/., 3 a 30').nullable().optional(),
});

const LoginSchema = z.object({
    email: z.string().email().max(200),
    password: z.string().min(1).max(120),
});

const DeleteMeSchema = z.object({
    password: z.string().min(1).max(120),
    confirm: z.string().min(1).max(50), // user precisa digitar "EXCLUIR" pra confirmar
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
        const usernameLc = parsed.data.username.toLowerCase().trim();

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

        // Username precisa ser único (case-insensitive)
        const dupUser = await query(
            'SELECT id FROM users WHERE LOWER(username) = $1',
            [usernameLc]
        );
        if (dupUser.rows.length) {
            return res.status(409).json({ error: 'username_taken' });
        }

        const hash = await bcrypt.hash(password, 10);
        const { rows } = await query(
            `INSERT INTO users (email, password_hash, display_name, club_id, username)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, email, display_name, club_id, is_admin`,
            [emailLc, hash, display_name ?? null, clubId, usernameLc]
        );
        const user = rows[0];
        const token = signToken({ sub: user.id, email: user.email });
        res.status(201).json({ token, user: publicUser(user) });
    } catch (err) { next(err); }
});

// =============================================================
// POST /auth/google — login OU signup via Google ID token
// Body: { credential: <google_id_token>, club_slug?: string }
// Comportamento:
//   - Se já tem user com esse google_sub OU email → loga
//   - Se email existir mas sem google_sub → linka a conta
//   - Se nada existir → cria user novo (username gerado do email)
// =============================================================
const GoogleAuthSchema = z.object({
    credential: z.string().min(20).max(4000),
    club_slug: z.string().min(1).max(40).nullable().optional(),
});

async function generateUsernameFromEmail(emailLc) {
    // pega prefixo do email, sanitiza, garante unicidade
    let base = emailLc.split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9_.]/g, '')
        .slice(0, 26) || 'user';
    if (base.length < 3) base = base + '___'.slice(0, 3 - base.length);

    let candidate = base;
    let suffix = 0;
    // até 50 tentativas (muito improvável precisar de mais)
    for (let i = 0; i < 50; i++) {
        const { rows } = await query(
            'SELECT 1 FROM users WHERE LOWER(username) = $1',
            [candidate]
        );
        if (!rows.length) return candidate;
        suffix++;
        candidate = `${base}${suffix}`.slice(0, 30);
    }
    return `${base}_${Date.now().toString(36)}`.slice(0, 30);
}

router.post('/google', async (req, res, next) => {
    try {
        if (!googleClient) {
            return res.status(503).json({ error: 'google_auth_not_configured' });
        }
        const parsed = GoogleAuthSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'validation_failed' });
        }
        const { credential, club_slug } = parsed.data;

        let payload;
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: googleAudiences.length === 1 ? googleAudiences[0] : googleAudiences,
            });
            payload = ticket.getPayload();
        } catch (_) {
            return res.status(401).json({ error: 'invalid_google_token' });
        }

        const { sub: googleSub, email, email_verified, name } = payload;
        if (!email || email_verified === false) {
            return res.status(401).json({ error: 'google_email_not_verified' });
        }
        const emailLc = email.toLowerCase();

        // 1) Tenta achar por google_sub (já linkado anteriormente)
        let { rows } = await query(
            `SELECT id, email, display_name, club_id, is_admin, google_sub
             FROM users WHERE google_sub = $1`,
            [googleSub]
        );
        let user = rows[0];

        // 2) Se não, tenta por email — linka conta existente
        if (!user) {
            const r = await query(
                `SELECT id, email, display_name, club_id, is_admin, google_sub
                 FROM users WHERE email = $1`,
                [emailLc]
            );
            user = r.rows[0];
            if (user && !user.google_sub) {
                await query(
                    'UPDATE users SET google_sub = $1 WHERE id = $2',
                    [googleSub, user.id]
                );
            }
        }

        // 3) Não achou nem por sub nem por email → cria conta nova
        let isNew = false;
        if (!user) {
            isNew = true;
            let clubId = null;
            if (club_slug) {
                clubId = await getClubIdBySlug(club_slug);
                if (!clubId) return res.status(400).json({ error: 'club_not_found' });
            }
            const username = await generateUsernameFromEmail(emailLc);
            // password_hash fica vazio — login por senha não vai funcionar, só Google.
            // O usuário pode definir senha depois via fluxo de "definir senha" (não implementado ainda).
            const ins = await query(
                `INSERT INTO users (email, password_hash, display_name, club_id, username, google_sub)
                 VALUES ($1, '', $2, $3, $4, $5)
                 RETURNING id, email, display_name, club_id, is_admin`,
                [emailLc, name || null, clubId, username, googleSub]
            );
            user = ins.rows[0];
        }

        const token = signToken({ sub: user.id, email: user.email });
        // is_new permite ao front decidir se mostra o tour/modal de boas-vindas
        // (escolha de clube). Diferente de checar club_id === null pq pode existir
        // user antigo sem clube que ja conhece o app.
        res.json({ token, user: publicUser(user), is_new: isNew });
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
            `SELECT u.id, u.email, u.username, u.display_name, u.club_id, u.is_admin, u.created_at,
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
        const { display_name, club_slug, username } = parsed.data;

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
        if (username !== undefined) {
            const u = username ? username.toLowerCase().trim() : null;
            if (u) {
                const { rows: dup } = await query(
                    'SELECT id FROM users WHERE LOWER(username) = $1 AND id <> $2',
                    [u, req.user.id]
                );
                if (dup.length) return res.status(409).json({ error: 'username_taken' });
            }
            values.push(u);
            fields.push(`username = $${values.length}`);
        }
        if (!fields.length) return res.status(400).json({ error: 'nenhum_campo_valido' });

        values.push(req.user.id);
        const { rows } = await query(
            `UPDATE users SET ${fields.join(', ')}
             WHERE id = $${values.length}
             RETURNING id, email, username, display_name, club_id, is_admin`,
            values
        );
        res.json({ user: rows[0] });
    } catch (err) { next(err); }
});

// =============================================================
// DELETE /auth/me — exclui a própria conta (irreversível)
// Exige senha + confirmação textual ("EXCLUIR")
// CASCADE apaga attendances, palpites, friendships, etc.
// boloes.created_by vira NULL pra não derrubar bolões de outros membros.
// =============================================================
router.delete('/me', requireUser, async (req, res, next) => {
    try {
        const parsed = DeleteMeSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'validation_failed' });
        }
        const { password, confirm } = parsed.data;

        if (confirm.trim().toUpperCase() !== 'EXCLUIR') {
            return res.status(400).json({ error: 'confirmation_mismatch' });
        }

        // Verifica a senha antes de excluir
        const { rows } = await query(
            'SELECT id, email, password_hash FROM users WHERE id = $1',
            [req.user.id]
        );
        const u = rows[0];
        if (!u) return res.status(404).json({ error: 'user_not_found' });

        const ok = await bcrypt.compare(password, u.password_hash);
        if (!ok) return res.status(401).json({ error: 'invalid_password' });

        await query('DELETE FROM users WHERE id = $1', [req.user.id]);
        res.json({ deleted: true });
    } catch (err) { next(err); }
});

export default router;
