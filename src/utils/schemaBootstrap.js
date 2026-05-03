/**
 * Bootstrap defensivo de schema — garante colunas/tabelas que foram
 * adicionadas APÓS o deploy inicial mas antes da migration manual rodar.
 *
 * Roda 1x no startup do server (antes de aceitar requests). Tudo é
 * idempotente (CREATE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS) então
 * é seguro rodar em todos os boots.
 *
 * Quando a feature estabiliza, mover pro v2_schema.sql canônico.
 */

import { query } from '../db/pool.js';

let _bootstrapDone = false;

export async function bootstrapSchema() {
    if (_bootstrapDone) return;
    try {
        // ====== user_achievements (notificações de conquista) ======
        await query(`
            CREATE TABLE IF NOT EXISTS user_achievements (
                id              SERIAL PRIMARY KEY,
                user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                achievement_id  VARCHAR(60) NOT NULL,
                unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                seen_at         TIMESTAMPTZ,
                UNIQUE(user_id, achievement_id)
            );
        `);
        await query(`
            ALTER TABLE user_achievements
                ADD COLUMN IF NOT EXISTS from_bulk_sync BOOLEAN NOT NULL DEFAULT FALSE
        `);
        await query(`
            ALTER TABLE user_achievements
                ADD COLUMN IF NOT EXISTS toasted_at TIMESTAMPTZ
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_user_achievements_unseen
                ON user_achievements(user_id) WHERE seen_at IS NULL
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_user_achievements_feed
                ON user_achievements(unlocked_at DESC, user_id) WHERE from_bulk_sync = FALSE
        `);

        // ====== users.google_sub (login via Google) ======
        // Sem essa coluna o endpoint POST /auth/google quebra com 500
        // (INSERT/UPDATE referenciando coluna inexistente).
        await query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(64)
        `);
        await query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub
                ON users(google_sub) WHERE google_sub IS NOT NULL
        `);

        // ====== users.count_all_games (opt-in pra stats cross-club) ======
        // Default FALSE = só conta jogos do clube do user (comportamento legacy).
        // Quando TRUE, snapshot conta TODAS as attendances PRESENTE — incluindo
        // jogos de outros clubes (ex: Pal-torcedor que foi num Fla x Cor).
        await query(`
            ALTER TABLE users
                ADD COLUMN IF NOT EXISTS count_all_games BOOLEAN NOT NULL DEFAULT FALSE
        `);

        // ====== users.nationality_iso (codigo ISO alpha-2 do pais) ======
        // Usado pra mostrar a bandeirinha do user em rankings de bolao
        // (especialmente em boloes white-label estilo Botmaker, com pessoas
        // de varios paises). Exemplos: 'br', 'ar', 'mx', 'us'.
        await query(`
            ALTER TABLE users
                ADD COLUMN IF NOT EXISTS nationality_iso VARCHAR(4)
        `);

        // ====== user_actions (audit log das acoes pra analytics admin) ======
        // logger.js insere aqui em fire-and-forget. Usado pelo painel
        // /admin/analytics pra contar eventos por periodo.
        await query(`
            CREATE TABLE IF NOT EXISTS user_actions (
                id          BIGSERIAL PRIMARY KEY,
                user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
                event       VARCHAR(60) NOT NULL,
                payload     JSONB,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_user_actions_event_time
                ON user_actions(event, created_at DESC)
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_user_actions_time
                ON user_actions(created_at DESC)
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_user_actions_user
                ON user_actions(user_id, created_at DESC)
        `);

        // ====== user_notifications (sino — boas-vindas, sistema, etc) ======
        await query(`
            CREATE TABLE IF NOT EXISTS user_notifications (
                id          SERIAL PRIMARY KEY,
                user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type        VARCHAR(40) NOT NULL,
                payload     JSONB,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                seen_at     TIMESTAMPTZ
            );
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_user_notifications_unseen
                ON user_notifications(user_id) WHERE seen_at IS NULL
        `);

        // ====== ÁLBUM DA COPA 2026 (sazonal — pode dar drop quando acabar) ======
        // album_selecoes: catálogo das 48 seleções (FIFA WC 2026)
        await query(`
            CREATE TABLE IF NOT EXISTS album_selecoes (
                id           SERIAL PRIMARY KEY,
                code         VARCHAR(8) UNIQUE NOT NULL,    -- ex 'BRA', 'ARG'
                name         VARCHAR(60) NOT NULL,
                flag_iso     VARCHAR(8),                    -- iso pra flagcdn (br, ar, gb-eng)
                grupo        VARCHAR(2),                    -- A, B, C... (def. depois do sorteio)
                ordem        INTEGER NOT NULL DEFAULT 0
            );
        `);
        // album_cromos: catálogo dos cromos (escudo + jogadores) por seleção
        await query(`
            CREATE TABLE IF NOT EXISTS album_cromos (
                id          SERIAL PRIMARY KEY,
                code        VARCHAR(20) UNIQUE NOT NULL,    -- ex 'BRA-00' (escudo), 'BRA-01' (jogador #1)
                selecao_id  INTEGER NOT NULL REFERENCES album_selecoes(id) ON DELETE CASCADE,
                ordem       INTEGER NOT NULL DEFAULT 0,     -- 0 = escudo, 1..N = jogadores
                tipo        VARCHAR(20) NOT NULL DEFAULT 'jogador'
                            CHECK (tipo IN ('escudo','jogador','legenda','especial')),
                nome        VARCHAR(80) NOT NULL,           -- nome do jogador ou 'Escudo'
                posicao     VARCHAR(30),                    -- 'GOL', 'ZAG', 'MEI', 'ATA' (NULL pra escudo)
                raridade    VARCHAR(20) NOT NULL DEFAULT 'comum'
                            CHECK (raridade IN ('comum','rara','legend','especial')),
                photo_url   VARCHAR(400)                    -- URL/caminho da foto (NULL = placeholder)
            );
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_album_cromos_selecao
                ON album_cromos(selecao_id, ordem)
        `);
        // user_album_cromos: quantidade que CADA user tem de CADA cromo
        await query(`
            CREATE TABLE IF NOT EXISTS user_album_cromos (
                user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                cromo_id   INTEGER NOT NULL REFERENCES album_cromos(id) ON DELETE CASCADE,
                quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (user_id, cromo_id)
            );
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_user_album_user
                ON user_album_cromos(user_id) WHERE quantidade > 0
        `);

        _bootstrapDone = true;
        console.log('[schemaBootstrap] OK');
    } catch (e) {
        console.error('[schemaBootstrap] FAIL:', e.message);
        // NÃO seta _bootstrapDone — vai tentar de novo na próxima chamada
        throw e;
    }
}
