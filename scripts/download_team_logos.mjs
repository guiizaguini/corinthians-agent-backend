/**
 * Baixa logos dos times via Wikipedia REST API (que retorna imagem no thumbnail)
 * e salva em public/logos/clubes/. Resolve o problema de hotlinking direto do
 * upload.wikimedia.org que retorna 400/404 sem User-Agent específico.
 *
 * Uso:
 *   node scripts/download_team_logos.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'logos', 'clubes');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Mapa: slug do arquivo → array de Wikipedia article titles a tentar (PT-BR primeiro)
const TEAMS = {
    'corinthians':    ['Sport Club Corinthians Paulista'],
    'palmeiras':      ['Sociedade Esportiva Palmeiras', 'Palmeiras'],
    'sao-paulo':      ['São Paulo Futebol Clube', 'São Paulo FC'],
    'santos':         ['Santos FC', 'Santos Futebol Clube'],
    'flamengo':       ['Clube de Regatas do Flamengo', 'Flamengo'],
    'vasco':          ['Club de Regatas Vasco da Gama', 'Vasco da Gama'],
    'fluminense':     ['Fluminense Football Club', 'Fluminense'],
    'botafogo':       ['Botafogo de Futebol e Regatas', 'Botafogo FR'],
    'cruzeiro':       ['Cruzeiro Esporte Clube'],
    'atletico-mg':    ['Clube Atlético Mineiro', 'Atlético Mineiro'],
    'gremio':         ['Grêmio Foot-Ball Porto Alegrense', 'Grêmio'],
    'internacional':  ['Sport Club Internacional', 'Internacional (RS)'],
    'bahia':          ['Esporte Clube Bahia', 'EC Bahia'],
    'fortaleza':      ['Fortaleza Esporte Clube', 'Fortaleza EC'],
    'sport':          ['Sport Club do Recife', 'Sport Recife'],
    'vitoria':        ['Esporte Clube Vitória', 'EC Vitória'],
    'bragantino':     ['Red Bull Bragantino', 'RB Bragantino'],
    'athletico-pr':   ['Club Athletico Paranaense', 'Athletico Paranaense'],
    'atletico-go':    ['Atlético Clube Goianiense', 'Atlético Goianiense'],
    'coritiba':       ['Coritiba Foot Ball Club', 'Coritiba FC'],
    'cuiaba':         ['Cuiabá Esporte Clube', 'Cuiabá EC'],
    'ceara':          ['Ceará Sporting Club', 'Ceará SC'],
    'juventude':      ['Esporte Clube Juventude', 'EC Juventude'],
    'chapecoense':    ['Associação Chapecoense de Futebol', 'Chapecoense'],
    'america-mg':     ['América Futebol Clube (Belo Horizonte)', 'América Mineiro'],
    'avai':           ['Avaí Futebol Clube', 'Avaí FC'],
    'criciuma':       ['Criciúma Esporte Clube', 'Criciúma EC'],
    'ponte-preta':    ['Associação Atlética Ponte Preta', 'Ponte Preta'],
    'guarani':        ['Guarani Futebol Clube', 'Guarani FC'],
    'mirassol':       ['Mirassol Futebol Clube', 'Mirassol FC'],
    'novorizontino':  ['Grêmio Novorizontino', 'Novorizontino'],
    'capivariano':    ['Capivariano Futebol Clube'],
    'ferroviaria':    ['Associação Ferroviária de Esportes'],
    'ituano':         ['Ituano Futebol Clube'],
    'remo':           ['Clube do Remo'],
    'oeste':          ['Oeste Futebol Clube'],
    'portuguesa':     ['Associação Portuguesa de Desportos'],
    'goias':          ['Goiás Esporte Clube'],
    'csa':            ['Centro Sportivo Alagoano'],
    'sao-bernardo':   ['São Bernardo Futebol Clube'],
    'sao-caetano':    ['Associação Desportiva São Caetano'],
    'inter-limeira':  ['Associação Atlética Internacional (Limeira)', 'Internacional de Limeira'],
    'mogi-mirim':     ['Mogi Mirim Esporte Clube'],
    'rio-branco':     ['Rio Branco Esporte Clube'],
    'velo-clube':     ['Velo Clube Rioclarense'],
    'matonense':      ['Sociedade Esportiva Matonense'],
    'agua-santa':     ['Esporte Clube Água Santa'],
    'aracatuba':      ['Araçatuba Futebol Clube'],
    'santo-andre':    ['Esporte Clube Santo André'],
    'santa-cruz':     ['Santa Cruz Futebol Clube'],
    'gama':           ['Sociedade Esportiva do Gama'],
    'botafogo-sp':    ['Botafogo Futebol Clube (Ribeirão Preto)', 'Botafogo (SP)'],
    // Internacionais
    'real-madrid':    ['Real Madrid CF', 'Real Madrid'],
    'boca-juniors':   ['Club Atlético Boca Juniors', 'Boca Juniors'],
    'olimpia':        ['Club Olimpia', 'Olimpia (Asunción)'],
    'psg':            ['Paris Saint-Germain F.C.', 'Paris Saint-Germain'],
    'al-nassr':       ['Al-Nassr FC', 'Al Nassr'],
    'raja-casablanca': ['Raja Club Athletic', 'Raja Casablanca'],
    'rosario-central': ['Club Atlético Rosario Central', 'Rosario Central'],
    'racing':         ['Racing Club de Avellaneda', 'Racing Club'],
    'liverpool-uru':  ['Liverpool Fútbol Club (Montevideo)', 'Liverpool FC (Uruguai)'],
    'nacional-par':   ['Club Nacional (Asunción)', 'Club Nacional'],
    'nacional-uru':   ['Club Nacional de Football', 'Nacional (Uruguai)'],
    'barcelona-sc':   ['Barcelona Sporting Club', 'Barcelona SC'],
    'ldu':            ['Liga Deportiva Universitaria', 'LDU Quito'],
    'ind-del-valle':  ['Independiente del Valle', 'Independiente del Valle (Equador)'],
    'deportivo-cali': ['Deportivo Cali'],
    'universitario':  ['Club Universitario de Deportes', 'Universitario de Deportes'],
    'penarol':        ['Club Atlético Peñarol', 'Peñarol'],
    'america-mex':    ['Club América', 'América (México)'],
};

const UA = 'ArquibancadaApp/1.0 (https://github.com/guiizaguini/corinthians-agent-backend; contact@arquibancada.app)';

async function fetchSummary(title) {
    const enc = encodeURIComponent(title);
    // Tenta wiki PT primeiro, depois EN
    for (const lang of ['pt', 'en', 'es']) {
        try {
            const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${enc}`;
            const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
            if (!res.ok) continue;
            const json = await res.json();
            const src = json.thumbnail?.source || json.originalimage?.source;
            if (src) return src;
        } catch {}
    }
    return null;
}

async function downloadImage(url, dest) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buffer);
    return buffer.length;
}

(async () => {
    let ok = 0, fail = 0;
    const results = [];
    for (const [slug, titles] of Object.entries(TEAMS)) {
        const dest = path.join(OUT_DIR, `${slug}.png`);
        if (fs.existsSync(dest)) {
            console.log(`✓ ${slug} (já existe)`);
            ok++;
            continue;
        }
        process.stdout.write(`→ ${slug}: `);
        let imgUrl = null;
        for (const t of titles) {
            imgUrl = await fetchSummary(t);
            if (imgUrl) break;
        }
        if (!imgUrl) {
            console.log('NÃO ENCONTRADO');
            fail++;
            results.push({ slug, status: 'sem-url' });
            continue;
        }
        try {
            const sz = await downloadImage(imgUrl, dest);
            console.log(`OK (${(sz/1024).toFixed(1)}kb)`);
            ok++;
        } catch (e) {
            console.log(`ERRO ao baixar: ${e.message}`);
            fail++;
            results.push({ slug, status: 'fail-download', url: imgUrl });
        }
    }
    console.log(`\n=========================================`);
    console.log(`OK:    ${ok}`);
    console.log(`FAIL:  ${fail}`);
    if (fail) {
        console.log('\nFalhas:');
        for (const r of results) console.log(`  - ${r.slug}: ${r.status}`);
    }
    console.log(`\nLogos salvos em: ${OUT_DIR}`);
})();
