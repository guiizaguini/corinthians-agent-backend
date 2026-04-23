import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

import { requireApiKey } from './middleware/auth.js';
import { requireUser, requireAdmin } from './middleware/authUser.js';
import { pool } from './db/pool.js';

// Rotas novas (v2 — SaaS)
import authRouter from './routes/auth.js';
import clubsRouter from './routes/clubs.js';
import gamesRouter from './routes/games.js';
import attendancesRouter from './routes/attendances.js';
import meRouter from './routes/me.js';
import notesRouter from './routes/notes.js';
import adminRouter from './routes/admin.js';

// Rotas legadas (v1 — continuam vivas durante a transição)
import jogosRouter from './routes/jogos.js';
import estatisticasRouter from './routes/estatisticas.js';
import publicRouter from './routes/public.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// =============================================================
// Health check
// =============================================================
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ ok: true, db: 'up', ts: new Date().toISOString() });
    } catch {
        res.status(503).json({ ok: false, db: 'down' });
    }
});

// =============================================================
// API v2 — SaaS (auth JWT)
// =============================================================
app.use('/auth', authRouter);
app.use('/clubs', clubsRouter);
app.use('/games', requireUser, gamesRouter);
app.use('/attendances', requireUser, attendancesRouter);
app.use('/me', requireUser, meRouter);
app.use('/notes', requireUser, notesRouter);
app.use('/admin', requireUser, requireAdmin, adminRouter);

// =============================================================
// API v1 legada — continua funcionando pro dashboard antigo
// e pro MCP Agent
// =============================================================
app.use('/public', publicRouter);
app.use('/jogos', requireApiKey, jogosRouter);
app.use('/estatisticas', requireApiKey, estatisticasRouter);

// =============================================================
// Páginas estáticas
// =============================================================
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'signup.html'));
});
app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'app.html'));
});
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

// Legado (continua servindo o site antigo do Guilherme)
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});
app.get('/museu', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'museu.html'));
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => {
    // Raiz: landing page white-label
    res.sendFile(path.join(__dirname, '..', 'public', 'landing.html'));
});

app.get('/api', (req, res) => {
    res.json({
        name: 'corinthians-agent-backend',
        version: '2.0.0',
        endpoints_v2: {
            auth: [
                'POST /auth/signup',
                'POST /auth/login',
                'GET  /auth/me  (Bearer)',
            ],
            games: ['GET /games  (Bearer)', 'GET /games/:id  (Bearer)'],
            attendances: [
                'GET    /attendances  (Bearer)',
                'POST   /attendances  (Bearer)',
                'PATCH  /attendances/:id  (Bearer)',
                'DELETE /attendances/:id  (Bearer)',
            ],
            me: ['GET /me/snapshot  (Bearer)'],
            paginas: ['/login', '/signup', '/app'],
        },
        endpoints_v1_legado: {
            publicos: ['GET /public/snapshot', '/dashboard', '/museu'],
            protegidos_api_key: [
                'GET/POST/PATCH/DELETE /jogos',
                'GET /estatisticas/*',
            ],
        },
    });
});

// =============================================================
// Handler de erros
// =============================================================
app.use((err, req, res, next) => {
    console.error('[err]', err);
    res.status(500).json({ error: 'internal_error', message: err.message });
});

app.listen(PORT, () => {
    console.log(`[server] ouvindo em :${PORT}`);
});
