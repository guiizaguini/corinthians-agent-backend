import express from 'express';
import { query } from '../db/pool.js';
import { cache } from '../utils/cache.js';

/**
 * Catálogo de jogos do clube do usuário.
 * Protegido por requireUser (passado no server.js).
 * Retorna jogos do club_id do req.user, enriquecidos com o
 * registro de presença do próprio user (LEFT JOIN attendances).
 */
const router = express.Router();

// =============================================================
// GET /games — lista jogos do catálogo do clube do user
// Filtros: ano, rival, campeonato, so_presenca (1 = só jogos que tenho attendance)
// =============================================================
router.get('/', async (req, res, next) => {
    try {
        const {
            ano, rival, campeonato, estadio,
            so_presenca,
            limit = 500, offset = 0, order = 'desc',
        } = req.query;

        // Cache só pra requests "vazios" (sem filtros) — o caso comum do app
        const isVanilla = !ano && !rival && !campeonato && !estadio && !so_presenca && !offset && order !== 'asc';
        const cacheKey = isVanilla ? `games:${req.user.id}:${req.user.club_id}:${limit}` : null;
        if (cacheKey) {
            const cached = cache.get(cacheKey);
            if (cached) return res.json(cached);
        }

        // $1 = club_id do user; $2 = user_id. Inclui no catalogo:
        //  (a) jogos do clube do user (catalogo padrao)
        //  (b) jogos cross-club que o user MARCOU presenca (pra aparecer
        //      em meus-ingressos mesmo nao sendo do clube dele).
        // Cross-club games sao marcados com is_cross_club=true pro frontend
        // filtrar do catalogo principal mas mostrar em meus-ingressos.
        const conds = [`(g.club_id = $1 OR EXISTS (SELECT 1 FROM attendances ax WHERE ax.game_id = g.id AND ax.user_id = $2))`];
        const params = [req.user.club_id, req.user.id];
        const userIdx = 2;

        if (ano)        { params.push(parseInt(ano));     conds.push(`EXTRACT(YEAR FROM g.data) = $${params.length}`); }
        if (rival)      { params.push(`%${rival}%`);      conds.push(`(unaccent(g.time_visitante) ILIKE unaccent($${params.length}) OR unaccent(g.time_casa) ILIKE unaccent($${params.length}))`); }
        if (campeonato) { params.push(`%${campeonato}%`); conds.push(`unaccent(g.campeonato) ILIKE unaccent($${params.length})`); }
        if (estadio)    { params.push(`%${estadio}%`);    conds.push(`unaccent(g.estadio) ILIKE unaccent($${params.length})`); }

        if (so_presenca === '1' || so_presenca === 'true') {
            conds.push(`a.id IS NOT NULL AND a.status = 'PRESENTE'`);
        }

        const ord = order === 'asc' ? 'ASC' : 'DESC';

        params.push(Math.min(parseInt(limit), 1000));
        params.push(parseInt(offset));

        const sql = `
            SELECT
                g.id, g.data, g.dia_semana, g.time_casa, g.time_visitante,
                g.mando, g.campeonato, g.genero, g.estadio,
                g.gols_casa, g.gols_visitante, g.resultado,
                g.foi_classico, g.teve_penal, g.fase, g.titulo_conquistado,
                g.autores_gols, g.gols_texto, g.publico_total,
                (g.club_id <> $1) AS is_cross_club,
                cl.name AS catalog_club_name,
                cl.short_name AS catalog_club_short,
                a.id           AS attendance_id,
                a.status       AS status_presenca,
                a.setor        AS setor,
                a.assento      AS assento,
                a.valor_pago   AS valor_pago,
                a.observacoes  AS observacoes,
                COALESCE((
                    SELECT json_agg(json_build_object(
                        'user_id', u.id,
                        'username', u.username,
                        'display_name', u.display_name,
                        'status', ac.status
                    ))
                    FROM attendance_companions ac
                    JOIN users u ON u.id = ac.companion_user_id
                    WHERE ac.attendance_id = a.id
                ), '[]'::json) AS companions,
                CASE
                    WHEN g.time_casa = (SELECT name FROM clubs WHERE id = g.club_id) THEN g.time_visitante
                    WHEN g.time_visitante = (SELECT name FROM clubs WHERE id = g.club_id) THEN g.time_casa
                    ELSE g.time_casa || ' x ' || g.time_visitante
                END AS adversario
            FROM games g
            JOIN clubs cl ON cl.id = g.club_id
            LEFT JOIN attendances a
              ON a.game_id = g.id AND a.user_id = $${userIdx}
            WHERE ${conds.join(' AND ')}
            ORDER BY g.data ${ord}, g.id ${ord}
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `;
        const { rows } = await query(sql, params);

        // Count usa os mesmos params ate o userIdx (sem limit/offset)
        // Como user_id agora ta em $2, slice ate userIdx (2) nao basta — precisamos
        // tambem dos params dos filtros opcionais (ano, rival, etc), exceto os
        // 2 ultimos que sao limit/offset.
        const countParams = params.slice(0, params.length - 2);
        const { rows: countRows } = await query(
            `SELECT COUNT(*)::int AS total
             FROM games g
             LEFT JOIN attendances a ON a.game_id = g.id AND a.user_id = $${userIdx}
             WHERE ${conds.join(' AND ')}`,
            countParams
        );

        const payload = { total: countRows[0].total, count: rows.length, games: rows };
        if (cacheKey) cache.set(cacheKey, payload, 5 * 60 * 1000); // 5 min
        res.json(payload);
    } catch (err) { next(err); }
});

