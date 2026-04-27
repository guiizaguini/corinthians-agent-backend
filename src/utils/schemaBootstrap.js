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

        _bootstrapDone = true;
        console.log('[schemaBootstrap] OK');
    } catch (e) {
        console.error('[schemaBootstrap] FAIL:', e.message);
        // NÃO seta _bootstrapDone — vai tentar de novo na próxima chamada
        throw e;
    }
}
