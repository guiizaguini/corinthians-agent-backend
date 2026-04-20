import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

import { requireApiKey } from './middleware/auth.js';
import jogosRouter from './routes/jogos.js';
import estatisticasRouter from './routes/estatisticas.js';
import publicRouter from './routes/public.js';
import { pool } from './db/pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// =============================================================
// Health check (sem auth)
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
// Rota pública READ-ONLY para dashboards (sem API key)
// =============================================================
app.use('/public', publicRouter);

// =============================================================
// Páginas estáticas — qualquer um com o link acessa
// =============================================================
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

app.get('/museu', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'museu.html'));
});

// Serve outros arquivos da pasta public (imagens, etc).
// Não sobrepõe rotas acima porque elas vêm primeiro.
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => {
    // Raiz redireciona pro dashboard
    res.redirect('/dashboard');
});

app.get('/api', (req, res) => {
    res.json({
        name: 'corinthians-agent-backend',
        version: '1.4.0',
        dashboard: '/dashboard',
        endpoints_publicos: [
            'GET /health',
            'GET /public/snapshot',
            'GET /dashboard',
        ],
        endpoints_protegidos: [
            'GET  /jogos',
            'GET  /jogos/:id',
            'POST /jogos',
            'PATCH /jogos/:id',
            'DELETE /jogos/:id',
            'GET  /estatisticas/retrospecto',
            'GET  /estatisticas/por-ano',
            'GET  /estatisticas/por-campeonato',
            'GET  /estatisticas/por-rival?top=10',
            'GET  /estatisticas/por-estadio',
            'GET  /estatisticas/gastos',
            'GET  /estatisticas/resumo',
        ],
    });
});

// =============================================================
// Rotas protegidas por API key (pro MCP Agent)
// =============================================================
app.use('/jogos', requireApiKey, jogosRouter);
app.use('/estatisticas', requireApiKey, estatisticasRouter);

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
