import express from 'express';
import { query } from '../db/pool.js';
import { computeAchievements, ACHIEVEMENT_CATEGORIES, RARITY_INFO } from '../utils/achievements.js';
import { cache } from '../utils/cache.js';
import { bootstrapSchema } from '../utils/schemaBootstrap.js';
import { listPendingNotifications, markAllNotificationsSeen } from '../utils/notifications.js';

// Atalho legado — startup ja roda bootstrapSchema, mas em dev/test
// pode ser que nao. Mantém como safety-net idempotente.
const ensureUserAchievementsTable = bootstrapSchema;

/**
 * Estatísticas por usuário autenticado.
 * Monta o "snapshot" completo que a dashboard consome, mas filtrado
 * pelas attendances do próprio user (status='PRESENTE').
 */
const router = express.Router();

// Compartilha os filtros "jogos que o user efetivamente foi"
// user_id é $1, club_id é $2 em todas as queries abaixo.
const WHERE_PRESENTE = `
    a.user_id = $1
    AND a.status = 'PRESENTE'
    AND g.club_id = $2
    AND g.resultado IS NOT NULL
`;

// =============================================================
// GET /me/snapshot — tudo que o dashboard precisa, numa chamada só
// =============================================================
router.get('/snapshot', async (req, res, next) => {
    try {
        const uid = req.user.id;
        const cid = req.user.club_id;

        const cacheKey = `snapshot:${uid}:${cid || 'noclub'}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        const [
            geral,
            por_ano,
            por_campeonato,
            por_rival,
            por_estadio,
            por_setor,
            gastos_total,
            gastos_por_ano,
            top_goleadas,
            classicos,
            all_games,
            club_info,
        ] = await Promise.all([
            query(`
                SELECT
                    COUNT(*)::int AS jogos,
                    SUM(CASE WHEN g.resultado='V' THEN 1 ELSE 0 END)::int AS vitorias,
                    SUM(CASE WHEN g.resultado='E' THEN 1 ELSE 0 END)::int AS empates,
                    SUM(CASE WHEN g.resultado='D' THEN 1 ELSE 0 END)::int AS derrotas,
                    COALESCE(SUM(CASE WHEN g.time_casa = c.name THEN g.gols_casa ELSE g.gols_visitante END), 0)::int AS gols_pro,
                    COALESCE(SUM(CASE WHEN g.time_casa = c.name THEN g.gols_visitante ELSE g.gols_casa END), 0)::int AS gols_contra,
                    ROUND(
                        (SUM(CASE WHEN g.resultado='V' THEN 3 ELSE 0 END)
                         + SUM(CASE WHEN g.resultado='E' THEN 1 ELSE 0 END))::numeric
                        / NULLIF(COUNT(*)*3, 0) * 100,
                        2
                    ) AS aproveitamento_pct,
                    COUNT(*) FILTER (WHERE g.foi_classico = TRUE)::int AS classicos,
                    COUNT(*) FILTER (WHERE g.teve_penal = TRUE)::int AS jogos_com_penal
                FROM attendances a
                JOIN games g ON g.id = a.game_id
                JOIN clubs c ON c.id = g.club_id
                WHERE ${WHERE_PRESENTE}
            `, [uid, cid]),

            query(`
                SELECT
                    EXTRACT(YEAR FROM g.data)::int AS ano,
                    COUNT(*)::int AS jogos,
                    SUM(CASE WHEN g.resultado='V' THEN 1 ELSE 0 END)::int AS vitorias,
                    SUM(CASE WHEN g.resultado='E' THEN 1 ELSE 0 END)::int AS empates,
                    SUM(CASE WHEN g.resultado='D' THEN 1 ELSE 0 END)::int AS derrotas,
                    COALESCE(SUM(CASE WHEN g.time_casa = c.name THEN g.gols_casa ELSE g.gols_visitante END), 0)::int AS gols_pro,
                    COALESCE(SUM(CASE WHEN g.time_casa = c.name THEN g.gols_visitante ELSE g.gols_casa END), 0)::int AS gols_contra,
                    ROUND(
                        (SUM(CASE WHEN g.resultado='V' THEN 3 ELSE 0 END)
                         + SUM(CASE WHEN g.resultado='E' THEN 1 ELSE 0 END))::numeric
                        / NULLIF(COUNT(*)*3, 0) * 100,
                        2
                    ) AS aproveitamento_pct
                FROM attendances a
                JOIN games g ON g.id = a.game_id
                JOIN clubs c ON c.id = g.club_id
                WHERE ${WHERE_PRESENTE}
                GROUP BY ano
                ORDER BY ano
            `, [uid, cid]),

            query(`
                SELECT
                    g.campeonato,
                    COUNT(*)::int AS jogos,
                    SUM(CASE WHEN g.resultado='V' THEN 1 ELSE 0 END)::int AS vitorias,
                    SUM(CASE WHEN g.resultado='E' THEN 1 ELSE 0 END)::int AS empates,
                    SUM(CASE WHEN g.resultado='D' THEN 1 ELSE 0 END)::int AS derrotas,
                    COALESCE(SUM(CASE WHEN g.time_casa = c.name THEN g.gols_casa ELSE g.gols_visitante END), 0)::int AS gols_pro,
                    COALESCE(SUM(CASE WHEN g.time_casa = c.name THEN g.gols_visitante ELSE g.gols_casa END), 0)::int AS gols_contra,
                    ROUND(
                        (SUM(CASE WHEN g.resultado='V' THEN 3 ELSE 0 END)
                         + SUM(CASE WHEN g.resultado='E' THEN 1 ELSE 0 END))::numeric
                        / NULLIF(COUNT(*)*3, 0) * 100,
                        2
                    ) AS aproveitamento_pct
                FROM attendances a
                JOIN games g ON g.id = a.game_id
                JOIN clubs c ON c.id = g.club_id
                WHERE ${WHERE_PRESENTE}
                GROUP BY g.campeonato
                ORDER BY jogos DESC
            `, [uid, cid]),

            query(`
                SELECT
                    CASE WHEN g.time_casa = c.name THEN g.time_visitante ELSE g.time_casa END AS adversario,
                    COUNT(*)::int AS jogos,
                    SUM(CASE WHEN g.resultado='V' THEN 1 ELSE 0 END)::int AS vitorias,
                    SUM(CASE WHEN g.resultado='E' THEN 1 ELSE 0 END)::int AS empates,
                    SUM(CASE WHEN g.resultado='D' THEN 1 ELSE 0 END)::int AS derrotas,
                    COALESCE(SUM(CASE WHEN g.time_casa = c.name THEN g.gols_casa ELSE g.gols_visitante END), 0)::int AS gols_pro,
                    COALESCE(SUM(CASE WHEN g.time_casa = c.name THEN g.gols_visitante ELSE g.gols_casa END), 0)::int AS gols_contra
                FROM attendances a
                JOIN games g ON g.id = a.game_id
                JOIN clubs c ON c.id = g.club_id
                WHERE ${WHERE_PRESENTE}
                GROUP BY adversario
                ORDER BY jogos DESC, adversario
            `, [uid, cid]),

            query(`
                SELECT
                    g.estadio,
                    COUNT(*)::int AS jogos,
                    SUM(CASE WHEN g.resultado='V' THEN 1 ELSE 0 END)::int AS vitorias,
                    SUM(CASE WHEN g.resultado='E' THEN 1 ELSE 0 END)::int AS empates,
                    SUM(CASE WHEN g.resultado='D' THEN 1 ELSE 0 END)::int AS derrotas
                FROM attendances a
                JOIN games g ON g.id = a.game_id
                WHERE a.user_id = $1 AND a.status = 'PRESENTE'
                  AND g.club_id = $2 AND g.resultado IS NOT NULL
                GROUP BY g.estadio
                ORDER BY jogos DESC
            `, [uid, cid]),

            query(`
                SELECT
                    a.setor,
                    COUNT(*)::int AS jogos,
                    SUM(CASE WHEN g.resultado='V' THEN 1 ELSE 0 END)::int AS vitorias,
                    SUM(CASE WHEN g.resultado='E' THEN 1 ELSE 0 END)::int AS empates,
                    SUM(CASE WHEN g.resultado='D' THEN 1 ELSE 0 END)::int AS derrotas,
                    ROUND(AVG(a.valor_pago) FILTER (WHERE a.valor_pago > 0), 2) AS ticket_medio
                FROM attendances a
                JOIN games g ON g.id = a.game_id
                WHERE a.user_id = $1 AND a.status = 'PRESENTE' AND g.club_id = $2
                  AND a.setor IS NOT NULL AND a.setor <> ''
                GROUP BY a.setor
                ORDER BY jogos DESC
            `, [uid, cid]),

            query(`
                SELECT
                    COUNT(*) FILTER (WHERE a.valor_pago IS NOT NULL AND a.valor_pago > 0)::int AS ingressos_pagos,
                    COALESCE(SUM(a.valor_pago), 0)::numeric AS gasto_total,
                    ROUND(AVG(a.valor_pago) FILTER (WHERE a.valor_pago > 0), 2) AS ticket_medio,
                    MIN(a.valor_pago) FILTER (WHERE a.valor_pago > 0) AS mais_barato,
                    MAX(a.valor_pago) AS mais_caro
                FROM attendances a
                JOIN games g ON g.id = a.game_id
                JOIN clubs c ON c.id = g.club_id
                WHERE a.user_id = $1 AND g.club_id = $2 AND c.is_tournament = FALSE
            `, [uid, cid]),

            query(`
                SELECT
                    EXTRACT(YEAR FROM g.data)::int AS ano,
                    COUNT(*) FILTER (WHERE a.valor_pago IS NOT NULL)::int AS ingressos_pagos,
                    COALESCE(SUM(a.valor_pago), 0)::numeric AS gasto_total,
                    ROUND(AVG(a.valor_pago) FILTER (WHERE a.valor_pago > 0), 2) AS ticket_medio,
                    MIN(a.valor_pago) FILTER (WHERE a.valor_pago > 0) AS ingresso_mais_barato,
                    MAX(a.valor_pago) AS ingresso_mais_caro
                FROM attendances a
                JOIN games g ON g.id = a.game_id
                WHERE a.user_id = $1 AND g.club_id = $2
                  AND a.valor_pago IS NOT NULL AND a.valor_pago > 0
                GROUP BY ano
                ORDER BY ano
            `, [uid, cid]),

            query(`
                SELECT
                    g.id, g.data, g.time_casa, g.time_visitante,
                    g.gols_casa, g.gols_visitante, g.campeonato, g.estadio,
                    g.resultado, g.foi_classico,
                    CASE WHEN g.time_casa = c.name THEN g.time_visitante ELSE g.time_casa END AS adversario,
                    ABS(g.gols_casa - g.gols_visitante) AS saldo_abs
                FROM attendances a
                JOIN games g ON g.id = a.game_id
                JOIN clubs c ON c.id = g.club_id
                WHERE a.user_id = $1 AND a.status = 'PRESENTE' AND g.club_id = $2
                  AND g.resultado = 'V' AND g.gols_casa IS NOT NULL
                ORDER BY ABS(g.gols_casa - g.gols_visitante) DESC, g.data DESC
                LIMIT 10
            `, [uid, cid]),

            query(`
                SELECT
                    g.id, g.data, g.time_casa, g.time_visitante,
                    g.gols_casa, g.gols_visitante, g.campeonato, g.estadio, g.resultado,
                    CASE WHEN g.time_casa = c.name THEN g.time_visitante ELSE g.time_casa END AS adversario
                FROM attendances a
                JOIN games g ON g.id = a.game_id
                JOIN clubs c ON c.id = g.club_id
                WHERE a.user_id = $1 AND a.status = 'PRESENTE' AND g.club_id = $2
                  AND g.foi_classico = TRUE
                ORDER BY g.data DESC
            `, [uid, cid]),

            query(`
                SELECT
                    g.id, g.data, g.dia_semana, g.time_casa, g.time_visitante,
                    g.campeonato, g.genero, g.estadio,
                    g.gols_casa, g.gols_visitante, g.resultado,
                    g.foi_classico, g.teve_penal, g.mando, g.fase,
                    g.titulo_conquistado, g.autores_gols, g.gols_texto, g.publico_total,
                    a.status AS status_presenca,
                    a.setor, a.assento, a.valor_pago, a.observacoes,
                    CASE WHEN g.time_casa = c.name THEN g.time_visitante
                         WHEN g.time_visitante = c.name THEN g.time_casa
                         ELSE g.time_casa || ' x ' || g.time_visitante END AS adversario
                FROM attendances a
                JOIN games g ON g.id = a.game_id
                JOIN clubs c ON c.id = g.club_id
                WHERE a.user_id = $1 AND g.club_id = $2
                ORDER BY g.data DESC
            `, [uid, cid]),

            query(
                `SELECT id, slug, name, short_name, primary_color, secondary_color
                 FROM clubs WHERE id = $1`,
                [cid]
            ),
        ]);

        const g = geral.rows[0] ?? {};
        g.saldo_gols = (parseInt(g.gols_pro) || 0) - (parseInt(g.gols_contra) || 0);

        const payload = {
            club: club_info.rows[0] ?? null,
            user: {
                id: req.user.id,
                email: req.user.email,
                display_name: req.user.display_name,
            },
            geral: g,
            por_ano: por_ano.rows,
            por_campeonato: por_campeonato.rows,
            por_rival: por_rival.rows,
            por_estadio: por_estadio.rows,
            por_setor: por_setor.rows,
            gastos: {
                total: gastos_total.rows[0],
                por_ano: gastos_por_ano.rows,
            },
            top_goleadas: top_goleadas.rows,
            classicos: classicos.rows,
            jogos: all_games.rows,
            ts: new Date().toISOString(),
        };
        cache.set(cacheKey, payload, 5 * 60 * 1000); // 5 minutos
        res.json(payload);
    } catch (err) { next(err); }
});

// Helper: monta o objeto `stats` que o catálogo de conquistas consome.
// Extraído pra ser reusado pelos endpoints /achievements e /achievements/pending.
async function fetchUserStats(uid, cid) {
    const [agg, notas, amigos, companions] = await Promise.all([
        query(`
            SELECT
                COUNT(*)::int AS jogos,
                SUM(CASE WHEN g.resultado='V' THEN 1 ELSE 0 END)::int AS vitorias,
                SUM(CASE WHEN g.resultado='E' THEN 1 ELSE 0 END)::int AS empates,
                SUM(CASE WHEN g.resultado='D' THEN 1 ELSE 0 END)::int AS derrotas,
                COUNT(*) FILTER (WHERE g.foi_classico = TRUE)::int AS classicos,
                COUNT(*) FILTER (WHERE g.titulo_conquistado IS NOT NULL AND g.titulo_conquistado <> '')::int AS titulos,
                ROUND(
                    (SUM(CASE WHEN g.resultado='V' THEN 3 ELSE 0 END)
                     + SUM(CASE WHEN g.resultado='E' THEN 1 ELSE 0 END))::numeric
                    / NULLIF(COUNT(*)*3, 0) * 100,
                    0
                )::int AS aproveitamento_pct
            FROM attendances a
            JOIN games g ON g.id = a.game_id
            WHERE a.user_id = $1
              AND a.status = 'PRESENTE'
              AND g.club_id = $2
              AND g.resultado IS NOT NULL
        `, [uid, cid]),
        query('SELECT COUNT(*)::int AS n FROM notes WHERE user_id = $1', [uid]),
        query(
            `SELECT COUNT(*)::int AS n FROM friendships
             WHERE status = 'ACCEPTED' AND (requester_id = $1 OR recipient_id = $1)`,
            [uid]
        ),
        query(
            `SELECT COUNT(DISTINCT a.id)::int AS n
             FROM attendances a
             JOIN attendance_companions ac ON ac.attendance_id = a.id
             WHERE a.user_id = $1`,
            [uid]
        ),
    ]);
    return {
        jogos:                  agg.rows[0]?.jogos || 0,
        vitorias:               agg.rows[0]?.vitorias || 0,
        empates:                agg.rows[0]?.empates || 0,
        derrotas:               agg.rows[0]?.derrotas || 0,
        classicos:              agg.rows[0]?.classicos || 0,
        titulos:                agg.rows[0]?.titulos || 0,
        aproveitamento_pct:     agg.rows[0]?.aproveitamento_pct || 0,
        notas:                  notas.rows[0]?.n || 0,
        amigos:                 amigos.rows[0]?.n || 0,
        jogos_com_companions:   companions.rows[0]?.n || 0,
    };
}

// Helper: insere conquistas recém desbloqueadas em user_achievements (idempotente).
// Retorna lista de IDs que foram inseridos AGORA E não são bulk-sync da 1a vez.
//
// IMPORTANTE: na 1a sincronização do user (sem rows na tabela), TODAS as
// conquistas atuais são marcadas como `from_bulk_sync = TRUE` + seen — assim
// elas NÃO floodam toast/sino/feed. So unlocks reais vindos depois disparam.
async function syncUnlockedAchievements(uid, achievements) {
    const unlockedIds = achievements.filter(a => a.unlocked).map(a => a.id);
    if (!unlockedIds.length) return [];

    // Detecta primeira sync (user nunca teve nenhuma row na tabela)
    const { rows: existsRows } = await query(
        'SELECT 1 FROM user_achievements WHERE user_id = $1 LIMIT 1',
        [uid]
    );
    const isFirstSync = existsRows.length === 0;

    // Bulk-sync: marca tudo como já visto + flag pra excluir do feed
    // Real unlock: seen_at = NULL + flag FALSE → vai pro toast/sino/feed
    const { rows } = await query(`
        INSERT INTO user_achievements (user_id, achievement_id, from_bulk_sync, seen_at)
        SELECT $1, unnest($2::text[]), $3,
               CASE WHEN $3 THEN NOW() ELSE NULL END
        ON CONFLICT (user_id, achievement_id) DO NOTHING
        RETURNING achievement_id, from_bulk_sync
    `, [uid, unlockedIds, isFirstSync]);

    // Retorna apenas as não-bulk (essas geram toast e aparecem no feed)
    return rows.filter(r => !r.from_bulk_sync).map(r => r.achievement_id);
}

// =============================================================
// GET /me/achievements — calcula o estado de cada conquista pro user
// =============================================================
router.get('/achievements', async (req, res, next) => {
    try {
        const uid = req.user.id;
        const cid = req.user.club_id;

        if (!cid) {
            return res.json({
                achievements: [],
                categories: ACHIEVEMENT_CATEGORIES,
                rarities: RARITY_INFO,
                stats: { jogos: 0, vitorias: 0 },
            });
        }

        const cacheKey = `achievements:${uid}:${cid}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        const stats = await fetchUserStats(uid, cid);
        const achievements = computeAchievements(stats);

        // Sincroniza unlocks no DB (silently — esse endpoint não é a porta de
        // entrada das notificações, só garante consistência se /pending nunca
        // for chamado por algum motivo)
        syncUnlockedAchievements(uid, achievements).catch(() => {});

        const payload = { achievements, categories: ACHIEVEMENT_CATEGORIES, rarities: RARITY_INFO, stats };
        cache.set(cacheKey, payload, 10 * 60 * 1000);
        res.json(payload);
    } catch (err) { next(err); }
});

