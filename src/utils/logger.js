/**
 * Logger central para eventos de negocio.
 *
 * Saidas:
 *   1. stdout (Railway captura tudo automaticamente)
 *   2. tabela `user_actions` (DB) — fire-and-forget, usada pelo painel
 *      /admin/analytics pra contar eventos por periodo.
 *
 * Formato stdout: `[ISO_TIMESTAMP] [event] key=value key2=value2 ...`
 *
 * Uso:
 *   import { logEvent, logUser } from '../utils/logger.js';
 *   logEvent('signup', { user_id: 42, email: 'a@b.com' });
 *   logUser('attendance.create', req.user, { game_id: 99 });
 */

import { query } from '../db/pool.js';

function ts() {
    return new Date().toISOString();
}

function fmt(v) {
    if (v == null) return '';
    if (typeof v === 'string') {
        // Escapa espacos pra preservar parseabilidade do log
        return v.includes(' ') ? `"${v.replace(/"/g, '\\"')}"` : v;
    }
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
}

// Persiste no DB de forma assincrona, sem bloquear a resposta nem
// derrubar o processo se a tabela ainda nao existir.
function persistAction(event, userId, payload) {
    // Filtra eventos de erro/sistema — nao precisa persistir tudo
    if (!event || event.startsWith('ERROR ') || event.startsWith('system.')) return;
    query(
        `INSERT INTO user_actions (user_id, event, payload) VALUES ($1, $2, $3)`,
        [userId || null, event, payload && Object.keys(payload).length ? payload : null]
    ).catch(err => {
        // Schema ainda nao bootstrapped, db down, etc — degrada silently.
        // Nao loga nem alerta porque o stdout log ja registrou o evento.
        if (err && err.code !== '42P01') { // 42P01 = undefined_table
            console.warn(`[logger] persistAction failed: ${err.message}`);
        }
    });
}

export function logEvent(event, data = {}) {
    const parts = Object.entries(data)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${k}=${fmt(v)}`);
    console.log(`[${ts()}] [${event}] ${parts.join(' ')}`);
    // Extrai user_id do payload se houver, persiste tudo no DB
    const userId = data.user_id || null;
    const { user_id: _omit, ...rest } = data;
    persistAction(event, userId, rest);
}

/** Atalho pra eventos atrelados a um user logado (req.user). */
export function logUser(event, user, extra = {}) {
    logEvent(event, {
        user_id: user?.id,
        email: user?.email,
        username: user?.username,
        ...extra,
    });
}

/** Atalho pra logar erros estruturados sem perder o stack. */
export function logError(event, err, extra = {}) {
    const parts = Object.entries({ ...extra, message: err?.message })
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${k}=${fmt(v)}`);
    console.error(`[${ts()}] [ERROR ${event}] ${parts.join(' ')}`);
    if (err?.stack) console.error(err.stack);
}
