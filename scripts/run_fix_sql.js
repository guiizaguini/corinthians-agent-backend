#!/usr/bin/env node
// Roda um arquivo SQL inteiro contra o DATABASE_URL do .env
// Uso: node scripts/run_fix_sql.js sql/fix_gols_ogol.sql
//
// Por que existe: o console web do Railway só aceita 1 statement por query,
// então não dá pra colar o arquivo inteiro com BEGIN/COMMIT + 40 UPDATEs.

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns/promises';

// Fallback pra DATABASE_PUBLIC_URL quando rodando via `railway run` local
if (process.env.DATABASE_URL && process.env.DATABASE_PUBLIC_URL) {
    try { await dns.lookup(new URL(process.env.DATABASE_URL).hostname); }
    catch {
        console.log('[run_fix_sql] DATABASE_URL interna não resolveu, usando DATABASE_PUBLIC_URL');
        process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
    }
}

const { pool } = await import('../src/db/pool.js');

const arquivoSql = process.argv[2];
if (!arquivoSql) {
    console.error('Uso: node scripts/run_fix_sql.js <caminho-do-sql>');
    process.exit(1);
}

const fullPath = path.resolve(arquivoSql);
if (!fs.existsSync(fullPath)) {
    console.error('Arquivo não encontrado:', fullPath);
    process.exit(1);
}

const sql = fs.readFileSync(fullPath, 'utf8');
console.log(`[run_fix_sql] Lendo ${fullPath} (${sql.length} chars)`);
console.log(`[run_fix_sql] Conectando ao banco...`);

try {
    const resultado = await pool.query(sql);
    // O pg retorna array quando tem múltiplos statements
    const resultados = Array.isArray(resultado) ? resultado : [resultado];

    let totalUpdates = 0;
    let totalDeletes = 0;
    let totalSelects = 0;
    for (const r of resultados) {
        if (!r) continue;
        if (r.command === 'UPDATE') totalUpdates += r.rowCount || 0;
        else if (r.command === 'DELETE') totalDeletes += r.rowCount || 0;
        else if (r.command === 'SELECT') totalSelects = r.rowCount || 0;
    }

    console.log('[run_fix_sql] ✓ SQL executado com sucesso');
    console.log(`  UPDATEs: ${totalUpdates} linhas afetadas`);
    console.log(`  DELETEs: ${totalDeletes} linhas afetadas`);
    console.log(`  SELECT final retornou: ${totalSelects} linhas`);

    // Mostra as primeiras linhas do SELECT final (verificação)
    const selectResult = resultados.find(r => r && r.command === 'SELECT');
    if (selectResult && selectResult.rows && selectResult.rows.length) {
        console.log('\n[run_fix_sql] Amostra do SELECT de verificação (primeiras 5):');
        selectResult.rows.slice(0, 5).forEach(row => console.log(' ', JSON.stringify(row)));
    }
} catch (err) {
    console.error('[run_fix_sql] ✗ ERRO ao executar SQL:');
    console.error(err.message);
    if (err.position) console.error('  Posição no SQL:', err.position);
    if (err.detail) console.error('  Detalhe:', err.detail);
    process.exit(1);
} finally {
    await pool.end();
}
