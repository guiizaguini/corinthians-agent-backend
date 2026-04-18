import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import { requireApiKey } from './middleware/auth.js';
import jogosRouter from './routes/jogos.js';
import estatisticasRouter from './routes/estatisticas.js';
import { pool } from './db/pool.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// =============================================================
// Health check (sem auth) - Railway usa para verificar se subiu
// =============================================================
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ ok: true, db: 'up', ts: new Date().toISOString() });
    } catch {
        res.status(503).json({ ok: false, db: 'down' });
    }
});

app.get('/', (req, res) => {
    res.json({
        name: 'corinthians-agent-backend',
        version: '1.0.0',
        endpoints: [
            'GET  /health',
            'GET  /jogos           (filtros: ano, rival, campeonato, resultado, status_presenca, is_corinthians, estadio, foi_classico, limit, offset, order)',
            'GET  /jogos/:id',
            'POST /jogos',
            'PATCH /jogos/:id',
            'DELETE /jogos/:id',
            'GET  /estatisticas/retrospecto (filtros: ano, campeonato, rival)',
            'GET  /estatisticas/por-ano',
            'GET  /estatisticas/por-campeonato',
            'GET  /estatisticas/por-rival?top=10',
            'GET  /estatisticas/por-estadio',
            'GET  /estatisticas/gastos',
            'GET  /estatisticas/resumo (tudo em uma chamada)',
        ],
    });
});

// =============================================================
// Rotas protegidas por API key
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
