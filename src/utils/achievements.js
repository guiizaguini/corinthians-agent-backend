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

    // ============== BOLÃO DA COPA ==============
    // Stats vem de fetchBolaoStats(uid) — funcionam pra qualquer user,
    // com ou sem clube selecionado (white-label Botmaker tambem ganha).
    {
        id: 'bolao_participar_1',
        name: 'Faz Parte',
        description: 'Entrou no seu primeiro bolão da Copa do Mundo',
        icon: 'how_to_reg',
        rarity: 'bronze',
        category: 'bolao',
        target: 1,
        check: (s) => progresso(s.boloes_count || 0, 1),
    },
    {
        id: 'bolao_palpite_1',
        name: 'Primeiro Palpite',
        description: 'Mandou seu primeiro palpite num bolão da Copa',
        icon: 'sports_soccer',
        rarity: 'bronze',
        category: 'bolao',
        target: 1,
        check: (s) => progresso(s.palpites_count || 0, 1),
    },
    {
        id: 'bolao_palpite_30',
        name: 'Apostador Convicto',
        description: 'Fez 30 palpites em bolões da Copa',
        icon: 'sports_soccer',
        rarity: 'silver',
        category: 'bolao',
        target: 30,
        check: (s) => progresso(s.palpites_count || 0, 30),
    },
    {
        id: 'bolao_palpitou_tudo',
        name: 'Não Falta Um',
        description: 'Palpitou TODOS os jogos de algum bolão da Copa',
        icon: 'check_circle',
        rarity: 'silver',
        category: 'bolao',
        target: 1,
        check: (s) => progresso(s.palpitou_tudo ? 1 : 0, 1),
    },
    {
        id: 'bolao_acerto_exato_1',
        name: 'Cravou!',
        description: 'Acertou um placar exato no bolão',
        icon: 'gps_fixed',
        rarity: 'bronze',
        category: 'bolao',
        target: 1,
        check: (s) => progresso(s.acertos_exatos || 0, 1),
    },
    {
        id: 'bolao_acerto_exato_5',
        name: 'Bola de Cristal',
        description: 'Acertou 5 placares exatos em bolões da Copa',
        icon: 'auto_awesome',
        rarity: 'silver',
        category: 'bolao',
        target: 5,
        check: (s) => progresso(s.acertos_exatos || 0, 5),
    },
    {
        id: 'bolao_acerto_exato_10',
        name: 'Profeta',
        description: 'Acertou 10 placares exatos. Você tem dom.',
        icon: 'psychology',
        rarity: 'gold',
        category: 'bolao',
        target: 10,
        check: (s) => progresso(s.acertos_exatos || 0, 10),
    },
    {
        id: 'bolao_pontos_100',
        name: 'Centena de Pontos',
        description: 'Acumulou 100 pontos em algum bolão da Copa',
        icon: 'leaderboard',
        rarity: 'gold',
        category: 'bolao',
        target: 100,
        check: (s) => progresso(s.max_pontos_bolao || 0, 100),
    },
    {
        id: 'bolao_top3',
        name: 'No Pódio',
        description: 'Ficou no top 3 de algum bolão (depois da 1ª rodada)',
        icon: 'workspace_premium',
        rarity: 'silver',
        category: 'bolao',
        target: 1,
        check: (s) => progresso(s.foi_top3 ? 1 : 0, 1),
    },
    {
        id: 'bolao_top1',
        name: 'Líder do Bolão',
        description: 'Esteve em 1º lugar de algum bolão (depois da 1ª rodada)',
        icon: 'emoji_events',
        rarity: 'gold',
        category: 'bolao',
        target: 1,
        check: (s) => progresso(s.foi_top1 ? 1 : 0, 1),
    },
    {
        id: 'bolao_top1_final',
        name: 'Campeão do Bolão',
        description: 'Terminou em 1º lugar quando a Copa do Mundo acabou',
        icon: 'military_tech',
        rarity: 'platinum',
        category: 'bolao',
        target: 1,
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