// =============================================================
// GET /me/achievements/pending — conquistas desbloqueadas que o user
// ainda NÃO viu (toast + sino). Faz a sync primeiro pra capturar
// unlocks recém criados por mutations em outras rotas.
// =============================================================
router.get('/achievements/pending', async (req, res, next) => {
    try {
        await ensureUserAchievementsTable();
        const uid = req.user.id;
        const cid = req.user.club_id;
        if (!cid) return res.json({ pending: [] });

        // Recomputa do zero (não usa cache pra captar unlocks novos)
        const stats = await fetchUserStats(uid, cid);
        const achievements = computeAchievements(stats);
        const newIds = await syncUnlockedAchievements(uid, achievements);

        // Se houve novos unlocks, invalida o cache de /achievements pra perfil
        // não mostrar estado antigo na próxima abertura
        if (newIds.length) cache.invalidate(`achievements:${uid}:${cid}`);

        // Lista todas as desbloqueadas ainda não vistas (não só as recém criadas)
        // - seen_at IS NULL → ainda no sino (badge persiste)
        // - from_bulk_sync = FALSE → não é bulk inicial (esses não notificam)
        // - needs_toast = (toasted_at IS NULL) → toast ainda não foi exibido
        //   (front filtra por isso pra não re-toastar em refresh)
        const { rows } = await query(`
            SELECT achievement_id, unlocked_at, (toasted_at IS NULL) AS needs_toast
            FROM user_achievements
            WHERE user_id = $1
              AND seen_at IS NULL
              AND from_bulk_sync = FALSE
            ORDER BY unlocked_at ASC
        `, [uid]);

        const byId = Object.fromEntries(achievements.map(a => [a.id, a]));
        const pending = rows
            .map(r => byId[r.achievement_id] && {
                ...byId[r.achievement_id],
                unlocked_at: r.unlocked_at,
                needs_toast: r.needs_toast,
            })
            .filter(Boolean);

        res.json({ pending });
    } catch (err) { next(err); }
});

