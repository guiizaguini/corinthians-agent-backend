/**
 * Migração v2: schema SaaS multi-tenant.
 *
 * Uso:
 *   npm run migrate:v2                  -> aplica só o schema v2
 *   npm run migrate:v2:from-legacy      -> schema v2 + copia dados da tabela `jogos` legada
 *                                          pra `games` + cria user seed + `attendances`
 *
 * User seed (quando roda `from-legacy`):
 *   email:  SEED_USER_EMAIL   (default guilhermezaguini@gmail.com)
 *   senha:  SEED_USER_PASSWORD (obrigatória; se faltar, aborta)
 *   nome:   SEED_USER_NAME    (default "Guilherme Zaguini")
 *
 * É idempotente: rodar de novo não duplica games nem attendances
 * (usa ON CONFLICT nos UNIQUE keys).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { pool } from '../src/db/pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.resolve(__dirname, '..', 'sql');

const withLegacy = process.argv.includes('from-legacy');

async function applySchema() {
    const sql = fs.readFileSync(path.join(sqlDir, 'v2_schema.sql'), 'utf-8');
    console.log('[migrate:v2] aplicando v2_schema.sql...');
    await pool.query(sql);
    console.log('[migrate:v2] schema OK');
}

async function seedUser() {
    const email = process.env.SEED_USER_EMAIL || 'guilhermezaguini@gmail.com';
    const password = process.env.SEED_USER_PASSWORD;
    const name = process.env.SEED_USER_NAME || 'Guilherme Zaguini';

    if (!password) {
        throw new Error(
            'SEED_USER_PASSWORD não definida. Exporte antes de rodar ' +
            '`npm run migrate:v2:from-legacy` pra criar o usuário seed.'
        );
    }

    const { rows: clubRows } = await pool.query(
        "SELECT id FROM clubs WHERE slug = 'corinthians'"
    );
    const clubId = clubRows[0].id;

    const hash = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
        `INSERT INTO users (email, password_hash, display_name, club_id, is_admin)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (email) DO UPDATE SET
             display_name = EXCLUDED.display_name,
             club_id = EXCLUDED.club_id
         RETURNING id, email, display_name`,
        [email.toLowerCase(), hash, name, clubId]
    );
    console.log(`[migrate:v2] user seed OK: ${rows[0].email} (id=${rows[0].id})`);
    return { userId: rows[0].id, clubId };
}

async function copyLegacyGames(clubId) {
    console.log('[migrate:v2] copiando jogos legados pra games...');
    const r = await pool.query(
        `INSERT INTO games (
            club_id, data, dia_semana, time_casa, time_visitante, mando,
            campeonato, genero, estadio, gols_casa, gols_visitante, resultado,
            foi_classico, teve_penal, fase, titulo_conquistado,
            autores_gols, gols_texto, publico_total
         )
         SELECT
            $1, j.data, j.dia_semana, j.time_casa, j.time_visitante, j.mando,
            j.campeonato, COALESCE(j.genero, 'M'), j.estadio,
            j.gols_casa, j.gols_visitante, j.resultado,
            j.foi_classico, j.teve_penal, j.fase, j.titulo_conquistado,
            j.autores_gols,
            CASE WHEN to_regclass('public.jogos') IS NOT NULL
                 THEN (SELECT gols_texto FROM jogos WHERE id = j.id)
                 ELSE NULL END,
            j.publico_total
         FROM jogos j
         WHERE j.is_corinthians = TRUE
         ON CONFLICT (club_id, data, time_casa, time_visitante, genero) DO NOTHING`,
        [clubId]
    );
    console.log(`[migrate:v2] games inseridos: ${r.rowCount}`);
}

async function copyLegacyAttendances(userId, clubId) {
    console.log('[migrate:v2] copiando presenças legadas pra attendances...');
    const r = await pool.query(
        `INSERT INTO attendances (
            user_id, game_id, status, setor, assento, valor_pago, observacoes
         )
         SELECT
            $1,
            g.id,
            j.status_presenca,
            j.setor,
            j.assento,
            j.valor_pago,
            j.observacoes
         FROM jogos j
         JOIN games g
           ON g.club_id = $2
          AND g.data = j.data
          AND g.time_casa = j.time_casa
          AND g.time_visitante = j.time_visitante
          AND g.genero = COALESCE(j.genero, 'M')
         WHERE j.is_corinthians = TRUE
         ON CONFLICT (user_id, game_id) DO UPDATE SET
            status = EXCLUDED.status,
            setor = EXCLUDED.setor,
            assento = EXCLUDED.assento,
            valor_pago = EXCLUDED.valor_pago,
            observacoes = EXCLUDED.observacoes`,
        [userId, clubId]
    );
    console.log(`[migrate:v2] attendances upsertadas: ${r.rowCount}`);
}

async function report() {
    const [{ rows: c }, { rows: u }, { rows: g }, { rows: a }] = await Promise.all([
        pool.query('SELECT COUNT(*)::int AS n FROM clubs'),
        pool.query('SELECT COUNT(*)::int AS n FROM users'),
        pool.query('SELECT COUNT(*)::int AS n FROM games'),
        pool.query('SELECT COUNT(*)::int AS n FROM attendances'),
    ]);
    console.log('[migrate:v2] totais:');
    console.log(`  clubs:        ${c[0].n}`);
    console.log(`  users:        ${u[0].n}`);
    console.log(`  games:        ${g[0].n}`);
    console.log(`  attendances:  ${a[0].n}`);
}

(async () => {
    try {
        await applySchema();
        if (withLegacy) {
            const { userId, clubId } = await seedUser();
            await copyLegacyGames(clubId);
            await copyLegacyAttendances(userId, clubId);
        }
        await report();
    } catch (err) {
        console.error('[migrate:v2] ERRO:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
})();
