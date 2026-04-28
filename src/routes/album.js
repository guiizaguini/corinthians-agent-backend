/**
 * Álbum da Copa 2026 — controle de cromos do torcedor.
 *
 * Endpoints:
 *   GET  /album/catalog                 — lista seleções + cromos (público pra view de troca)
 *   GET  /album/me                      — meu álbum: cromos + quantidade que tenho
 *   PUT  /album/me/cromo/:id            — seta quantidade de UM cromo (body: { quantidade })
 *   POST /album/me/cromo/:id/inc        — incrementa em 1 (ganhei mais um repetido)
 *   POST /album/me/cromo/:id/dec        — decrementa em 1 (troquei/perdi)
 *   GET  /album/troca/:username         — lista pública de troca de OUTRO user (faltantes + repetidos)
 *
 * Sazonalidade: as 3 tabelas (album_selecoes, album_cromos, user_album_cromos)
 * podem ser dropadas ao fim da Copa. Auto-bootstrap em schemaBootstrap.js.
 */

import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireUser } from '../middleware/authUser.js';

const router = Router();

// ====== GET /album/catalog ======
// Catálogo público (não exige auth) — usado pela view de troca também.
// Cache no front; recurso é estável durante a Copa.
router.get('/catalog', async (req, res, next) => {
    try {
        const { rows: selecoes } = await query(`
            SELECT id, code, name, flag_iso, grupo, ordem
            FROM album_selecoes
            ORDER BY ordem ASC, name ASC
        `);
        const { rows: cromos } = await query(`
            SELECT id, code, selecao_id, ordem, tipo, nome, posicao, raridade, photo_url
            FROM album_cromos
            ORDER BY selecao_id ASC, ordem ASC
        `);
        res.json({ selecoes, cromos, total: cromos.length });
    } catch (err) { next(err); }
});

// ====== GET /album/me ======
// Estado do meu álbum: junta catálogo + minha quantidade.
// Sempre retorna TODOS os cromos do catálogo (com quantidade = 0 quando não tenho).
router.get('/me', requireUser, async (req, res, next) => {
    try {
        const { rows } = await query(`
            SELECT
                c.id, c.code, c.selecao_id, c.ordem, c.tipo, c.nome, c.posicao,
                c.raridade, c.photo_url,
                COALESCE(uac.quantidade, 0) AS quantidade
            FROM album_cromos c
            LEFT JOIN user_album_cromos uac
                ON uac.cromo_id = c.id AND uac.user_id = $1
            ORDER BY c.selecao_id ASC, c.ordem ASC
        `, [req.user.id]);

        // Stats agregadas
        const total = rows.length;
        const tenho = rows.filter(r => r.quantidade > 0).length;
        const repetidos = rows.reduce((acc, r) => acc + Math.max(0, (r.quantidade || 0) - 1), 0);
        const faltam = total - tenho;
        const pct = total ? Math.round((tenho / total) * 100) : 0;

        res.json({
            cromos: rows,
            stats: { total, tenho, faltam, repetidos, pct },
        });
    } catch (err) { next(err); }
});

// ====== PUT /album/me/cromo/:id — set quantidade exata ======
const QtySchema = z.object({
    quantidade: z.number().int().min(0).max(99),
});
router.put('/me/cromo/:id', requireUser, async (req, res, next) => {
    try {
        const cromoId = parseInt(req.params.id);
        if (!Number.isInteger(cromoId)) return res.status(400).json({ error: 'invalid_cromo_id' });
        const parsed = QtySchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: 'validation_failed' });
        const { quantidade } = parsed.data;

        await query(`
            INSERT INTO user_album_cromos (user_id, cromo_id, quantidade, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (user_id, cromo_id) DO UPDATE SET
                quantidade = EXCLUDED.quantidade,
                updated_at = NOW()
        `, [req.user.id, cromoId, quantidade]);

        res.json({ cromo_id: cromoId, quantidade });
    } catch (err) { next(err); }
});

// ====== POST /album/me/cromo/:id/inc / /dec — incrementa / decrementa em 1 ======
router.post('/me/cromo/:id/inc', requireUser, async (req, res, next) => {
    try {
        const cromoId = parseInt(req.params.id);
        if (!Number.isInteger(cromoId)) return res.status(400).json({ error: 'invalid_cromo_id' });
        const { rows } = await query(`
            INSERT INTO user_album_cromos (user_id, cromo_id, quantidade, updated_at)
            VALUES ($1, $2, 1, NOW())
            ON CONFLICT (user_id, cromo_id) DO UPDATE SET
                quantidade = LEAST(99, user_album_cromos.quantidade + 1),
                updated_at = NOW()
            RETURNING quantidade
        `, [req.user.id, cromoId]);
        res.json({ cromo_id: cromoId, quantidade: rows[0]?.quantidade ?? 1 });
    } catch (err) { next(err); }
});

router.post('/me/cromo/:id/dec', requireUser, async (req, res, next) => {
    try {
        const cromoId = parseInt(req.params.id);
        if (!Number.isInteger(cromoId)) return res.status(400).json({ error: 'invalid_cromo_id' });
        const { rows } = await query(`
            UPDATE user_album_cromos
            SET quantidade = GREATEST(0, quantidade - 1), updated_at = NOW()
            WHERE user_id = $1 AND cromo_id = $2
            RETURNING quantidade
        `, [req.user.id, cromoId]);
        res.json({ cromo_id: cromoId, quantidade: rows[0]?.quantidade ?? 0 });
    } catch (err) { next(err); }
});

// ====== GET /album/troca/:username ======
// Lista PÚBLICA de troca: faltantes + repetidos do user.
// Não precisa de auth — pra alguém abrir um link compartilhado e ver direto.
router.get('/troca/:username', async (req, res, next) => {
    try {
        const username = String(req.params.username || '').toLowerCase().trim();
        if (!username) return res.status(400).json({ error: 'invalid_username' });

        const { rows: userRows } = await query(
            'SELECT id, username, display_name FROM users WHERE LOWER(username) = $1',
            [username]
        );
        const u = userRows[0];
        if (!u) return res.status(404).json({ error: 'user_not_found' });

        const { rows } = await query(`
            SELECT
                c.id, c.code, c.selecao_id, c.ordem, c.tipo, c.nome, c.posicao,
                c.raridade, c.photo_url,
                s.code AS selecao_code, s.name AS selecao_name, s.flag_iso,
                COALESCE(uac.quantidade, 0) AS quantidade
            FROM album_cromos c
            JOIN album_selecoes s ON s.id = c.selecao_id
            LEFT JOIN user_album_cromos uac
                ON uac.cromo_id = c.id AND uac.user_id = $1
            ORDER BY s.ordem ASC, c.ordem ASC
        `, [u.id]);

        const faltantes = rows.filter(r => r.quantidade === 0);
        const repetidos = rows
            .filter(r => r.quantidade > 1)
            .map(r => ({ ...r, repetidas: r.quantidade - 1 }));

        res.json({
            user: { id: u.id, username: u.username, display_name: u.display_name },
            faltantes,
            repetidos,
            stats: {
                faltantes: faltantes.length,
                repetidos: repetidos.length,
                total: rows.length,
                tenho: rows.filter(r => r.quantidade > 0).length,
            },
        });
    } catch (err) { next(err); }
});

export default router;
