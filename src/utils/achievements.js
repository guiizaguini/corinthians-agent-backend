/**
 * Catálogo de conquistas estilo PSN.
 * Definidas em código (não no banco) porque a lógica de cada uma é específica.
 *
 * Cada conquista tem:
 *   id          → único, snake_case
 *   name        → nome curto exibido (PT default)
 *   description → o que precisa fazer pra desbloquear (PT default)
 *   i18n        → { en: { name, desc }, es: { name, desc } } — voseo argentino
 *                 pra ES. Frontend usa tAchName(a)/tAchDesc(a) pra escolher.
 *   icon        → Material Icon
 *   rarity      → 'bronze' | 'silver' | 'gold' | 'platinum'
 *   category    → 'presenca' | 'vitorias' | 'especial' | 'social' | 'colecao' | 'bolao'
 *   target      → valor numérico alvo (pra render do progress bar)
 *   check(s)    → função que recebe stats do user e retorna { unlocked: bool, progress: number }
 */

export const ACHIEVEMENT_CATEGORIES = {
    presenca:  { label: 'Presença',         icon: 'stadium' },
    vitorias:  { label: 'Vitórias',         icon: 'emoji_events' },
    especial:  { label: 'Especiais',        icon: 'auto_awesome' },
    social:    { label: 'Sociais',          icon: 'group' },
    colecao:   { label: 'Coleção',          icon: 'collections_bookmark' },
    bolao:     { label: 'Bolão da Copa',    icon: 'sports_soccer' },
};

export const RARITY_INFO = {
    bronze:   { label: 'Bronze',   color: '#cd7f32', order: 1 },
    silver:   { label: 'Prata',    color: '#9b9b9b', order: 2 },
    gold:     { label: 'Ouro',     color: '#d4a520', order: 3 },
    platinum: { label: 'Platina',  color: '#7ee0ff', order: 4 },
};

// Helper pra criar conquistas de progressão linear (ex: 10/25/50/100 jogos)
function progresso(current, target) {
    return {
        unlocked: current >= target,
        progress: Math.min(current, target),
    };
}

