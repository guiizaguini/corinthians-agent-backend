/**
 * Autenticação simples por API key em header.
 * O MCP Agent da Botmaker mandará essa key a cada request.
 */
export function requireApiKey(req, res, next) {
    const key = req.get('x-api-key');
    const expected = process.env.API_KEY;

    if (!expected) {
        console.error('[auth] API_KEY não configurada no ambiente');
        return res.status(500).json({ error: 'server_misconfigured' });
    }

    if (!key || key !== expected) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    next();
}
