/**
 * Atualiza o album do user gabriel_mayer com base na lista de
 * faltantes que ele compartilhou (gerada pelo app oficial Panini).
 *
 * Logica:
 *  - Recebe a lista de codes FALTANTES (formato bruto: 'MEX5', 'CC3', '00').
 *  - Normaliza pra formato do nosso DB ('MEX-05', 'CC-03', '00').
 *  - Pra TODO cromo do album: marca quantidade=1 (tem) ou quantidade=0
 *    (falta) com base na lista.
 *  - Codes que nao existem no nosso DB (REGU/BRON/PRAT/OURO — extra
 *    stickers que ainda nao temos) sao ignorados com warn.
 *
 * SAFE: so afeta o user gabriel_mayer. Outros usuarios intocados.
 *
 * Uso:
 *   railway run node scripts/update_gabriel_mayer_album.mjs
 */

import 'dotenv/config';
import dns from 'node:dns/promises';

if (process.env.DATABASE_URL && process.env.DATABASE_PUBLIC_URL) {
    try { await dns.lookup(new URL(process.env.DATABASE_URL).hostname); }
    catch { process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL; }
}
const { pool } = await import('../src/db/pool.js');

const TARGET_USERNAME = 'gabriel_mayer';

// ============================================================
// LISTA DE FALTANTES — copy/paste exato do que o user mandou
// ============================================================
// Cada item eh o code "bruto" como aparece no app oficial.
// "00" e "FWC1..19", "CC1..14" tem formato proprio (sem hifen).
// Codes de selecoes ('MEX5', 'BRA13') sao XXX + numero (sem hifen).
const FALTANTES_RAW = [
    // Somos 26
    '00',
    // Copa 2026 + Bola e Paises-Sede
    'FWC1','FWC2','FWC3','FWC4','FWC5','FWC6','FWC7','FWC8',
    // MEX
    'MEX5','MEX11','MEX13','MEX15','MEX18',
    // RSA
    'RSA4','RSA7','RSA13','RSA16','RSA19',
    // KOR
    'KOR3','KOR9','KOR11','KOR13','KOR18','KOR20',
    // CZE (quase todos)
    'CZE1','CZE3','CZE4','CZE5','CZE6','CZE7','CZE8','CZE9','CZE10',
    'CZE11','CZE12','CZE13','CZE14','CZE15','CZE16','CZE17','CZE19','CZE20',
    // CAN
    'CAN2','CAN6','CAN9','CAN11','CAN13','CAN14',
    // BIH
    'BIH1','BIH2','BIH3','BIH4','BIH5','BIH6','BIH8','BIH9','BIH10',
    'BIH11','BIH12','BIH13','BIH15','BIH16','BIH17','BIH19','BIH20',
    // QAT
    'QAT8','QAT13','QAT17',
    // SUI
    'SUI4','SUI8','SUI9','SUI10','SUI12','SUI13','SUI14','SUI15',
    'SUI17','SUI18','SUI19','SUI20',
    // BRA
    'BRA2','BRA6','BRA12','BRA13','BRA16','BRA18','BRA20',
    // MAR
    'MAR1','MAR7','MAR13','MAR14','MAR18','MAR19','MAR20',
    // HAI
    'HAI1','HAI5','HAI9','HAI14','HAI18',
    // SCO
    'SCO4','SCO8','SCO12','SCO13','SCO17',
    // USA
    'USA1','USA2','USA3','USA4','USA5','USA6','USA7','USA8','USA9',
    'USA12','USA14','USA15','USA16','USA17','USA18','USA19','USA20',
    // PAR
    'PAR1','PAR3','PAR4','PAR5','PAR6','PAR8','PAR9','PAR10','PAR13',
    'PAR15','PAR18','PAR19',
    // AUS
    'AUS2','AUS9','AUS12','AUS13','AUS14','AUS15','AUS16','AUS17','AUS18','AUS19','AUS20',
    // TUR
    'TUR1','TUR3','TUR4','TUR5','TUR7','TUR9','TUR10','TUR11','TUR12',
    'TUR13','TUR14','TUR15','TUR16','TUR17','TUR18','TUR19','TUR20',
    // GER
    'GER2','GER5','GER6','GER9','GER10','GER13','GER14','GER15','GER17','GER18',
    // CUW
    'CUW5','CUW7','CUW9','CUW13','CUW14','CUW18','CUW20',
    // CIV
    'CIV1','CIV5','CIV7','CIV9','CIV13','CIV14',
    // ECU
    'ECU3','ECU6','ECU7','ECU8','ECU10','ECU11','ECU12','ECU13','ECU15',
    'ECU17','ECU19','ECU20',
    // NED
    'NED1','NED7','NED8','NED12','NED13','NED17',
    // JPN
    'JPN1','JPN2','JPN13','JPN14',
    // SWE
    'SWE1','SWE2','SWE3','SWE4','SWE6','SWE7','SWE8','SWE9','SWE10',
    'SWE11','SWE12','SWE14','SWE15','SWE16','SWE18','SWE19','SWE20',
    // TUN
    'TUN2','TUN3','TUN4','TUN5','TUN6','TUN8','TUN9','TUN10','TUN13',
    'TUN14','TUN15','TUN16','TUN18','TUN19',
    // BEL
    'BEL10','BEL11','BEL12','BEL13','BEL16',
    // EGY
    'EGY4','EGY5','EGY9','EGY13','EGY14','EGY15','EGY16','EGY18','EGY19',
    // IRN
    'IRN8','IRN12','IRN13','IRN17',
    // NZL
    'NZL2','NZL10','NZL13','NZL15','NZL16','NZL18','NZL19','NZL20',
    // ESP
    'ESP2','ESP6','ESP8','ESP10','ESP13','ESP16',
    // CPV
    'CPV4','CPV7','CPV8','CPV12','CPV13','CPV17',
    // KSA
    'KSA1','KSA3','KSA5','KSA13',
    // URU
    'URU2','URU3','URU4','URU5','URU6','URU12','URU15','URU16','URU17','URU19','URU20',
    // FRA
    'FRA12','FRA13','FRA14','FRA16','FRA17','FRA20',
    // SEN
    'SEN3','SEN10','SEN13','SEN14','SEN15',
    // IRQ
    'IRQ1','IRQ2','IRQ5','IRQ6','IRQ7','IRQ8','IRQ9','IRQ10','IRQ11',
    'IRQ12','IRQ13','IRQ14','IRQ15','IRQ16','IRQ17','IRQ18','IRQ19',
    // NOR
    'NOR2','NOR6','NOR10','NOR13','NOR14','NOR15','NOR17',
    // ARG
    'ARG3','ARG5','ARG7','ARG9','ARG12','ARG17',
    // ALG
    'ALG2','ALG5','ALG6','ALG7','ALG9','ALG11','ALG13','ALG14','ALG15','ALG16','ALG18',
    // AUT
    'AUT1','AUT2','AUT3','AUT4',
    // JOR
    'JOR2','JOR11','JOR20',
    // POR
    'POR3','POR4','POR8','POR10','POR12','POR13','POR15','POR17','POR19',
    // COD (todos)
    'COD1','COD2','COD3','COD4','COD5','COD6','COD7','COD8','COD9','COD10',
    'COD11','COD12','COD13','COD14','COD15','COD16','COD17','COD18','COD19','COD20',
    // UZB
    'UZB1','UZB2','UZB3','UZB4','UZB7','UZB8','UZB10','UZB11','UZB12',
    'UZB14','UZB16','UZB17','UZB18','UZB19',
    // COL
    'COL5','COL12','COL13','COL14','COL15','COL16','COL17','COL18','COL19',
    // ENG
    'ENG1','ENG3','ENG4','ENG7','ENG17',
    // CRO
    'CRO4','CRO7','CRO12','CRO16',
    // GHA
    'GHA1','GHA2','GHA3','GHA6','GHA8','GHA11','GHA12','GHA15','GHA16','GHA17',
    // PAN
    'PAN1','PAN5','PAN7','PAN9','PAN14','PAN16','PAN20',
    // Historia da Copa
    'FWC9','FWC10','FWC11','FWC12','FWC13','FWC14','FWC15','FWC16','FWC17','FWC18','FWC19',
    // Extra Stickers (nao temos no DB — sera ignorado)
    'REGU','BRON','PRAT','OURO',
    // Coca-Cola
    'CC1','CC2','CC3','CC5','CC7','CC8','CC9','CC10','CC11','CC12','CC14',
];

