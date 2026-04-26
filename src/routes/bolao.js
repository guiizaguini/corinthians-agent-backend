import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { query } from '../db/pool.js';
import { requireUser, requireAdmin } from '../middleware/authUser.js';
import { cache, invalidate } from '../utils/cache.js';

const router = Router();
router.use(requireUser);

// =============================================================
// Regras de pontuação (resolver num lugar só pra vazar pro front)
// =============================================================
export const BOLAO_PONTOS = {
    PLACAR_EXATO: 15,
    VENCEDOR_E_SALDO: 10,
    VENCEDOR: 7,
    EMPATE_CORRETO: 5,
    EXTRA_CAMPEAO: 30,
    EXTRA_VICE: 10,
    EXTRA_ARTILHEIRO: 20,
    EXTRA_FASE_BRASIL: 15,
};

const TOURNAMENT_SLUG = 'copa-do-mundo-2026';
const MINUTOS_TRAVAR_ANTES = 1;

function gerarCodigoConvite() {
    // 10 caracteres hex maiúsculos (ex: A3F7B9C2E1)
    return crypto.randomBytes(5).toString('hex').toUpperCase();
}

// Calcula o timestamp do kickoff em UTC assumindo horário local BR (UTC-3)
function calcularKickoff(data, horario) {
    const d = data instanceof Date ? data.toISOString().substring(0, 10) : String(data).substring(0, 10);
    const h = horario || '12:00';
    return new Date(`${d}T${h}:00-03:00`);
}

// Verifica se o usuário é membro do bolão
async function assertMember(bolaoId, userId) {
    const { rows } = await query(
        'SELECT 1 FROM bolao_members WHERE bolao_id = $1 AND user_id = $2',
        [bolaoId, userId]
    );
    return rows.length > 0;
}

// =============================================================
// GET /bolao/meus — lista os bolões do usuário logado
// =============================================================
router.get('/meus', async (req, res, next) => {
    try {
        // Total de jogos do torneio (constante por enquanto = jogos da Copa 2026)
        const { rows: totalJogosRows } = await query(`
            SELECT COUNT(*)::int AS n
            FROM games g JOIN clubs c ON c.id = g.club_id
            WHERE c.slug = $1
        `, [TOURNAMENT_SLUG]);
        const total_jogos = totalJogosRows[0]?.n || 0;

        // Próximo jogo da Copa (kickoff > now)
        const { rows: proxRows } = await query(`
            SELECT g.id, g.data, g.horario, g.time_casa, g.time_visitante, g.fase, g.estadio
            FROM games g JOIN clubs c ON c.id = g.club_id
            WHERE c.slug = $1
              AND g.data >= CURRENT_DATE
            ORDER BY g.data ASC, g.horario ASC NULLS LAST
            LIMIT 1
        `, [TOURNAMENT_SLUG]);
        const proximo_jogo_global = proxRows[0] || null;

        // Bolões do user — com pontos/posição/progresso de palpites
        const { rows } = await query(`
            WITH meus_boloes AS (
                SELECT b.id, b.name, b.description, b.invite_code, b.created_at, b.created_by, bm.joined_at
                FROM boloes b
                JOIN bolao_members bm ON bm.bolao_id = b.id AND bm.user_id = $1
            ),
            all_rank AS (
                SELECT
                    bm.bolao_id,
                    bm.user_id,
                    COALESCE(SUM(
                        CASE
                            WHEN p.gols_casa = g.gols_casa AND p.gols_visitante = g.gols_visitante THEN $2
                            WHEN p.gols_casa = p.gols_visitante AND g.gols_casa = g.gols_visitante THEN $5
                            WHEN SIGN(p.gols_casa - p.gols_visitante) = SIGN(g.gols_casa - g.gols_visitante)
                                AND (p.gols_casa - p.gols_visitante) = (g.gols_casa - g.gols_visitante) THEN $3
                            WHEN SIGN(p.gols_casa - p.gols_visitante) = SIGN(g.gols_casa - g.gols_visitante) THEN $4
                            ELSE 0
                        END
                    ), 0)::int AS pontos
                FROM bolao_members bm
                LEFT JOIN bolao_palpites p
                    ON p.user_id = bm.user_id AND p.bolao_id = bm.bolao_id
                LEFT JOIN games g ON g.id = p.game_id
                    AND g.gols_casa IS NOT NULL AND g.gols_visitante IS NOT NULL
                WHERE bm.bolao_id IN (SELECT id FROM meus_boloes)
                GROUP BY bm.bolao_id, bm.user_id
            ),
            posicoes AS (
                SELECT
                    bolao_id, user_id, pontos,
                    RANK() OVER (PARTITION BY bolao_id ORDER BY pontos DESC) AS posicao
                FROM all_rank
            ),
            palpites_feitos AS (
                SELECT bolao_id, COUNT(*)::int AS n
                FROM bolao_palpites
                WHERE user_id = $1
                  AND bolao_id IN (SELECT id FROM meus_boloes)
                GROUP BY bolao_id
            )
            SELECT
                b.id, b.name, b.description, b.invite_code, b.created_at, b.created_by, b.joined_at,
                (SELECT COUNT(*)::int FROM bolao_members WHERE bolao_id = b.id) AS member_count,
                COALESCE(po.pontos, 0)::int AS my_pontos,
                po.posicao::int AS my_posicao,
                COALESCE(pf.n, 0)::int AS palpites_feitos
            FROM meus_boloes b
            LEFT JOIN posicoes po ON po.bolao_id = b.id AND po.user_id = $1
            LEFT JOIN palpites_feitos pf ON pf.bolao_id = b.id
            ORDER BY b.joined_at DESC
        `, [
            req.user.id,
            BOLAO_PONTOS.PLACAR_EXATO,
            BOLAO_PONTOS.VENCEDOR_E_SALDO,
            BOLAO_PONTOS.VENCEDOR,
            BOLAO_PONTOS.EMPATE_CORRETO,
        ]);

        res.json({
            boloes: rows,
            pontos: BOLAO_PONTOS,
            total_jogos,
            proximo_jogo: proximo_jogo_global,
        });
    } catch (err) { next(err); }
});

