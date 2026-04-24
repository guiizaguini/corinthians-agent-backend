/**
 * Cria um bolão default pra Copa 2026 (usado pra primeiros testes).
 * Admin (você) vira dono + membro automaticamente.
 *
 * Uso:
 *   railway run node scripts/seed_bolao_default.mjs
 *
 * Env:
 *   SEED_USER_EMAIL       (default guilhermezaguini@gmail.com)
 *   BOLAO_NAME            (default "Bolão Oficial · Copa 2026")
 *   BOLAO_DESCRIPTION     opcional
 */
import 'dotenv/config';
import dns from 'node:dns/promises';
import crypto from 'node:crypto';

async function maybeSwapToPublicUrl() {
    const url = process.env.DATABASE_URL;
    const publicUrl = process.env.DATABASE_PUBLIC_URL;
    if (!url || !publicUrl) return;
    try {
        await dns.lookup(new URL(url).hostname);
    } catch {
        console.log('[seed_bolao] DATABASE_URL interna não resolveu, usando DATABASE_PUBLIC_URL');
        process.env.DATABASE_URL = publicUrl;
    }
}

await maybeSwapToPublicUrl();

const { pool } = await import('../src/db/pool.js');

const EMAIL = (process.env.SEED_USER_EMAIL || 'guilhermezaguini@gmail.com').toLowerCase();
const NAME = process.env.BOLAO_NAME || 'Bolão Oficial · Copa 2026';
const DESC = process.env.BOLAO_DESCRIPTION || 'O bolão principal da galera. Palpite todos os jogos da Copa do Mundo 2026 e veja quem acerta mais.';

function gerarCodigo() {
    return crypto.randomBytes(5).toString('hex').toUpperCase();
}

(async () => {
    try {
        const { rows: uRows } = await pool.query(
            'SELECT id FROM users WHERE LOWER(email) = $1',
            [EMAIL]
        );
        if (!uRows.length) {
            throw new Error(`Usuário ${EMAIL} não encontrado. Rode migrate_v2 primeiro.`);
        }
        const userId = uRows[0].id;

        const { rows: cRows } = await pool.query(
            "SELECT id FROM clubs WHERE slug = 'copa-do-mundo-2026'"
        );
        if (!cRows.length) {
            throw new Error('Torneio copa-do-mundo-2026 não encontrado. Rode seed_copa_xlsx.mjs primeiro.');
        }
        const tournamentClubId = cRows[0].id;

        // Já existe um bolão criado por esse user pra essa Copa?
        const { rows: ex } = await pool.query(
            `SELECT id, invite_code, name
             FROM boloes
             WHERE created_by = $1 AND tournament_club_id = $2
             ORDER BY id ASC LIMIT 1`,
            [userId, tournamentClubId]
        );
        if (ex.length) {
            console.log('[seed_bolao] Já existe bolão default:');
            console.log(`  id:          ${ex[0].id}`);
            console.log(`  name:        ${ex[0].name}`);
            console.log(`  invite_code: ${ex[0].invite_code}`);
            console.log(`\n  Compartilhe esse código com os amigos pra entrarem.`);
            return;
        }

        let code;
        let rows;
        for (let i = 0; i < 5; i++) {
            code = gerarCodigo();
            const r = await pool.query(
                `INSERT INTO boloes (tournament_club_id, name, description, invite_code, created_by)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (invite_code) DO NOTHING
                 RETURNING id, name, invite_code`,
                [tournamentClubId, NAME, DESC, code, userId]
            );
            if (r.rows.length) { rows = r.rows; break; }
        }
        if (!rows) throw new Error('Falhou gerar invite_code único');

        await pool.query(
            `INSERT INTO bolao_members (bolao_id, user_id)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [rows[0].id, userId]
        );

        console.log('[seed_bolao] Bolão criado com sucesso!');
        console.log(`  id:          ${rows[0].id}`);
        console.log(`  name:        ${rows[0].name}`);
        console.log(`  invite_code: ${rows[0].invite_code}`);
        console.log(`\n  Compartilhe esse código com os amigos pra entrarem.`);
    } catch (err) {
        console.error('[seed_bolao] ERRO:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
})();
