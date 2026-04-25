/**
 * Cache em memória simples com TTL.
 * Suficiente pra single-instance no Railway. Quando escalar pra múltiplas,
 * trocar por Redis (mesma interface).
 *
 * Uso:
 *   import { cache } from '../utils/cache.js';
 *   const cached = cache.get('snapshot:42');
 *   if (cached) return cached;
 *   const fresh = await computar();
 *   cache.set('snapshot:42', fresh, 5 * 60 * 1000);
 *   return fresh;
 */

class TTLCache {
    constructor() {
        this.store = new Map();
        // Cleanup periódico de entradas expiradas (evita vazamento de memória)
        this._cleanupInterval = setInterval(() => this._cleanup(), 60_000);
        if (this._cleanupInterval.unref) this._cleanupInterval.unref();
    }

    get(key) {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.exp) {
            this.store.delete(key);
            return null;
        }
        return entry.val;
    }

    set(key, val, ttlMs) {
        this.store.set(key, { val, exp: Date.now() + ttlMs });
    }

    invalidate(key) {
        this.store.delete(key);
    }

    /** Invalida todas as chaves que começam com `prefix` */
    invalidatePrefix(prefix) {
        for (const k of this.store.keys()) {
            if (k.startsWith(prefix)) this.store.delete(k);
        }
    }

    _cleanup() {
        const now = Date.now();
        for (const [k, v] of this.store) {
            if (now > v.exp) this.store.delete(k);
        }
    }

    size() { return this.store.size; }
    clear() { this.store.clear(); }
}

export const cache = new TTLCache();

/** Helpers de invalidação centralizados — chame quando dado mudar */
export const invalidate = {
    user(userId) {
        // Snapshot e achievements ficam stale quando user mexe em qualquer presença/nota
        cache.invalidatePrefix(`snapshot:${userId}`);
        cache.invalidatePrefix(`achievements:${userId}`);
        // O catálogo de games também — porque inclui o estado de attendance do user
        cache.invalidatePrefix(`games:${userId}`);
    },
    bolao(bolaoId) {
        cache.invalidate(`ranking:${bolaoId}`);
    },
    bolaoMembers(bolaoId) {
        cache.invalidate(`ranking:${bolaoId}`);
        cache.invalidate(`bolao:${bolaoId}:members`);
    },
};
