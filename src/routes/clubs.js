import express from 'express';
import { query } from '../db/pool.js';

/**
 * Listagem pública de clubes pro dropdown do signup.
 * Sem auth — é info não-sensível (nome + cores).
 */
const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        // Filtra clubes que são torneios — eles NÃO aparecem no dropdown de signup
        const { rows } = await query(
            `SELECT id, slug, name, short_name, primary_color, secondary_color
             FROM clubs
             WHERE is_tournament = FALSE
             ORDER BY name`
        );
        res.json({ clubs: rows });
    } catch (err) { next(err); }
});

export default router;