// =============================================================
// POST /bolao — cria bolão (admin-only, cadeado pra usuários comuns)
// =============================================================
const CreateSchema = z.object({
    name: z.string().trim().min(3).max(120),
    description: z.string().trim().max(500).optional(),
});

router.post('/', requireAdmin, async (req, res, next) => {
    try {
        const parsed = CreateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: 'validation_failed', details: parsed.error.issues });

        const { rows: clubRows } = await query(
            "SELECT id FROM clubs WHERE slug = $1",
            [TOURNAMENT_SLUG]
        );
        if (!clubRows.length) return res.status(400).json({ error: 'tournament_not_found' });

        // Tenta 5x pra evitar colisão no invite_code (quase impossível, mas...)
        let code, rows;
        for (let i = 0; i < 5; i++) {
            code = gerarCodigoConvite();
            const r = await query(`
                INSERT INTO boloes (tournament_club_id, name, description, invite_code, created_by)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (invite_code) DO NOTHING
                RETURNING id, name, description, invite_code, created_at
            `, [clubRows[0].id, parsed.data.name, parsed.data.description || null, code, req.user.id]);
            if (r.rows.length) { rows = r.rows; break; }
        }
        if (!rows) return res.status(500).json({ error: 'invite_code_generation_failed' });

        // Criador vira membro
        await query(
            'INSERT INTO bolao_members (bolao_id, user_id) VALUES ($1, $2)',
            [rows[0].id, req.user.id]
        );

        res.status(201).json({ bolao: rows[0] });
    } catch (err) { next(err); }
});

// =============================================================
// POST /bolao/join — entra via invite_code
// =============================================================
const JoinSchema = z.object({ invite_code: z.string().trim().min(4).max(30) });

router.post('/join', async (req, res, next) => {
    try {
        const parsed = JoinSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: 'validation_failed' });

        const code = parsed.data.invite_code.toUpperCase();
        const { rows } = await query(
            'SELECT id, name FROM boloes WHERE UPPER(invite_code) = $1',
            [code]
        );
        if (!rows.length) return res.status(404).json({ error: 'bolao_not_found' });

        const bolao = rows[0];
        const { rows: existing } = await query(
            'SELECT id FROM bolao_members WHERE bolao_id = $1 AND user_id = $2',
            [bolao.id, req.user.id]
        );
        if (existing.length) return res.status(409).json({ error: 'already_member', bolao_id: bolao.id });

        await query(
            'INSERT INTO bolao_members (bolao_id, user_id) VALUES ($1, $2)',
            [bolao.id, req.user.id]
        );
        invalidate.bolaoMembers(bolao.id);
        res.json({ bolao_id: bolao.id, name: bolao.name });
    } catch (err) { next(err); }
});

