import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { query } from '../db/pool.js';
import { signToken } from '../auth/jwt.js';
import { requireUser } from '../middleware/authUser.js';
import { createNotificationOnce } from '../utils/notifications.js';

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
    count_all_games: z.boolean().optional(),
});

const LoginSchema = z.object({
    email: z.string().email().max(200),
    password: z.string().min(1).max(120),
});

// Pra excluir conta o user prova identidade via SENHA (login tradicional)
// OU via google_credential (re-auth do Google) se for conta google-only.
// Schema aceita os dois — a rota valida que pelo menos um foi enviado.
const DeleteMeSchema = z.object({
    password: z.string().min(1).max(120).optional(),
    google_credential: z.string().min(20).max(4000).optional(),
    confirm: z.string().min(1).max(50), // user precisa digitar "EXCLUIR" pra confirmar
});

async function getClubIdBySlug(slug) {
    const { rows } = await query('SELECT id FROM clubs WHERE slug = $1', [slug]);
    return rows[0]?.id ?? null;
}

function publicUser(u) {
    // Aceita tanto campos crus do banco (password_hash, google_sub) quanto
    // booleanos pré-computados (has_password, has_google) — alguns SELECTs
    // calculam direto no SQL pra não trazer o hash bruto pra a request.
    const hasPassword = u.has_password !== undefined
        ? !!u.has_password
        : !!(u.password_hash && u.password_hash.length > 0);
    const hasGoogle = u.has_google !== undefined
        ? !!u.has_google
        : !!u.google_sub;
    return {
        id: u.id,
        email: u.email,
        display_name: u.display_name,
        club_id: u.club_id,
        is_admin: u.is_admin ?? false,
        // Indica método(s) de auth disponíveis — front usa pra decidir
        // se mostra campo de senha ou botão "re-autenticar com Google"
        // no fluxo de exclusão de conta.
        has_password: hasPassword,
        has_google: hasGoogle,
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
             RETURNING id, email, display_name, club_id, is_admin,
                       (password_hash IS NOT NULL AND password_hash <> '') AS has_password,
                       (google_sub IS NOT NULL) AS has_google`,
            [emailLc, hash, display_name ?? null, clubId, usernameLc]
        );
        const user = rows[0];
        // Boas-vindas no sino (1 por user, idempotente)
        createNotificationOnce(user.id, 'welcome').catch(() => {});
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
            `SELECT id, email, display_name, club_id, is_admin, google_sub,
                    (password_hash IS NOT NULL AND password_hash <> '') AS has_password,
                    (google_sub IS NOT NULL) AS has_google
             FROM users WHERE google_sub = $1`,
            [googleSub]
        );
        let user = rows[0];

        // 2) Se não, tenta por email — linka conta existente
        if (!user) {
            const r = await query(
                `SELECT id, email, display_name, club_id, is_admin, google_sub,
                        (password_hash IS NOT NULL AND password_hash <> '') AS has_password,
                        (google_sub IS NOT NULL) AS has_google
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
                 RETURNING id, email, display_name, club_id, is_admin,
                           (password_hash IS NOT NULL AND password_hash <> '') AS has_password,
                           (google_sub IS NOT NULL) AS has_google`,
                [emailLc, name || null, clubId, username, googleSub]
            );
            user = ins.rows[0];
            // Boas-vindas no sino (1 por user, idempotente)
            createNotificationOnce(user.id, 'welcome').catch(() => {});
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
            `SELECT id, email, password_hash, display_name, club_id, is_admin,
                    (password_hash IS NOT NULL AND password_hash <> '') AS has_password,
                    (google_sub IS NOT NULL) AS has_google
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
                    (u.password_hash IS NOT NULL AND u.password_hash <> '') AS has_password,
                    (u.google_sub IS NOT NULL) AS has_google,
                    COALESCE(u.count_all_games, FALSE) AS count_all_games,
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
        const { display_name, club_slug, username, count_all_games } = parsed.data;

        const fields = [];
        const values = [];

        if (count_all_games !== undefined) {
            values.push(count_all_games);
            fields.push(`count_all_games = $${values.length}`);
        }

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
             RETURNING id, email, username, display_name, club_id, is_admin,
                       COALESCE(count_all_games, FALSE) AS count_all_games`,
            values
        );
        // Invalida cache de snapshot pra refletir a mudança imediata
        // (count_all_games afeta jogos_outros_times — sem invalidar, dashboard
        // mostra estado antigo). Conquistas usam apenas jogos do clube e nao
        // sao afetadas pelo flag, mas invalidamos por seguranca em mudancas
        // de display_name/club_slug/username tambem.
        const { cache } = await import('../utils/cache.js');
        cache.invalidatePrefix(`snapshot:${req.user.id}`);
        cache.invalidatePrefix(`achievements:${req.user.id}`);
        cache.invalidatePrefix(`games:${req.user.id}`);
        res.json({ user: rows[0] });
    } catch (err) { next(err); }
});

// =============================================================
// DELETE /auth/me — exclui a própria conta (irreversível)
// Exige confirmação textual "EXCLUIR" + UMA das duas:
//   - password (login tradicional) → bcrypt.compare
//   - google_credential (conta google-only) → verifyIdToken + sub bate
// CASCADE apaga attendances, palpites, friendships, etc.
// boloes.created_by vira NULL pra não derrubar bolões de outros membros.
// =============================================================
router.delete('/me', requireUser, async (req, res, next) => {
    try {
        const parsed = DeleteMeSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'validation_failed' });
        }
        const { password, google_credential, confirm } = parsed.data;

        if (confirm.trim().toUpperCase() !== 'EXCLUIR') {
            return res.status(400).json({ error: 'confirmation_mismatch' });
        }

        const { rows } = await query(
            'SELECT id, email, password_hash, google_sub FROM users WHERE id = $1',
            [req.user.id]
        );
        const u = rows[0];
        if (!u) return res.status(404).json({ error: 'user_not_found' });

        const hasPassword = !!(u.password_hash && u.password_hash.length > 0);
        const hasGoogle = !!u.google_sub;

        // Caminho A: confirmou via senha
        if (password) {
            if (!hasPassword) {
                // user google-only mandou senha — recusa
                return res.status(400).json({ error: 'no_password_set' });
            }
            const ok = await bcrypt.compare(password, u.password_hash);
            if (!ok) return res.status(401).json({ error: 'invalid_password' });
        }
        // Caminho B: confirmou re-autenticando com Google
        else if (google_credential) {
            if (!hasGoogle) return res.status(400).json({ error: 'no_google_linked' });
            if (!googleClient) return res.status(503).json({ error: 'google_auth_not_configured' });
            try {
                const ticket = await googleClient.verifyIdToken({
                    idToken: google_credential,
                    audience: googleAudiences.length === 1 ? googleAudiences[0] : googleAudiences,
                });
                const payload = ticket.getPayload();
                if (payload.sub !== u.google_sub) {
                    // Logou com OUTRA conta Google — recusa
                    return res.status(401).json({ error: 'google_account_mismatch' });
                }
            } catch (_) {
                return res.status(401).json({ error: 'invalid_google_token' });
            }
        }
        // Nada → faltou prova de identidade
        else {
            return res.status(400).json({ error: 'auth_required' });
        }

        await query('DELETE FROM users WHERE id = $1', [req.user.id]);
        res.json({ deleted: true });
    } catch (err) { next(err); }
});

export default router;
