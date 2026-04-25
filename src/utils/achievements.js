/**
 * Catálogo de conquistas estilo PSN.
 * Definidas em código (não no banco) porque a lógica de cada uma é específica.
 *
 * Cada conquista tem:
 *   id          → único, snake_case
 *   name        → nome curto exibido
 *   description → o que precisa fazer pra desbloquear
 *   icon        → Material Icon
 *   rarity      → 'bronze' | 'silver' | 'gold' | 'platinum'
 *   category    → 'presenca' | 'vitorias' | 'especial' | 'social' | 'colecao'
 *   target      → valor numérico alvo (pra render do progress bar)
 *   check(s)    → função que recebe stats do user e retorna { unlocked: bool, progress: number }
 */

export const ACHIEVEMENT_CATEGORIES = {
    presenca:  { label: 'Presença',     icon: 'stadium' },
    vitorias:  { label: 'Vitórias',     icon: 'emoji_events' },
    especial:  { label: 'Especiais',    icon: 'auto_awesome' },
    social:    { label: 'Sociais',      icon: 'group' },
    colecao:   { label: 'Coleção',      icon: 'collections_bookmark' },
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
        icon: 'stadium',
        rarity: 'bronze',
        category: 'presenca',
        target: 1,
        check: (s) => progresso(s.jogos, 1),
    },
    {
        id: 'presente_10',
        name: 'Frequentador',
        description: 'Esteve em 10 jogos do seu time',
        icon: 'stadium',
        rarity: 'bronze',
        category: 'presenca',
        target: 10,
        check: (s) => progresso(s.jogos, 10),
    },
    {
        id: 'presente_25',
        name: 'Não Falta',
        description: 'Esteve em 25 jogos do seu time',
        icon: 'stadium',
        rarity: 'silver',
        category: 'presenca',
        target: 25,
        check: (s) => progresso(s.jogos, 25),
    },
    {
        id: 'presente_50',
        name: 'Rachadura',
        description: 'Esteve em 50 jogos do seu time',
        icon: 'stadium',
        rarity: 'silver',
        category: 'presenca',
        target: 50,
        check: (s) => progresso(s.jogos, 50),
    },
    {
        id: 'presente_100',
        name: 'Centena',
        description: 'Esteve em 100 jogos do seu time',
        icon: 'workspace_premium',
        rarity: 'gold',
        category: 'presenca',
        target: 100,
        check: (s) => progresso(s.jogos, 100),
    },
    {
        id: 'presente_200',
        name: 'Veterano',
        description: 'Esteve em 200 jogos do seu time',
        icon: 'military_tech',
        rarity: 'gold',
        category: 'presenca',
        target: 200,
        check: (s) => progresso(s.jogos, 200),
    },
    {
        id: 'presente_365',
        name: 'Lenda da Arquibancada',
        description: 'Esteve em 365 jogos — uma vida inteira na geral',
        icon: 'diamond',
        rarity: 'platinum',
        category: 'presenca',
        target: 365,
        check: (s) => progresso(s.jogos, 365),
    },

    // ============== VITÓRIAS ==============
    {
        id: 'vitoria_1',
        name: 'Pé Quente',
        description: 'Viu seu time vencer pela primeira vez',
        icon: 'emoji_events',
        rarity: 'bronze',
        category: 'vitorias',
        target: 1,
        check: (s) => progresso(s.vitorias, 1),
    },
    {
        id: 'vitoria_10',
        name: 'Decuplo',
        description: 'Viu 10 vitórias do seu time no estádio',
        icon: 'emoji_events',
        rarity: 'bronze',
        category: 'vitorias',
        target: 10,
        check: (s) => progresso(s.vitorias, 10),
    },
    {
        id: 'vitoria_25',
        name: 'Pé Mais Quente',
        description: 'Viu 25 vitórias do seu time',
        icon: 'emoji_events',
        rarity: 'silver',
        category: 'vitorias',
        target: 25,
        check: (s) => progresso(s.vitorias, 25),
    },
    {
        id: 'vitoria_50',
        name: 'Talismã',
        description: 'Viu 50 vitórias do seu time. Coincidência? Nada disso.',
        icon: 'emoji_events',
        rarity: 'gold',
        category: 'vitorias',
        target: 50,
        check: (s) => progresso(s.vitorias, 50),
    },
    {
        id: 'vitoria_100',
        name: 'Cabala Vencedora',
        description: 'Viu 100 vitórias. Lenda absoluta da arquibancada.',
        icon: 'workspace_premium',
        rarity: 'platinum',
        category: 'vitorias',
        target: 100,
        check: (s) => progresso(s.vitorias, 100),
    },
    {
        id: 'aproveitamento_70',
        name: 'Pode Comigo',
        description: 'Aproveitamento ≥ 70% (com no mínimo 10 jogos)',
        icon: 'trending_up',
        rarity: 'gold',
        category: 'vitorias',
        target: 70,
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
        icon: 'local_fire_department',
        rarity: 'silver',
        category: 'especial',
        target: 1,
        check: (s) => progresso(s.classicos, 1),
    },
    {
        id: 'classico_5',
        name: 'Rivalíssimo',
        description: 'Esteve em 5 clássicos',
        icon: 'local_fire_department',
        rarity: 'gold',
        category: 'especial',
        target: 5,
        check: (s) => progresso(s.classicos, 5),
    },
    {
        id: 'classico_10',
        name: 'Inimigo do Rival',
        description: '10 clássicos vividos da arquibancada. Lenda do dérbi.',
        icon: 'whatshot',
        rarity: 'platinum',
        category: 'especial',
        target: 10,
        check: (s) => progresso(s.classicos, 10),
    },
    {
        id: 'titulo_1',
        name: 'Campeão!',
        description: 'Esteve presente em pelo menos 1 jogo de título conquistado',
        icon: 'workspace_premium',
        rarity: 'gold',
        category: 'especial',
        target: 1,
        check: (s) => progresso(s.titulos || 0, 1),
    },

    // ============== COLEÇÃO ==============
    {
        id: 'nota_1',
        name: 'Cronista',
        description: 'Escreveu sua primeira nota sobre um jogo',
        icon: 'edit_note',
        rarity: 'bronze',
        category: 'colecao',
        target: 1,
        check: (s) => progresso(s.notas || 0, 1),
    },
    {
        id: 'nota_10',
        name: 'Memorialista',
        description: 'Escreveu 10 notas sobre os jogos que foi',
        icon: 'edit_note',
        rarity: 'silver',
        category: 'colecao',
        target: 10,
        check: (s) => progresso(s.notas || 0, 10),
    },
    {
        id: 'nota_50',
        name: 'Historiador da Torcida',
        description: 'Escreveu 50 notas. Tem uma biblioteca pessoal aí.',
        icon: 'auto_stories',
        rarity: 'gold',
        category: 'colecao',
        target: 50,
        check: (s) => progresso(s.notas || 0, 50),
    },

    // ============== SOCIAIS ==============
    {
        id: 'amigo_1',
        name: 'Tem Companhia',
        description: 'Adicionou seu primeiro amigo',
        icon: 'group_add',
        rarity: 'bronze',
        category: 'social',
        target: 1,
        check: (s) => progresso(s.amigos || 0, 1),
    },
    {
        id: 'amigo_5',
        name: 'Galera Boa',
        description: 'Tem 5 amigos na rede',
        icon: 'groups',
        rarity: 'silver',
        category: 'social',
        target: 5,
        check: (s) => progresso(s.amigos || 0, 5),
    },
    {
        id: 'amigo_10',
        name: 'Time da Galera',
        description: 'Tem 10 amigos na rede',
        icon: 'groups',
        rarity: 'gold',
        category: 'social',
        target: 10,
        check: (s) => progresso(s.amigos || 0, 10),
    },
    {
        id: 'companions_5',
        name: 'Não Vou Sozinho',
        description: 'Foi a pelo menos 5 jogos com algum amigo',
        icon: 'groups_2',
        rarity: 'silver',
        category: 'social',
        target: 5,
        check: (s) => progresso(s.jogos_com_companions || 0, 5),
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