// =============================================================
// DELETE /bolao/:id/leave — sair do bolão
// =============================================================
router.delete('/:id/leave', async (req, res, next) => {
    try {
        const bolaoId = parseInt(req.params.id);
        await query(
            'DELETE FROM bolao_members WHERE bolao_id = $1 AND user_id = $2',
            [bolaoId, req.user.id]
        );
        invalidate.bolaoMembers(bolaoId);
        res.json({ saiu: true });
    } catch (err) { next(err); }
});

// =============================================================
// DELETE /bolao/:id — exclui bolão inteiro (criador ou admin)
// CASCADE apaga membros, palpites e extras automaticamente.
// =============================================================
router.delete('/:id', async (req, res, next) => {
    try {
        const bolaoId = parseInt(req.params.id);
        const { rows } = await query(
            'SELECT id, created_by, name FROM boloes WHERE id = $1',
            [bolaoId]
        );
        if (!rows.length) return res.status(404).json({ error: 'bolao_not_found' });

        const b = rows[0];
        const isCreator = b.created_by === req.user.id;
        const isAdmin = !!req.user.is_admin;
        if (!isCreator && !isAdmin) {
            return res.status(403).json({ error: 'only_creator_or_admin' });
        }

        await query('DELETE FROM boloes WHERE id = $1', [bolaoId]);
        invalidate.bolaoMembers(bolaoId);
        res.json({ deleted: true, bolao_id: bolaoId, name: b.name });
    } catch (err) { next(err); }
});

// =============================================================
// GET /bolao/:id — detalhes do bolão + membros
// =============================================================
router.get('/:id', async (req, res, next) => {
    try {
        const bolaoId = parseInt(req.params.id);
        if (!(await assertMember(bolaoId, req.user.id))) {
            return res.status(403).json({ error: 'not_member' });
        }
        const { rows } = await query(
            `SELECT id, name, description, invite_code, created_by, created_at
             FROM boloes WHERE id = $1`,
            [bolaoId]
        );
        if (!rows.length) return res.status(404).json({ error: 'bolao_not_found' });

        const { rows: members } = await query(`
            SELECT u.id, u.username, u.display_name, bm.joined_at
            FROM bolao_members bm
            JOIN users u ON u.id = bm.user_id
            WHERE bm.bolao_id = $1
            ORDER BY bm.joined_at ASC
        `, [bolaoId]);

        res.json({
            bolao: rows[0],
            members,
            pontos: BOLAO_PONTOS,
            minutos_travar_antes: MINUTOS_TRAVAR_ANTES,
        });
    } catch (err) { next(err); }
});

// =============================================================
// GET /bolao/:id/games — jogos do torneio + palpite do usuário
// =============================================================
router.get('/:id/games', async (req, res, next) => {
    try {
        const bolaoId = parseInt(req.params.id);
        if (!(await assertMember(bolaoId, req.user.id))) {
            return res.status(403).json({ error: 'not_member' });
        }

        const { rows } = await query(`
            SELECT
                g.id, g.data, g.horario, g.time_casa, g.time_visitante,
                g.estadio, g.fase, g.campeonato,
                g.gols_casa AS gols_casa_real,
                g.gols_visitante AS gols_visitante_real,
                p.gols_casa AS palpite_casa,
                p.gols_visitante AS palpite_visitante,
                p.updated_at AS palpite_updated_at
            FROM games g
            JOIN clubs c ON c.id = g.club_id
            LEFT JOIN bolao_palpites p
                ON p.game_id = g.id AND p.bolao_id = $1 AND p.user_id = $2
            WHERE c.slug = $3
            ORDER BY g.data ASC, g.horario ASC, g.id ASC
        `, [bolaoId, req.user.id, TOURNAMENT_SLUG]);

        // Calcula se o jogo já travou (< 1min pro kickoff)
        const agora = Date.now();
        const games = rows.map(g => {
            const kickoff = calcularKickoff(g.data, g.horario);
            const travado = (kickoff.getTime() - agora) < MINUTOS_TRAVAR_ANTES * 60 * 1000;
            return { ...g, kickoff: kickoff.toISOString(), travado };
        });

        res.json({ games });
    } catch (err) { next(err); }
});

// =============================================================
// PUT /bolao/:id/palpite/:game_id — cria ou atualiza palpite
// =============================================================
const PalpiteSchema = z.object({
    gols_casa: z.number().int().min(0).max(20),
    gols_visitante: z.number().int().min(0).max(20),
});