export const ACHIEVEMENTS = [
    // ============== PRESENÇA ==============
    {
        id: 'presente_1',
        name: 'Primeira Vez',
        description: 'Marcou presença em seu primeiro jogo no estádio',
        i18n: {
            en: { name: 'First Time',         desc: 'Attended your first match at the stadium' },
            es: { name: 'Primera Vez',        desc: 'Estuviste en tu primer partido en la cancha' },
        },
        icon: 'stadium', rarity: 'bronze', category: 'presenca', target: 1,
        check: (s) => progresso(s.jogos, 1),
    },
    {
        id: 'presente_10',
        name: 'Frequentador',
        description: 'Esteve em 10 jogos do seu time',
        i18n: {
            en: { name: 'Regular',            desc: 'Attended 10 matches of your team' },
            es: { name: 'Habitué',            desc: 'Estuviste en 10 partidos de tu equipo' },
        },
        icon: 'stadium', rarity: 'bronze', category: 'presenca', target: 10,
        check: (s) => progresso(s.jogos, 10),
    },
    {
        id: 'presente_25',
        name: 'Não Falta',
        description: 'Esteve em 25 jogos do seu time',
        i18n: {
            en: { name: 'Never Misses',       desc: 'Attended 25 matches of your team' },
            es: { name: 'No Falla',           desc: 'Estuviste en 25 partidos de tu equipo' },
        },
        icon: 'stadium', rarity: 'silver', category: 'presenca', target: 25,
        check: (s) => progresso(s.jogos, 25),
    },
    {
        id: 'presente_50',
        name: 'Rachadura',
        description: 'Esteve em 50 jogos do seu time',
        i18n: {
            en: { name: 'Die-hard',           desc: 'Attended 50 matches of your team' },
            es: { name: 'Fanático',           desc: 'Estuviste en 50 partidos de tu equipo' },
        },
        icon: 'stadium', rarity: 'silver', category: 'presenca', target: 50,
        check: (s) => progresso(s.jogos, 50),
    },
    {
        id: 'presente_100',
        name: 'Centena',
        description: 'Esteve em 100 jogos do seu time',
        i18n: {
            en: { name: 'Century',            desc: 'Attended 100 matches of your team' },
            es: { name: 'Centena',            desc: 'Estuviste en 100 partidos de tu equipo' },
        },
        icon: 'workspace_premium', rarity: 'gold', category: 'presenca', target: 100,
        check: (s) => progresso(s.jogos, 100),
    },
    {
        id: 'presente_200',
        name: 'Veterano',
        description: 'Esteve em 200 jogos do seu time',
        i18n: {
            en: { name: 'Veteran',            desc: 'Attended 200 matches of your team' },
            es: { name: 'Veterano',           desc: 'Estuviste en 200 partidos de tu equipo' },
        },
        icon: 'military_tech', rarity: 'gold', category: 'presenca', target: 200,
        check: (s) => progresso(s.jogos, 200),
    },
    {
        id: 'presente_365',
        name: 'Lenda da Arquibancada',
        description: 'Esteve em 365 jogos — uma vida inteira na geral',
        i18n: {
            en: { name: 'Stand Legend',       desc: 'Attended 365 matches — a whole life on the bleachers' },
            es: { name: 'Leyenda de la Tribuna', desc: 'Estuviste en 365 partidos — toda una vida en la popular' },
        },
        icon: 'diamond', rarity: 'platinum', category: 'presenca', target: 365,
        check: (s) => progresso(s.jogos, 365),
    },

    // ============== VITÓRIAS ==============
    {
        id: 'vitoria_1',
        name: 'Pé Quente',
        description: 'Viu seu time vencer pela primeira vez',
        i18n: {
            en: { name: 'Lucky Charm',        desc: 'Saw your team win for the first time' },
            es: { name: 'Cábala',             desc: 'Viste ganar a tu equipo por primera vez' },
        },
        icon: 'emoji_events', rarity: 'bronze', category: 'vitorias', target: 1,
        check: (s) => progresso(s.vitorias, 1),
    },
    {
        id: 'vitoria_10',
        name: 'Decuplo',
        description: 'Viu 10 vitórias do seu time no estádio',
        i18n: {
            en: { name: 'Decuple',            desc: 'Saw 10 wins of your team at the stadium' },
            es: { name: 'Diez Triunfos',      desc: 'Viste 10 triunfos de tu equipo en la cancha' },
        },
        icon: 'emoji_events', rarity: 'bronze', category: 'vitorias', target: 10,
        check: (s) => progresso(s.vitorias, 10),
    },
    {
        id: 'vitoria_25',
        name: 'Pé Mais Quente',
        description: 'Viu 25 vitórias do seu time',
        i18n: {
            en: { name: 'Hot Streak',         desc: 'Saw 25 wins of your team' },
            es: { name: 'Cábala Total',       desc: 'Viste 25 triunfos de tu equipo' },
        },
        icon: 'emoji_events', rarity: 'silver', category: 'vitorias', target: 25,
        check: (s) => progresso(s.vitorias, 25),
    },
    {
        id: 'vitoria_50',
        name: 'Talismã',
        description: 'Viu 50 vitórias do seu time. Coincidência? Nada disso.',
        i18n: {
            en: { name: 'Talisman',           desc: 'Saw 50 wins of your team. Coincidence? No way.' },
            es: { name: 'Talismán',           desc: 'Viste 50 triunfos de tu equipo. ¿Coincidencia? Para nada.' },
        },
        icon: 'emoji_events', rarity: 'gold', category: 'vitorias', target: 50,
        check: (s) => progresso(s.vitorias, 50),
    },
    {
        id: 'vitoria_100',
        name: 'Cabala Vencedora',
        description: 'Viu 100 vitórias. Lenda absoluta da arquibancada.',
        i18n: {
            en: { name: 'Winning Charm',      desc: 'Saw 100 wins. Absolute legend of the stands.' },
            es: { name: 'Cábala Eterna',      desc: 'Viste 100 triunfos. Leyenda absoluta de la tribuna.' },
        },
        icon: 'workspace_premium', rarity: 'platinum', category: 'vitorias', target: 100,
        check: (s) => progresso(s.vitorias, 100),
    },
    {
        id: 'aproveitamento_70',
        name: 'Pode Comigo',
        description: 'Aproveitamento ≥ 70% (com no mínimo 10 jogos)',
        i18n: {
            en: { name: 'Bring It On',        desc: 'Win rate ≥ 70% (minimum 10 matches)' },
            es: { name: 'No Hay Con Qué',     desc: 'Aprovechamiento ≥ 70% (mínimo 10 partidos)' },
        },
        icon: 'trending_up', rarity: 'gold', category: 'vitorias', target: 70,
        check: (s) => ({
            unlocked: s.jogos >= 10 && (s.aproveitamento_pct || 0) >= 70,
            progress: Math.min(s.aproveitamento_pct || 0, 70),
        }),
    },

    // ============== ESPECIAIS ==============
    {
        id: 'classico_1',
        name: 'Sangue Quente',
        description: 'Esteve no seu primeiro clássico',
        i18n: {
            en: { name: 'Hot Blood',          desc: 'Attended your first derby' },
            es: { name: 'Sangre Caliente',    desc: 'Estuviste en tu primer clásico' },
        },
        icon: 'local_fire_department', rarity: 'silver', category: 'especial', target: 1,
        check: (s) => progresso(s.classicos, 1),
    },
    {
        id: 'classico_5',
        name: 'Rivalíssimo',
        description: 'Esteve em 5 clássicos',
        i18n: {
            en: { name: 'Derby Fan',          desc: 'Attended 5 derbies' },
            es: { name: 'Clasiquero',         desc: 'Estuviste en 5 clásicos' },
        },
        icon: 'local_fire_department', rarity: 'gold', category: 'especial', target: 5,
        check: (s) => progresso(s.classicos, 5),
    },
    {
        id: 'classico_10',
        name: 'Inimigo do Rival',
        description: '10 clássicos vividos da arquibancada. Lenda do dérbi.',
        i18n: {
            en: { name: 'Enemy of the Rival', desc: '10 derbies lived from the stands. Derby legend.' },
            es: { name: 'Enemigo del Rival',  desc: '10 clásicos vividos en la tribuna. Leyenda del clásico.' },
        },
        icon: 'whatshot', rarity: 'platinum', category: 'especial', target: 10,
        check: (s) => progresso(s.classicos, 10),
    },
    {
        id: 'titulo_1',
        name: 'Campeão!',
        description: 'Esteve presente em pelo menos 1 jogo de título conquistado',
        i18n: {
            en: { name: 'Champion!',          desc: 'Attended at least 1 trophy-winning match' },
            es: { name: '¡Campeón!',          desc: 'Estuviste en al menos 1 partido de título' },
        },
        icon: 'workspace_premium', rarity: 'gold', category: 'especial', target: 1,
        check: (s) => progresso(s.titulos || 0, 1),
    },

    // ============== COLEÇÃO ==============
    {
        id: 'nota_1',
        name: 'Cronista',
        description: 'Escreveu sua primeira nota sobre um jogo',
        i18n: {
            en: { name: 'Chronicler',         desc: 'Wrote your first note about a match' },
            es: { name: 'Cronista',           desc: 'Escribiste tu primera nota sobre un partido' },
        },
        icon: 'edit_note', rarity: 'bronze', category: 'colecao', target: 1,
        check: (s) => progresso(s.notas || 0, 1),
    },
    {
        id: 'nota_10',
        name: 'Memorialista',
        description: 'Escreveu 10 notas sobre os jogos que foi',
        i18n: {
            en: { name: 'Memoirist',          desc: 'Wrote 10 notes about matches you attended' },
            es: { name: 'Memorioso',          desc: 'Escribiste 10 notas sobre los partidos que fuiste' },
        },
        icon: 'edit_note', rarity: 'silver', category: 'colecao', target: 10,
        check: (s) => progresso(s.notas || 0, 10),
    },
    {
        id: 'nota_50',
        name: 'Historiador da Torcida',
        description: 'Escreveu 50 notas. Tem uma biblioteca pessoal aí.',
        i18n: {
            en: { name: 'Fan Historian',      desc: 'Wrote 50 notes. You have a personal library now.' },
            es: { name: 'Historiador de la Hinchada', desc: 'Escribiste 50 notas. Tenés una biblioteca personal.' },
        },
        icon: 'auto_stories', rarity: 'gold', category: 'colecao', target: 50,
        check: (s) => progresso(s.notas || 0, 50),
    },

    // ============== SOCIAIS ==============
    {
        id: 'amigo_1',
        name: 'Tem Companhia',
        description: 'Adicionou seu primeiro amigo',
        i18n: {
            en: { name: 'Got Company',        desc: 'Added your first friend' },
            es: { name: 'Con Compañía',       desc: 'Agregaste a tu primer amigo' },
        },
        icon: 'group_add', rarity: 'bronze', category: 'social', target: 1,
        check: (s) => progresso(s.amigos || 0, 1),
    },
    {
        id: 'amigo_5',
        name: 'Galera Boa',
        description: 'Tem 5 amigos na rede',
        i18n: {
            en: { name: 'Good Crew',          desc: '5 friends in your network' },
            es: { name: 'Buena Banda',        desc: 'Tenés 5 amigos en la red' },
        },
        icon: 'groups', rarity: 'silver', category: 'social', target: 5,
        check: (s) => progresso(s.amigos || 0, 5),
    },
    {
        id: 'amigo_10',
        name: 'Time da Galera',
        description: 'Tem 10 amigos na rede',
        i18n: {
            en: { name: 'Squad Captain',      desc: '10 friends in your network' },
            es: { name: 'Equipo de la Banda', desc: 'Tenés 10 amigos en la red' },
        },
        icon: 'groups', rarity: 'gold', category: 'social', target: 10,
        check: (s) => progresso(s.amigos || 0, 10),
    },
    {
        id: 'companions_5',
        name: 'Não Vou Sozinho',
        description: 'Foi a pelo menos 5 jogos com algum amigo',
        i18n: {
            en: { name: 'Not Going Alone',    desc: 'Went to at least 5 matches with a friend' },
            es: { name: 'No Voy Solo',        desc: 'Fuiste al menos a 5 partidos con un amigo' },
        },
        icon: 'groups_2', rarity: 'silver', category: 'social', target: 5,
        check: (s) => progresso(s.jogos_com_companions || 0, 5),
    },

    // ============== BOLÃO DA COPA ==============
    // Stats vem de fetchBolaoStats(uid) — funcionam pra qualquer user,
    // com ou sem clube selecionado (white-label Botmaker tambem ganha).
    {
        id: 'bolao_participar_1',
        name: 'Faz Parte',
        description: 'Entrou no seu primeiro bolão da Copa do Mundo',
        i18n: {
            en: { name: 'Part of It',         desc: 'Joined your first World Cup pool' },
            es: { name: 'Sos Parte',          desc: 'Te uniste a tu primera quiniela del Mundial' },
        },
        icon: 'how_to_reg', rarity: 'bronze', category: 'bolao', target: 1,
        check: (s) => progresso(s.boloes_count || 0, 1),
    },
    {
        id: 'bolao_palpite_1',
        name: 'Primeiro Palpite',
        description: 'Mandou seu primeiro palpite num bolão da Copa',
        i18n: {
            en: { name: 'First Prediction',   desc: 'Made your first prediction in a World Cup pool' },
            es: { name: 'Primer Pronóstico',  desc: 'Mandaste tu primer pronóstico en una quiniela' },
        },
        icon: 'sports_soccer', rarity: 'bronze', category: 'bolao', target: 1,
        check: (s) => progresso(s.palpites_count || 0, 1),
    },
    {
        id: 'bolao_palpite_30',
        name: 'Apostador Convicto',
        description: 'Fez 30 palpites em bolões da Copa',
        i18n: {
            en: { name: 'Convinced Bettor',   desc: 'Made 30 predictions in World Cup pools' },
            es: { name: 'Pronosticador Convicto', desc: 'Hiciste 30 pronósticos en quinielas del Mundial' },
        },
        icon: 'sports_soccer', rarity: 'silver', category: 'bolao', target: 30,
        check: (s) => progresso(s.palpites_count || 0, 30),
    },
    {
        id: 'bolao_palpitou_tudo',
        name: 'Não Falta Um',
        description: 'Palpitou TODOS os jogos de algum bolão da Copa',
        i18n: {
            en: { name: 'Not One Missed',     desc: 'Predicted EVERY match of some World Cup pool' },
            es: { name: 'No Falta Ninguno',   desc: 'Pronosticaste TODOS los partidos de alguna quiniela' },
        },
        icon: 'check_circle', rarity: 'silver', category: 'bolao', target: 1,
        check: (s) => progresso(s.palpitou_tudo ? 1 : 0, 1),
    },
    {
        id: 'bolao_acerto_exato_1',
        name: 'Cravou!',
        description: 'Acertou um placar exato no bolão',
        i18n: {
            en: { name: 'Nailed It!',         desc: 'Got one exact score right in the pool' },
            es: { name: '¡Clavaste!',         desc: 'Acertaste un resultado exacto en la quiniela' },
        },
        icon: 'gps_fixed', rarity: 'bronze', category: 'bolao', target: 1,
        check: (s) => progresso(s.acertos_exatos || 0, 1),
    },
    {
        id: 'bolao_acerto_exato_5',
        name: 'Bola de Cristal',
        description: 'Acertou 5 placares exatos em bolões da Copa',
        i18n: {
            en: { name: 'Crystal Ball',       desc: 'Got 5 exact scores right in World Cup pools' },
            es: { name: 'Bola de Cristal',    desc: 'Acertaste 5 resultados exactos en quinielas' },
        },
        icon: 'auto_awesome', rarity: 'silver', category: 'bolao', target: 5,
        check: (s) => progresso(s.acertos_exatos || 0, 5),
    },
    {
        id: 'bolao_acerto_exato_10',
        name: 'Profeta',
        description: 'Acertou 10 placares exatos. Você tem dom.',
        i18n: {
            en: { name: 'Prophet',            desc: 'Got 10 exact scores right. You have a gift.' },
            es: { name: 'Profeta',            desc: 'Acertaste 10 resultados exactos. Tenés don.' },
        },
        icon: 'psychology', rarity: 'gold', category: 'bolao', target: 10,
        check: (s) => progresso(s.acertos_exatos || 0, 10),
    },
    {
        id: 'bolao_pontos_100',
        name: 'Centena de Pontos',
        description: 'Acumulou 100 pontos em algum bolão da Copa',
        i18n: {
            en: { name: 'Hundred Points',     desc: 'Reached 100 points in some World Cup pool' },
            es: { name: 'Cien Puntos',        desc: 'Llegaste a 100 puntos en alguna quiniela' },
        },
        icon: 'leaderboard', rarity: 'gold', category: 'bolao', target: 100,
        check: (s) => progresso(s.max_pontos_bolao || 0, 100),
    },
    {
        id: 'bolao_top3',
        name: 'No Pódio',
        description: 'Ficou no top 3 de algum bolão (depois da 1ª rodada)',
        i18n: {
            en: { name: 'On the Podium',      desc: 'Reached top 3 in some pool (after the 1st round)' },
            es: { name: 'En el Podio',        desc: 'Llegaste al top 3 de alguna quiniela (después de la 1ª fecha)' },
        },
        icon: 'workspace_premium', rarity: 'silver', category: 'bolao', target: 1,
        check: (s) => progresso(s.foi_top3 ? 1 : 0, 1),
    },
    {
        id: 'bolao_top1',
        name: 'Líder do Bolão',
        description: 'Esteve em 1º lugar de algum bolão (depois da 1ª rodada)',
        i18n: {
            en: { name: 'Pool Leader',        desc: 'Was in 1st place of some pool (after the 1st round)' },
            es: { name: 'Líder de la Quiniela', desc: 'Estuviste 1º en alguna quiniela (después de la 1ª fecha)' },
        },
        icon: 'emoji_events', rarity: 'gold', category: 'bolao', target: 1,
        check: (s) => progresso(s.foi_top1 ? 1 : 0, 1),
    },
    {
        id: 'bolao_top1_final',
        name: 'Campeão do Bolão',
        description: 'Terminou em 1º lugar quando a Copa do Mundo acabou',
        i18n: {
            en: { name: 'Pool Champion',      desc: 'Finished 1st when the World Cup ended' },
            es: { name: 'Campeón de la Quiniela', desc: 'Terminaste 1º cuando se terminó el Mundial' },
        },
        icon: 'military_tech', rarity: 'platinum', category: 'bolao', target: 1,
        check: (s) => progresso(s.campeao_bolao ? 1 : 0, 1),
    },
];

/**
 * Computa o estado de todas as conquistas com base nas estatísticas do usuário.
 * Retorna lista ordenada: desbloqueadas primeiro (mais raras), depois bloqueadas.
 */
export function computeAchievements(stats) {
    return ACHIEVEMENTS.map(a => {
        const result = a.check(stats);
        return {
            id: a.id,
            name: a.name,
            description: a.description,
            i18n: a.i18n,           // { en: {name,desc}, es: {name,desc} } — frontend escolhe
            icon: a.icon,
            rarity: a.rarity,
            category: a.category,
            target: a.target,
            unlocked: !!result.unlocked,
            progress: result.progress || 0,
            pct: Math.min(100, Math.round(((result.progress || 0) / a.target) * 100)),
        };
    });
}
