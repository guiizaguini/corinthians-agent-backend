/**
 * Logger central para eventos de negocio. Saida vai pro stdout (Railway
 * captura tudo automaticamente).
 *
 * Formato: `[ISO_TIMESTAMP] [event] key=value key2=value2 ...`
 *
 * Uso:
 *   import { logEvent, logUser } from '../utils/logger.js';
 *   logEvent('signup', { user_id: 42, email: 'a@b.com' });
 *   logUser('attendance.create', req.user, { game_id: 99 });
 */

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

export function logEvent(event, data = {}) {
    const parts = Object.entries(data)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${k}=${fmt(v)}`);
    console.log(`[${ts()}] [${event}] ${parts.join(' ')}`);
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