router.put('/:id/palpite/:game_id', async (req, res, next) => {
    try {
        const bolaoId = parseInt(req.params.id);
        const gameId = parseInt(req.params.game_id);
        const parsed = PalpiteSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: 'validation_failed' });

        if (!(await assertMember(bolaoId, req.user.id))) {
            return res.status(403).json({ error: 'not_member' });
        }

        // Jogo é do torneio certo?
        const { rows: gRows } = await query(`
            SELECT g.id, g.data, g.horario, c.slug
            FROM games g
            JOIN clubs c ON c.id = g.club_id
            WHERE g.id = $1
        `, [gameId]);
        if (!gRows.length) return res.status(404).json({ error: 'game_not_found' });
        if (gRows[0].slug !== TOURNAMENT_SLUG) return res.status(400).json({ error: 'game_not_in_tournament' });

        const kickoff = calcularKickoff(gRows[0].data, gRows[0].horario);
        const diffMs = kickoff.getTime() - Date.now();
        if (diffMs < MINUTOS_TRAVAR_ANTES * 60 * 1000) {
            return res.status(403).json({ error: 'palpite_closed', kickoff: kickoff.toISOString() });
        }

        const { rows } = await query(`
            INSERT INTO bolao_palpites (bolao_id, user_id, game_id, gols_casa, gols_visitante)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (bolao_id, user_id, game_id)
            DO UPDATE SET
                gols_casa = EXCLUDED.gols_casa,
                gols_visitante = EXCLUDED.gols_visitante,
                updated_at = NOW()
            RETURNING id, gols_casa, gols_visitante, updated_at
        `, [bolaoId, req.user.id, gameId, parsed.data.gols_casa, parsed.data.gols_visitante]);

        invalidate.bolao(bolaoId);
        res.json({ palpite: rows[0] });
    } catch (err) { next(err); }
});

