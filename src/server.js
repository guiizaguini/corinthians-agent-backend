import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

import { requireApiKey } from './middleware/auth.js';
import { requireUser, requireAdmin } from './middleware/authUser.js';
import { pool } from './db/pool.js';
import { bootstrapSchema } from './utils/schemaBootstrap.js';

// Rotas novas (v2 — SaaS)
import authRouter from './routes/auth.js';
import clubsRouter from './routes/clubs.js';
import gamesRouter from './routes/games.js';
import attendancesRouter from './routes/attendances.js';
import meRouter from './routes/me.js';
import notesRouter from './routes/notes.js';
import socialRouter from './routes/social.js';
import tournamentsRouter from './routes/tournaments.js';
import adminRouter from './routes/admin.js';
import bolaoRouter from './routes/bolao.js';
import albumRouter from './routes/album.js';

// Rotas legadas (v1 — continuam vivas durante a transição)
import jogosRouter from './routes/jogos.js';
import estatisticasRouter from './routes/estatisticas.js';
import publicRouter from './routes/public.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
// Gzip compression: comprime JSON/HTML/CSS/JS — economia tipicamente 60-80% no tráfego
app.use(compression({
    level: 6,                      // bom balanço entre CPU e taxa de compressão
    threshold: 1024,               // só comprime payloads > 1kb
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    },
}));
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
// Páginas estáticas — definidas ANTES das APIs pra evitar
// que `app.use('/admin', requireUser, ...)` intercepte o GET /admin
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
// Painel analytics admin — DEFINIDO ANTES DO app.use('/admin', ...) abaixo
// pra ganhar precedencia sobre a rota da API. Auth gating eh via JS no
// proprio HTML (que checa user.is_admin antes de renderizar dados).
app.get('/admin/analytics', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin-analytics.html'));
});

// Página pública de lista de troca de cromos do álbum (visitante sem login)
// /troca/:username → renderiza HTML público com lista + CTA pra criar conta
// (rota separada de /album/* da API REST pra não conflitar)
app.get('/troca/:username', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'album-publico.html'));
});

// Legado (continua servindo o site antigo do Guilherme)
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});
app.get('/museu', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'museu.html'));
});

app.use(express.static(path.join(__dirname, '..', 'public')));

// =============================================================
// API v2 — SaaS (auth JWT)
// =============================================================
app.use('/auth', authRouter);
app.use('/clubs', clubsRouter);

// Config pública pro frontend (sem auth) — só expõe o Google Client ID
// se ele estiver configurado. Frontend usa pra decidir se renderiza
// o botão "Continuar com Google".
app.get('/config/public', (req, res) => {
    res.json({
        google_client_id: process.env.GOOGLE_CLIENT_ID
            ? process.env.GOOGLE_CLIENT_ID.split(',')[0].trim()
            : null,
    });
});
app.use('/games', requireUser, gamesRouter);
app.use('/attendances', requireUser, attendancesRouter);
app.use('/me', requireUser, meRouter);
app.use('/notes', requireUser, notesRouter);
app.use('/social', requireUser, socialRouter);
app.use('/tournaments', requireUser, tournamentsRouter);
app.use('/bolao', bolaoRouter);
// Álbum da Copa 2026 (sazonal). /album/catalog e /album/troca/:username são públicos
// (sem requireUser) — o resto é protegido dentro do router via requireUser.
app.use('/album', albumRouter);
app.use('/admin', requireUser, requireAdmin, adminRouter);

// =============================================================
// API v1 legada — continua funcionando pro dashboard antigo
// e pro MCP Agent
// =============================================================
app.use('/public', publicRouter);
app.use('/jogos', requireApiKey, jogosRouter);
app.use('/estatisticas', requireApiKey, estatisticasRouter);

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

// Bootstrap defensivo de schema antes de começar a aceitar requests
// (garante colunas/tabelas novas existem mesmo se migration manual nao rodou)
bootstrapSchema()
    .catch(err => console.error('[server] bootstrap falhou (continuando assim mesmo):', err.message))
    .finally(() => {
        app.listen(PORT, () => {
            console.log(`[server] ouvindo em :${PORT}`);
        });
    });