/**
 * Normaliza code do app oficial pro formato do nosso DB.
 *  '00'      -> '00'
 *  'FWC1'    -> 'FWC-01'
 *  'FWC19'   -> 'FWC-19'
 *  'MEX5'    -> 'MEX-05'
 *  'CC3'     -> 'CC-03'
 *  'REGU'    -> 'REGU' (mantem; nao existe no DB, sera filtrado)
 */
function normalizeCode(raw) {
    if (raw === '00') return '00';
    // FWC + numero
    let m = raw.match(/^FWC(\d+)$/i);
    if (m) return `FWC-${String(parseInt(m[1])).padStart(2, '0')}`;
    // CC + numero
    m = raw.match(/^CC(\d+)$/i);
    if (m) return `CC-${String(parseInt(m[1])).padStart(2, '0')}`;
    // XXX + numero (codes de selecao tipo MEX5, BRA13, etc)
    m = raw.match(/^([A-Z]{3})(\d+)$/i);
    if (m) return `${m[1].toUpperCase()}-${String(parseInt(m[2])).padStart(2, '0')}`;
    // Codes sem numero (REGU, BRON, PRAT, OURO) — mantem como esta
    return raw.toUpperCase();
}

(async () => {
    try {
        // Acha o user
        const { rows: userRows } = await pool.query(
            'SELECT id, username, email FROM users WHERE LOWER(username) = LOWER($1)',
            [TARGET_USERNAME]
        );
        if (!userRows.length) {
            console.error(`[update-gabriel] User '${TARGET_USERNAME}' nao encontrado`);
            process.exit(1);
        }
        const user = userRows[0];
        console.log(`[update-gabriel] User encontrado: id=${user.id}, username=${user.username}, email=${user.email}`);

        // Normaliza a lista de faltantes pra Set
        const faltantesNormalized = new Set(FALTANTES_RAW.map(normalizeCode));
        console.log(`[update-gabriel] ${FALTANTES_RAW.length} codes brutos -> ${faltantesNormalized.size} codes unicos normalizados`);

        // Lista TODOS os cromos existentes no nosso DB
        const { rows: cromos } = await pool.query(
            'SELECT id, code FROM album_cromos ORDER BY code'
        );
        console.log(`[update-gabriel] ${cromos.length} cromos no DB`);

        // Calcula quais sao 'tenho' (1) e 'falta' (0)
        const updates = []; // [{cromo_id, code, quantidade}]
        const codesNoDB = new Set(cromos.map(c => c.code));
        let tenho = 0, falta = 0;
        for (const c of cromos) {
            const isFalta = faltantesNormalized.has(c.code);
            updates.push({ cromo_id: c.id, code: c.code, quantidade: isFalta ? 0 : 1 });
            if (isFalta) falta++; else tenho++;
        }

        // Logs de codes da lista que NAO existem no DB (REGU/BRON/PRAT/OURO etc)
        const codesIgnorados = [...faltantesNormalized].filter(c => !codesNoDB.has(c));
        if (codesIgnorados.length) {
            console.log(`[update-gabriel] ${codesIgnorados.length} codes da lista NAO existem no nosso DB (ignorados):`);
            console.log(`  ${codesIgnorados.join(', ')}`);
        }

        console.log(`[update-gabriel] Plano: ${tenho} cromos como 'tenho', ${falta} como 'falta'`);
        console.log('[update-gabriel] Aplicando UPSERT em user_album_cromos...');

        // UPSERT em batch — usa unnest pra performance
        await pool.query(`
            INSERT INTO user_album_cromos (user_id, cromo_id, quantidade, updated_at)
            SELECT $1, c.cromo_id, c.quantidade, NOW()
            FROM unnest($2::int[], $3::int[]) AS c(cromo_id, quantidade)
            ON CONFLICT (user_id, cromo_id) DO UPDATE SET
                quantidade = EXCLUDED.quantidade,
                updated_at = NOW()
        `, [
            user.id,
            updates.map(u => u.cromo_id),
            updates.map(u => u.quantidade),
        ]);

        // Verificacao final
        const { rows: stats } = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE quantidade > 0)::int AS tenho,
                COUNT(*) FILTER (WHERE quantidade = 0)::int AS faltam,
                COUNT(*)::int AS total
            FROM user_album_cromos
            WHERE user_id = $1
        `, [user.id]);
        const s = stats[0];
        console.log(`\n[update-gabriel] ============= RESULTADO =============`);
        console.log(`  Tenho:  ${s.tenho}`);
        console.log(`  Faltam: ${s.faltam}`);
        console.log(`  Total:  ${s.total} (de ${cromos.length} cromos no album)`);
        console.log(`  % conclusao: ${((s.tenho / cromos.length) * 100).toFixed(1)}%`);
        console.log('[update-gabriel] OK');
    } catch (err) {
        console.error('[update-gabriel] ERRO:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
})();