// =============================================================
// POST /me/achievements/seen — marca todas as pendentes como vistas
// (chamado pelo front após exibir os toasts)
// =============================================================
router.post('/achievements/seen', async (req, res, next) => {
    try {
        await ensureUserAchievementsTable();
        const { rowCount } = await query(`
            UPDATE user_achievements
            SET seen_at = NOW()
            WHERE user_id = $1 AND seen_at IS NULL
        `, [req.user.id]);
        res.json({ marked_seen: rowCount });
    } catch (err) { next(err); }
});

// =============================================================
// POST /me/achievements/toasted — marca desbloqueios já exibidos via toast
// (chamado pelo front IMEDIATAMENTE após mostrar os toasts)
// Garante que refresh/reabertura não re-mostre o mesmo toast.
// O sino ainda mantém badge até /seen ser chamado.
// =============================================================
router.post('/achievements/toasted', async (req, res, next) => {
    try {
        await ensureUserAchievementsTable();
        const { rowCount } = await query(`
            UPDATE user_achievements
            SET toasted_at = NOW()
            WHERE user_id = $1
              AND toasted_at IS NULL
              AND seen_at IS NULL
              AND from_bulk_sync = FALSE
        `, [req.user.id]);
        res.json({ marked_toasted: rowCount });
    } catch (err) { next(err); }
});

// =============================================================
// GET /me/notifications/pending — notificações genéricas pro sino
// (boas-vindas, system messages, etc — separado de conquistas)
// =============================================================
router.get('/notifications/pending', async (req, res, next) => {
    try {
        await ensureUserAchievementsTable(); // bootstrap também cria user_notifications
        const pending = await listPendingNotifications(req.user.id);
        res.json({ pending });
    } catch (err) { next(err); }
});

// =============================================================
// POST /me/notifications/seen — marca todas como vistas
// =============================================================
router.post('/notifications/seen', async (req, res, next) => {
    try {
        await ensureUserAchievementsTable();
        const marked = await markAllNotificationsSeen(req.user.id);
        res.json({ marked_seen: marked });
    } catch (err) { next(err); }
});

export default router;