// =============================================================
// GET /games/search?q=...&include_other_clubs=1
// Busca com escopo configuravel:
//  - default: filtra pelo clube do user (mesmo escopo do catalogo)
//  - include_other_clubs=1: ignora club_id e busca em todos os clubes
//    (pra um Pal-torcedor achar um jogo do Fla x Cor que ele foi).
// Retorna ate 50 jogos com info do "catalogo de origem" (nome do clube
// que possui a row) + status de presenca do user (se tiver).
// Dedup logico: Cor x Pal existe em 2 rows; mostra a mais relevante:
//  1) onde o user ja tem attendance > 2) clube do user > 3) qualquer
// =============================================================
router.get('/search', async (req, res, next) => {
    try {
        const q = String(req.query.q || '').trim();
        if (q.length < 2) return res.json({ count: 0, games: [] });
        const includeOther = req.query.include_other_clubs === '1' || req.query.include_other_clubs === 'true';
        const like = `%${q}%`;

        const conds = [`(unaccent(g.time_casa) ILIKE unaccent($1) OR unaccent(g.time_visitante) ILIKE unaccent($1) OR unaccent(g.campeonato) ILIKE unaccent($1) OR unaccent(g.estadio) ILIKE unaccent($1))`];
        const params = [like];

        if (!includeOther) {
            params.push(req.user.club_id);
            conds.push(`g.club_id = $${params.length}`);
        }

        params.push(req.user.id);
        const userIdx = params.length;

        const sql = `
            SELECT
                g.id, g.data, g.dia_semana, g.time_casa, g.time_visitante,
                g.mando, g.campeonato, g.genero, g.estadio,
                g.gols_casa, g.gols_visitante, g.resultado,
                g.foi_classico, g.teve_penal, g.fase, g.titulo_conquistado,
                g.autores_gols, g.gols_texto, g.publico_total,
                g.club_id AS catalog_club_id,
                cl.name AS catalog_club_name,
                cl.short_name AS catalog_club_short,
                cl.is_tournament AS catalog_is_tournament,
                a.id AS attendance_id, a.status AS status_presenca,
                a.setor, a.assento, a.valor_pago, a.observacoes
            FROM games g
            JOIN clubs cl ON cl.id = g.club_id
            LEFT JOIN attendances a ON a.game_id = g.id AND a.user_id = $${userIdx}
            WHERE ${conds.join(' AND ')}
            ORDER BY g.data DESC, g.id DESC
            LIMIT 200
        `;
        const { rows } = await query(sql, params);

        // Dedup por (data, time_casa, time_visitante, genero) — Cor x Pal duplicado
        // entre 2 catalogos vira 1 resultado. Prioridade: attendance > meu clube > qualquer.
        const seen = new Map();
        for (const g of rows) {
            const key = `${g.data}|${g.time_casa}|${g.time_visitante}|${g.genero || ''}`;
            const prev = seen.get(key);
            if (!prev) { seen.set(key, g); continue; }
            // Atual tem attendance e o anterior nao? Troca.
            if (g.attendance_id && !prev.attendance_id) { seen.set(key, g); continue; }
            if (!g.attendance_id && prev.attendance_id) continue;
            // Senao, prefere catalogo do clube do user
            if (g.catalog_club_id === req.user.club_id && prev.catalog_club_id !== req.user.club_id) {
                seen.set(key, g);
            }
        }

        const out = [...seen.values()].slice(0, 50);
        res.json({ count: out.length, games: out });
    } catch (err) { next(err); }
});

// =============================================================
// GET /games/:id
// Sem filtro de club_id — qualquer user logado consegue ver qualquer
// jogo (pra suportar cross-club search). canUserAttendGame ainda
// valida no POST /attendances.
// =============================================================
router.get('/:id', async (req, res, next) => {
    try {
        const { rows } = await query(
            `SELECT
                g.*,
                cl.name AS catalog_club_name,
                cl.short_name AS catalog_club_short,
                cl.is_tournament AS catalog_is_tournament,
                a.id AS attendance_id, a.status AS status_presenca,
                a.setor, a.assento, a.valor_pago, a.observacoes
             FROM games g
             JOIN clubs cl ON cl.id = g.club_id
             LEFT JOIN attendances a ON a.game_id = g.id AND a.user_id = $1
             WHERE g.id = $2`,
            [req.user.id, req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'game_not_found' });
        res.json(rows[0]);
    } catch (err) { next(err); }
});

export default router;