// =============================================================
// GET /bolao/:id/ranking — pontuação de cada membro
// =============================================================
router.get('/:id/ranking', async (req, res, next) => {
    try {
        const bolaoId = parseInt(req.params.id);
        if (!(await assertMember(bolaoId, req.user.id))) {
            return res.status(403).json({ error: 'not_member' });
        }

        const cacheKey = `ranking:${bolaoId}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        const { rows } = await query(`
            WITH jogos_com_resultado AS (
                SELECT g.id, g.gols_casa, g.gols_visitante
                FROM games g
                JOIN clubs c ON c.id = g.club_id
                WHERE c.slug = $1
                  AND g.gols_casa IS NOT NULL
                  AND g.gols_visitante IS NOT NULL
            ),
            pontos_por_jogo AS (
                SELECT
                    bm.user_id,
                    COUNT(p.id)::int AS palpites_feitos,
                    COUNT(jr.id)::int AS jogos_finalizados_com_palpite,
                    COALESCE(SUM(
                        CASE
                            -- Placar exato
                            WHEN p.gols_casa = jr.gols_casa AND p.gols_visitante = jr.gols_visitante
                                THEN $2
                            -- Empate correto (ambos empataram, placar diferente)
                            WHEN p.gols_casa = p.gols_visitante AND jr.gols_casa = jr.gols_visitante
                                THEN $5
                            -- Vencedor + saldo de gols igual
                            WHEN SIGN(p.gols_casa - p.gols_visitante) = SIGN(jr.gols_casa - jr.gols_visitante)
                                AND (p.gols_casa - p.gols_visitante) = (jr.gols_casa - jr.gols_visitante)
                                THEN $3
                            -- Só o vencedor
                            WHEN SIGN(p.gols_casa - p.gols_visitante) = SIGN(jr.gols_casa - jr.gols_visitante)
                                THEN $4
                            ELSE 0
                        END
                    ), 0)::int AS pontos_jogos
                FROM bolao_members bm
                LEFT JOIN bolao_palpites p
                    ON p.user_id = bm.user_id AND p.bolao_id = bm.bolao_id
                LEFT JOIN jogos_com_resultado jr ON jr.id = p.game_id
                WHERE bm.bolao_id = $6
                GROUP BY bm.user_id
            ),
            extras_oficiais AS (
                SELECT campeao, vice, artilheiro, fase_brasil
                FROM bolao_extras_oficiais
                WHERE bolao_id = $6
            ),
            pontos_extras AS (
                SELECT
                    pe.user_id,
                    COALESCE(
                        (CASE WHEN eo.campeao    IS NOT NULL AND LOWER(pe.campeao)    = LOWER(eo.campeao)    THEN $7  ELSE 0 END) +
                        (CASE WHEN eo.vice       IS NOT NULL AND LOWER(pe.vice)       = LOWER(eo.vice)       THEN $8  ELSE 0 END) +
                        (CASE WHEN eo.artilheiro IS NOT NULL AND LOWER(pe.artilheiro) = LOWER(eo.artilheiro) THEN $9  ELSE 0 END) +
                        (CASE WHEN eo.fase_brasil IS NOT NULL AND UPPER(pe.fase_brasil) = UPPER(eo.fase_brasil) THEN $10 ELSE 0 END),
                        0
                    )::int AS pontos_extras
                FROM bolao_palpites_extras pe
                CROSS JOIN extras_oficiais eo
                WHERE pe.bolao_id = $6
            )
            SELECT
                u.id, u.username, u.display_name,
                COALESCE(ppj.palpites_feitos, 0) AS palpites_feitos,
                COALESCE(ppj.jogos_finalizados_com_palpite, 0) AS jogos_finalizados,
                COALESCE(ppj.pontos_jogos, 0) AS pontos_jogos,
                COALESCE(pe.pontos_extras, 0) AS pontos_extras,
                (COALESCE(ppj.pontos_jogos, 0) + COALESCE(pe.pontos_extras, 0)) AS pontos_total
            FROM bolao_members bm
            JOIN users u ON u.id = bm.user_id
            LEFT JOIN pontos_por_jogo ppj ON ppj.user_id = u.id
            LEFT JOIN pontos_extras pe ON pe.user_id = u.id
            WHERE bm.bolao_id = $6
            ORDER BY pontos_total DESC, palpites_feitos DESC, u.display_name ASC
        `, [
            TOURNAMENT_SLUG,
            BOLAO_PONTOS.PLACAR_EXATO,
            BOLAO_PONTOS.VENCEDOR_E_SALDO,
            BOLAO_PONTOS.VENCEDOR,
            BOLAO_PONTOS.EMPATE_CORRETO,
            bolaoId,
            BOLAO_PONTOS.EXTRA_CAMPEAO,
            BOLAO_PONTOS.EXTRA_VICE,
            BOLAO_PONTOS.EXTRA_ARTILHEIRO,
            BOLAO_PONTOS.EXTRA_FASE_BRASIL,
        ]);

        const payload = { ranking: rows, regras: BOLAO_PONTOS };
        cache.set(cacheKey, payload, 30 * 1000); // 30 segundos
        res.json(payload);
    } catch (err) { next(err); }
});

// =============================================================
// GET /bolao/:id/extras — pega palpites extras do usuário
// =============================================================
router.get('/:id/extras', async (req, res, next) => {
    try {
        const bolaoId = parseInt(req.params.id);
        if (!(await assertMember(bolaoId, req.user.id))) {
            return res.status(403).json({ error: 'not_member' });
        }
        const { rows } = await query(
            `SELECT campeao, vice, artilheiro, fase_brasil, updated_at
             FROM bolao_palpites_extras
             WHERE bolao_id = $1 AND user_id = $2`,
            [bolaoId, req.user.id]
        );
        res.json({ extras: rows[0] || null });
    } catch (err) { next(err); }
});

// =============================================================
// PUT /bolao/:id/extras — salva palpites extras
// =============================================================
const ExtrasSchema = z.object({
    campeao: z.string().trim().max(80).optional().nullable(),
    vice: z.string().trim().max(80).optional().nullable(),
    artilheiro: z.string().trim().max(80).optional().nullable(),
    fase_brasil: z.enum(['GRUPOS', 'OITAVAS_32', 'OITAVAS', 'QUARTAS', 'SEMIS', 'FINAL', 'CAMPEAO']).optional().nullable(),
});

router.put('/:id/extras', async (req, res, next) => {
    try {
        const bolaoId = parseInt(req.params.id);
        if (!(await assertMember(bolaoId, req.user.id))) {
            return res.status(403).json({ error: 'not_member' });
        }
        const parsed = ExtrasSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: 'validation_failed' });

        const { rows } = await query(`
            INSERT INTO bolao_palpites_extras (bolao_id, user_id, campeao, vice, artilheiro, fase_brasil)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (bolao_id, user_id) DO UPDATE SET
                campeao = EXCLUDED.campeao,
                vice = EXCLUDED.vice,
                artilheiro = EXCLUDED.artilheiro,
                fase_brasil = EXCLUDED.fase_brasil,
                updated_at = NOW()
            RETURNING campeao, vice, artilheiro, fase_brasil, updated_at
        `, [
            bolaoId, req.user.id,
            parsed.data.campeao || null,
            parsed.data.vice || null,
            parsed.data.artilheiro || null,
            parsed.data.fase_brasil || null,
        ]);
        invalidate.bolao(bolaoId);
        res.json({ extras: rows[0] });
    } catch (err) { next(err); }
});

export default router;
