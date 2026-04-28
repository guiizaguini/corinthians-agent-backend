/**
 * Sistema de notificações genérico — separado de user_achievements pra
 * suportar outros tipos: welcome (boas-vindas), system_message, etc.
 *
 * Schema é defensivo (auto-bootstrap em schemaBootstrap.js).
 */

import { query } from '../db/pool.js';

/**
 * Cria uma notificação pra um usuário.
 * @param {number} userId
 * @param {string} type — 'welcome' | 'system_message' | …
 * @param {object|null} payload — dados específicos do tipo (jsonb)
 *
 * Idempotência: alguns tipos NÃO devem duplicar (ex: 'welcome' — só 1 por user).
 * Se quiser garantir unicidade, faz check antes de chamar.
 */
export async function createNotification(userId, type, payload = null) {
    try {
        await query(
            `INSERT INTO user_notifications (user_id, type, payload)
             VALUES ($1, $2, $3::jsonb)`,
            [userId, type, payload ? JSON.stringify(payload) : null]
        );
    } catch (e) {
        // Não derruba a request principal se notif falhar (ex: tabela ainda não existe)
        console.warn('[notifications] createNotification falhou:', e.message);
    }
}

/**
 * Versão idempotente — só insere se não existir nenhuma do mesmo tipo
 * pro user. Útil pra welcome (1 por user pra sempre).
 */
export async function createNotificationOnce(userId, type, payload = null) {
    try {
        await query(
            `INSERT INTO user_notifications (user_id, type, payload)
             SELECT $1, $2, $3::jsonb
             WHERE NOT EXISTS (
                 SELECT 1 FROM user_notifications WHERE user_id = $1 AND type = $2
             )`,
            [userId, type, payload ? JSON.stringify(payload) : null]
        );
    } catch (e) {
        console.warn('[notifications] createNotificationOnce falhou:', e.message);
    }
}

export async function listPendingNotifications(userId) {
    const { rows } = await query(
        `SELECT id, type, payload, created_at
         FROM user_notifications
         WHERE user_id = $1 AND seen_at IS NULL
         ORDER BY created_at ASC`,
        [userId]
    );
    return rows;
}

export async function markAllNotificationsSeen(userId) {
    const { rowCount } = await query(
        `UPDATE user_notifications SET seen_at = NOW()
         WHERE user_id = $1 AND seen_at IS NULL`,
        [userId]
    );
    return rowCount;
}
