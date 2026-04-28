// Cadeira Numerada — i18n compartilhado entre landing/login/signup/app.
// Idiomas: pt (default), en, es. Persistido em localStorage.cn_lang.
// Uso em HTML:    <span data-i18n="nav.signin">Entrar</span>
// Uso em atributo: <input data-i18n-attr="placeholder:hero.search_ph">
// Uso em JS:      t('nav.signin')  /  t('hero.meta_clubs', {count: 12})
(function () {
    const STORAGE_KEY = 'cn_lang';
    const DEFAULT_LANG = 'pt';
    // Reusa o mesmo CDN das seleções da Copa (flagcdn.com) — bandeiras PNG
    // de verdade, com srcset 1x/2x/3x pra ficar nítido em retina.
    const LANGS = {
        pt: { code: 'pt', label: 'Português', short: 'PT', country: 'Brasil',  iso: 'br' },
        en: { code: 'en', label: 'English',   short: 'EN', country: 'USA',     iso: 'us' },
        es: { code: 'es', label: 'Español',   short: 'ES', country: 'España',  iso: 'es' },
    };

    function langFlag(lang) {
        const l = LANGS[lang];
        const srcset = `https://flagcdn.com/w80/${l.iso}.png 1x, https://flagcdn.com/w160/${l.iso}.png 2x, https://flagcdn.com/w320/${l.iso}.png 3x`;
        return `<img class="cn-lang-flag" src="https://flagcdn.com/w80/${l.iso}.png" srcset="${srcset}" alt="${l.country}" loading="lazy">`;
    }

    const T = {
        pt: {
            // ====== NAV / SHARED ======
            'nav.signin': 'Entrar',
            'nav.signup': 'Criar conta',
            'nav.signout': 'Sair',
            'nav.have_account': 'Já tenho conta',
            'lang.label': 'Idioma',

            // ====== LANDING ======
            'meta.title': 'Cadeira Numerada — Diário do Torcedor',
            'landing.brand.mark': '· Est. 2026',
            'landing.hero.eyebrow': 'cadeiranumerada.com.br · Diário do Torcedor',
            'landing.hero.h1_html': 'O jogo acaba.<br>A <em>memória</em> fica <span class="underline">guardada</span>.',
            'landing.hero.lede': 'Um caderno pessoal dos jogos que você foi ao estádio. Marque a presença, registre o setor, anote o que viveu. Seu retrospecto, seu museu, seu time — do jeito que você construiu.',
            'landing.hero.cta_primary': 'Abrir meu diário',
            'landing.hero.meta_clubs': 'clubes',
            'landing.hero.meta_copa': 'Copa 2026',
            'landing.hero.meta_copa_sub': 'incluída',
            'landing.hero.meta_free': 'Grátis',
            'landing.hero.meta_free_sub': 'pra sempre',

            'landing.stats.games': 'Jogos já catalogados',
            'landing.stats.games_value': '124+',
            'landing.stats.clubs_value': '14',
            'landing.stats.clubs': 'Clubes no catálogo',
            'landing.stats.museum_html': '<em>1</em> museu',
            'landing.stats.museum_label': 'Por torcedor · personalizado',

            'landing.how.eyebrow': 'Como funciona',
            'landing.how.h2_html': 'Três passos.<br>Uma <em>vida inteira</em> de jogos.',
            'landing.how.aside': 'Sem planilha, sem caderno úmido. Suas idas ao estádio organizadas num lugar só, pra você revisitar quando quiser.',
            'landing.how.s1.title': 'Crie sua conta.',
            'landing.how.s1.desc': 'Email, senha e o time que você torce. Leva 20 segundos e já mostra o catálogo dos jogos dele.',
            'landing.how.s2.title': 'Marque os jogos que você foi.',
            'landing.how.s2.desc': 'Valor pago, setor, assento, observações. Cada presença vira um ingresso — e entra no seu retrospecto.',
            'landing.how.s3.title': 'Abra o diário quando quiser.',
            'landing.how.s3.desc': 'Aproveitamento, rival que mais te derrotou, quanto você gastou. E cada jogo guardado como memória.',

            'landing.feat.eyebrow': 'Mais que um caderno',
            'landing.feat.h2_html': 'Tudo que <em>cabe</em> num diário de torcedor.',
            'landing.feat.copa.tag': 'Copa do Mundo 2026',
            'landing.feat.copa.title': 'Catálogo da Copa, do primeiro jogo à final.',
            'landing.feat.copa.desc': 'Vai pra um jogo da Copa nos EUA, México ou Canadá? Marque presença, guarde o ingresso e veja o seu mundial — independente do clube que você torce.',
            'landing.feat.ach.tag': 'Conquistas',
            'landing.feat.ach.title': 'Cada marco virou um troféu.',
            'landing.feat.ach.desc': 'Primeiro clássico, primeira final, mil reais gastos, dez vitórias seguidas. O sistema desbloqueia conquistas conforme seu retrospecto cresce.',
            'landing.feat.friends.tag': 'Amigos',
            'landing.feat.friends.title': 'Quem foi com você no estádio.',
            'landing.feat.friends.desc': 'Adicione torcedores pelo @username, marque companhia em cada jogo, descubra quais foram os jogos que vocês viveram juntos.',
            'landing.feat.card.tag': 'Carteirinha',
            'landing.feat.card.title': 'Sua identidade de torcedor.',
            'landing.feat.card.desc': 'Uma credencial digital com o seu time, total de jogos, aproveitamento e desde quando você está catalogando — pronta pra compartilhar.',
            'landing.feat.spend.tag': 'Gastos',
            'landing.feat.spend.title': 'Quanto cada vitória te custou.',
            'landing.feat.spend.desc': 'Soma do que você pagou, média por jogo, jogo mais caro, ano mais caro. O carinho pelo time também tem extrato.',
            'landing.feat.stats.tag': 'Retrospecto',
            'landing.feat.stats.title': 'Aproveitamento por rival, por estádio, por setor.',
            'landing.feat.stats.desc': 'Quem mais te derrotou, qual setor te deu mais vitória, qual ano foi o melhor do seu retrospecto pessoal. Tudo cruzado num lugar só.',

            'landing.museum.eyebrow': 'O museu',
            'landing.museum.h2_html': 'Cada jogo vira um <em>ingresso de verdade</em>.',
            'landing.museum.desc': 'Papel amarelado, canhoto picotado, placar em fonte de estádio. Sua coleção vai crescendo jogo a jogo — e você pode revisitar cada um com detalhes, gols e o que você anotou.',
            'landing.museum.cta': 'Começar minha coleção',

            'landing.clubs.eyebrow': 'Catálogo pronto',
            'landing.clubs.h2': 'Pro seu time, o catálogo já está lá.',
            'landing.clubs.desc': '14 clubes (Brasil + Argentina) com os jogos pré-cadastrados. Você só marca a presença.',

            'landing.final.h2_html': 'Seu próximo jogo ainda<br>não <em>aconteceu</em>.',
            'landing.final.lede': 'Mas os que já aconteceram merecem um lugar pra viver.',
            'landing.footer': 'Cadeira Numerada · cadeiranumerada.com.br · © 2026',

            // ====== AUTH (login/signup) ======
            'auth.tagline': 'Diário do Torcedor',
            'auth.login.title_pre': 'Bem-vindo de ',
            'auth.login.title_em': 'volta',
            'auth.login.title_post': '.',
            'auth.login.email': 'Email',
            'auth.login.password': 'Senha',
            'auth.login.btn': 'Entrar',
            'auth.login.btn_loading': 'Entrando...',
            'auth.login.no_account': 'Não tem conta?',
            'auth.login.create': 'Criar conta',
            'auth.login.err_invalid': 'Email ou senha incorretos',
            'auth.login.err_generic': 'Erro ao entrar',
            'auth.divider': 'ou',
            'auth.google.continue': 'Continuar com Google',
            'auth.google.err_invalid': 'Não foi possível autenticar com o Google. Tente de novo.',
            'auth.google.err_email': 'Sua conta Google precisa ter o email verificado.',

            'auth.signup.title_pre': 'Abrir o ',
            'auth.signup.title_em': 'diário',
            'auth.signup.title_post': '.',
            'auth.signup.name': 'Como te chamamos?',
            'auth.signup.username': 'Username',
            'auth.signup.username_ph': 'ex: guizaguini ou gui_zaguini',
            'auth.signup.username_hint': '3 a 30 caracteres · letras, números, ponto (.) ou underline (_) — sem espaços nem acentos',
            'auth.signup.email': 'Email',
            'auth.signup.password': 'Senha',
            'auth.signup.password_hint': '(mínimo 8 caracteres)',
            'auth.signup.password_confirm': 'Confirme a senha',
            'auth.signup.club': 'Pra qual time você torce?',
            'auth.signup.club_none': '— Prefiro não escolher agora —',
            'auth.signup.club_hint': 'Dá pra trocar depois. Seu time define o tema visual e o catálogo de jogos.',
            'auth.signup.btn': 'Criar conta',
            'auth.signup.btn_loading': 'Criando...',
            'auth.signup.has_account': 'Já tem conta?',
            'auth.signup.signin': 'Entrar',
            'auth.signup.required': '*',
            'auth.signup.err_username_invalid': 'Username inválido — use 3 a 30 caracteres (letras, números, . ou _)',
            'auth.signup.err_password_mismatch': 'As senhas não conferem.',
            'auth.signup.err_username_format': 'Use só letras, números, ponto (.) ou underline (_), 3 a 30 caracteres',
            'auth.signup.err_password_match': 'As senhas não conferem',
            'auth.signup.err_email_taken': 'Esse email já tem conta',
            'auth.signup.err_username_taken': 'Esse @username já está em uso, tenta outro',
            'auth.signup.err_validation': 'Confere os campos — senha 8+ chars, username 3-30 (letras/números/_/.)',
            'auth.signup.err_club': 'Clube inválido',
            'auth.signup.err_generic': 'Erro ao criar conta',

            // ====== APP — HEADER / NAV ======
            'app.brand': 'Cadeira Numerada',
            'app.tagline': 'Diário do Torcedor',
            'app.greeting': 'Olá',
            'app.admin': 'Admin',
            'app.profile': 'Perfil',

            // ====== APP — TABS ======
            'app.tab.catalog': 'Catálogo',
            'app.tab.mine': 'Meus ingressos',
            'app.tab.museum': 'Museu',
            'app.tab.copa': 'Copa do Mundo',
            'app.tab.friends': 'Amigos',
            'app.tab.feed': 'Feed',
            'app.tab.achievements': 'Conquistas',
            'app.tab.card': 'Carteirinha',

            // ====== APP — KPIs ======
            'app.kpi.games': 'Jogos',
            'app.kpi.wins': 'Vitórias',
            'app.kpi.draws': 'Empates',
            'app.kpi.losses': 'Derrotas',
            'app.kpi.win_rate': 'Aproveitamento',
            'app.kpi.spent': 'Gasto',
            'app.kpi.no_data': 'Marca seu primeiro jogo pra ver suas estatísticas aqui.',

            // ====== APP — COMMON ======
            'app.empty.no_club_catalog': 'Escolhe seu time no Perfil pra ver o catálogo de jogos.',
            'app.empty.no_club_mine': 'Seus ingressos aparecem aqui depois que você escolher um time.',
            'app.empty.no_games': 'Nenhum jogo encontrado.',
            'app.empty.no_mine': 'Você ainda não marcou presença em nenhum jogo.',
            'app.btn.save': 'Salvar',
            'app.btn.cancel': 'Cancelar',
            'app.btn.confirm': 'Confirmar',
            'app.btn.delete': 'Excluir',
            'app.btn.edit': 'Editar',
            'app.btn.close': 'Fechar',
            'app.btn.share': 'Compartilhar',
            'app.btn.add_friend': 'Adicionar amigo',
            'app.btn.mark_attended': 'Fui',
            'app.btn.mark_skip': 'Não fui',
            'app.btn.update': 'Atualizar',
            'app.btn.go_back': 'Voltar',
            'app.error.load': 'Erro ao carregar',
            'app.error.save': 'Erro ao salvar',
            'app.error.network': 'Erro de rede — tenta de novo',
            // Welcome modal (1ª vez via Google sem clube)
            'welcome.eyebrow': 'Boas-vindas',
            'welcome.title': 'Escolha seu time do coração',
            'welcome.subtitle': 'Pra começar, conta pra gente pra qual time você torce.',
            'welcome.info_title': 'O que muda quando você escolhe um time?',
            'welcome.info_b1': 'O app fica nas <b>cores do seu clube</b> automaticamente.',
            'welcome.info_b2': 'Aparece o <b>catálogo completo</b> de jogos do seu time, históricos e atuais — você marca quais foi.',
            'welcome.info_b3': 'Desbloqueia <b>conquistas</b> conforme acumula presenças, vitórias e clássicos.',
            'welcome.info_b4': 'Estatísticas pessoais: aproveitamento, retrospecto contra cada adversário, etc.',
            'welcome.info_b5': 'Adicione <b>amigos</b>, veja a <b>coleção de jogos</b> deles, compare conquistas e o retrospecto de quem foi mais ao estádio.',
            'welcome.club_label': 'Pra qual time você torce?',
            'welcome.club_placeholder': '— Selecione seu time —',
            'welcome.btn_skip': 'Pular por enquanto',
            'welcome.btn_save': 'Confirmar',
            'welcome.skip_hint': 'Você pode escolher depois no Perfil.',
            // Bell — items de notificação
            'bell.welcome.eyebrow': 'Boas-vindas',
            'bell.welcome.title': 'Bem-vindo ao Cadeira Numerada!',
            'bell.welcome.desc': 'Toque pra escolher seu time e personalizar o app.',
            'bell.system.eyebrow': 'Aviso',
            // Álbum da Copa 2026
            'app.album.entry_title': 'Meu álbum da Copa',
            'app.album.entry_sub': 'Marque os cromos que tem · veja repetidos · troque com amigos',
            'app.album.back': 'Voltar à Copa',
            'app.album.eyebrow': 'FIFA World Cup 2026 · Álbum',
            'app.album.title': 'Meu álbum da Copa',
            'app.album.subtitle': 'Marque os cromos que você tem. Veja faltantes e repetidos pra trocar com a galera.',
            'app.album.progress': 'Progresso',
            'app.album.tenho': 'Tenho',
            'app.album.faltam': 'Faltam',
            'app.album.repetidos': 'Repetidos',
            'app.album.share': 'Compartilhar minha lista de troca',
            'app.album.search_ph': 'Buscar seleção ou cromo...',
            'app.album.filter_all': 'Todos',
            'app.album.filter_faltam': 'Faltam',
            'app.album.filter_tenho': 'Tenho',
            'app.album.filter_repetidos': 'Repetidos',
            'app.album.loading': 'Carregando álbum...',
            'app.album.empty_filter': 'Nenhum cromo com esses filtros.',
            'app.album.share_title': 'Lista pra trocar',
            'app.album.share_meta': 'Cole esse link onde quiser. Quem abrir vê seus faltantes e repetidos pra fechar a troca.',
            'app.album.share_link_label': 'Link público da sua lista',
            'app.album.share_text_label': 'Texto pronto pra colar (WhatsApp, etc)',
            'app.album.share_copy_text': 'Copiar texto',
            'app.album.share_need_username': 'Defina um @username em Perfil pra compartilhar.',
            'app.album.copied': 'Copiado',
            'app.album.share_text_header': '🎴 Meu álbum da Copa 2026',
            'app.album.share_text_falta': '📋 Faltam',
            'app.album.share_text_rep': '🔄 Repetidas',
            'app.album.share_text_cta': '🤝 Bora trocar?',
            'app.album.grupo': 'Grupo',
            'app.album.grupo_special': 'Especiais',
            // Compare modal
            'app.album.compare_eyebrow': 'Comparação de álbuns',
            'app.album.compare_you': 'Você',
            'app.album.compare_trades': 'trocas possíveis',
            'app.album.compare_tab_get': 'Ele me dá',
            'app.album.compare_tab_give': 'Eu dou',
            'app.album.compare_tab_both_miss': 'Faltam pros 2',
            'app.album.compare_empty_get': 'Ele não tem nenhum repetido que você precisa.',
            'app.album.compare_empty_give': 'Você não tem repetidos que ele precise.',
            'app.album.compare_empty_both': 'Vocês 2 já completaram tudo!',
            'app.btn.copy': 'Copiar',

            // ====== APP — MODAL: PERFIL ======
            'app.profile.title': 'Editar perfil',
            'app.profile.desc': 'Atualize seu nome e o time que você torce.',
            'app.profile.name': 'Nome',
            'app.profile.club': 'Time',
            'app.profile.club_none': '— Sem time —',
            'app.profile.delete': 'Excluir minha conta',
            'app.profile.delete_confirm': 'Excluir minha conta',
            'app.profile.delete_warning': 'Essa ação é irreversível. Todos os seus jogos, conquistas e amigos serão removidos.',

            // ====== APP — INGRESSO MODAL ======
            'app.ticket.title': 'Detalhes do ingresso',
            'app.ticket.value': 'Valor pago',
            'app.ticket.sector': 'Setor / Arquibancada',
            'app.ticket.seat': 'Assento',
            'app.ticket.notes': 'Observações',
            'app.ticket.companions': 'Quem foi com você',
            'app.ticket.attended': 'Fui',
            'app.ticket.not_attended': 'Não fui',

            // ====== APP — COPA DO MUNDO ======
            'app.copa.title': 'Copa do Mundo 2026',
            'app.copa.subtitle': 'EUA · México · Canadá',
            'app.copa.bolao_title': 'Bolão da Copa',
            'app.copa.bolao_sub': 'Faça suas previsões e dispute com os amigos',
            'app.copa.bolao_back': 'Voltar pra Copa',

            // ====== APP — AMIGOS ======
            'app.friends.title': 'Amigos',
            'app.friends.add_ph': '@username',
            'app.friends.invite_share': 'Me adiciona como amigo no Cadeira Numerada',
            'app.friends.pending_in': 'Pedidos recebidos',
            'app.friends.pending_out': 'Pedidos enviados',
            'app.friends.accept': 'Aceitar',
            'app.friends.reject': 'Recusar',
            'app.friends.remove': 'Remover',

            // ====== APP — CONQUISTAS ======
            'app.ach.title': 'Conquistas',
            'app.ach.locked': 'Bloqueada',
            'app.ach.unlocked': 'Desbloqueada',
            'app.ach.toast_unlocked': 'Conquista desbloqueada!',
            'app.ach.progress': 'Progresso',

            // ====== APP — COPA HEADER ======
            'app.copa.header_eyebrow': 'FIFA World Cup · 16 sedes',
            'app.copa.header_title': 'Copa do Mundo 2026',
            'app.copa.header_subtitle': 'Canadá · México · Estados Unidos. Marque seus jogos com "EU VOU" antes, e confirme presença depois que a bola rolar.',

            // ====== APP — BOLÃO ======
            'app.bolao.entry_title': 'Bolão da Copa',
            'app.bolao.entry_sub': 'Palpite os jogos · dispute o ranking · ganhe pontos por acerto',
            'app.bolao.back': 'Voltar à Copa',
            'app.bolao.hero_eyebrow': 'FIFA WORLD CUP 2026 · BOLÃO',
            'app.bolao.hero_title_html': 'Palpite. Pontue. <em>Vença.</em>',
            'app.bolao.hero_sub': 'Entre num bolão pelo código do convite e palpite cada jogo da Copa. Acerte o placar e suba no ranking.',
            'app.bolao.stat_my': 'Bolões que estou',
            'app.bolao.stat_palpites': 'Palpites feitos',
            'app.bolao.stat_proximo': 'Próximo jogo',
            'app.bolao.join_eyebrow': 'Tem um convite?',
            'app.bolao.join_label': 'Cole o código aqui',
            'app.bolao.join_placeholder': 'Ex: A3F7B9C2E1',
            'app.bolao.join_btn': 'Entrar',
            'app.bolao.join_btn_loading': 'Entrando...',
            'app.bolao.join_err_invalid': 'Digite um código válido.',
            'app.bolao.join_err_not_found': 'Código inválido. Verifique e tente de novo.',
            'app.bolao.join_err_member': 'Você já está nesse bolão.',
            'app.bolao.publicos_title': 'Bolões abertos',
            'app.bolao.publicos_sub': 'Entre direto, sem precisar de código',
            'app.bolao.meus_title': 'Meus bolões',
            'app.bolao.create_btn': 'Criar bolão',
            'app.bolao.create_btn_locked_title': 'Em breve',
            'app.bolao.loading_boloes': 'Carregando bolões...',
            'app.bolao.loading_jogos': 'Carregando jogos...',
            'app.bolao.loading': 'Carregando...',
            'app.bolao.detail_members_suffix': 'membros',
            'app.bolao.detail_code_label': 'Código',
            'app.bolao.detail_copy_title': 'Copiar',
            'app.bolao.detail_my_points': 'Meus pontos',
            'app.bolao.detail_leave': 'Sair do bolão',
            'app.bolao.detail_leave_title': 'Sair desse bolão',
            'app.bolao.detail_delete': 'Excluir bolão',
            'app.bolao.detail_delete_title': 'Excluir esse bolão permanentemente',
            'app.bolao.detail_ranking_toggle': 'Ranking',
            'app.bolao.jogos_title': 'Jogos da Copa',
            'app.bolao.jogos_stats': '{count} palpites',
            'app.bolao.jogos_stats_filtered': '{shown} de {total} jogos · {palpitados} palpitados',
            'app.bolao.jogos_filter_search_ph': 'Buscar seleção (ex: Brasil, Argentina)...',
            'app.bolao.jogos_filter_grupos': 'Todos os grupos',
            'app.bolao.jogos_fase_todas': 'Todas',
            'app.bolao.jogos_fase_grupos': 'Grupos',
            'app.bolao.jogos_fase_r32': 'Round of 32',
            'app.bolao.jogos_fase_oitavas': 'Oitavas',
            'app.bolao.jogos_fase_quartas': 'Quartas',
            'app.bolao.jogos_fase_semis': 'Semis',
            'app.bolao.jogos_fase_terceiro': '3º lugar',
            'app.bolao.jogos_fase_final': 'Final',
            'app.bolao.jogos_empty': 'Nenhum jogo encontrado com esses filtros.',
            'app.bolao.jogos_clear_filters': 'Limpar filtros',
            'app.bolao.ranking_title': 'Ranking',
            'app.bolao.regras_title': 'Como pontua',
            'app.bolao.regras_exato': 'Placar exato',
            'app.bolao.regras_saldo': 'Vencedor + saldo',
            'app.bolao.regras_vencedor': 'Só vencedor',
            'app.bolao.regras_empate': 'Empate correto',
            'app.bolao.regras_pts': 'pts',
            'app.bolao.card_progress_label': 'Seus palpites',
            'app.bolao.card_pos_title': 'Sua posição no ranking',
            'app.bolao.create_modal_title': 'Criar bolão',
            'app.bolao.create_modal_meta': 'Dê um nome e (opcional) uma descrição. O código do convite é gerado automaticamente.',
            'app.bolao.create_name_label': 'Nome do bolão',
            'app.bolao.create_name_ph': 'Ex: Bolão da Fiel · Copa 2026',
            'app.bolao.create_desc_label': 'Descrição (opcional)',
            'app.bolao.create_desc_ph': 'Regras especiais, prêmio, qualquer coisa...',
            'app.bolao.create_save': 'Criar',
            'app.bolao.created_title': 'Bolão criado!',
            'app.bolao.created_meta': 'Compartilhe o código de convite pra galera entrar:',
            'app.bolao.created_code_label': 'Código de convite',
            'app.bolao.created_copy': 'Copiar código',
            'app.bolao.created_open': 'Abrir bolão',
            'app.bolao.leave_confirm': 'Sair do bolão "{title}"?\n\nSeus palpites serão removidos. Pra voltar, você precisa do código de convite.',
        },

        en: {
            'nav.signin': 'Sign in',
            'nav.signup': 'Sign up',
            'nav.signout': 'Sign out',
            'nav.have_account': 'I have an account',
            'lang.label': 'Language',

            'meta.title': 'Cadeira Numerada — Fan Diary',
            'landing.brand.mark': '· Est. 2026',
            'landing.hero.eyebrow': 'cadeiranumerada.com.br · Fan Diary',
            'landing.hero.h1_html': 'The match ends.<br>The <em>memory</em> stays <span class="underline">with you</span>.',
            'landing.hero.lede': 'A personal notebook of every match you went to. Mark your attendance, log the section, write down what you lived. Your record, your museum, your club — built your way.',
            'landing.hero.cta_primary': 'Open my diary',
            'landing.hero.meta_clubs': 'clubs',
            'landing.hero.meta_copa': 'World Cup 2026',
            'landing.hero.meta_copa_sub': 'included',
            'landing.hero.meta_free': 'Free',
            'landing.hero.meta_free_sub': 'forever',

            'landing.stats.games_value': '124+',
            'landing.stats.games': 'Matches catalogued',
            'landing.stats.clubs_value': '14',
            'landing.stats.clubs': 'Clubs in the catalogue',
            'landing.stats.museum_html': '<em>1</em> museum',
            'landing.stats.museum_label': 'Per fan · personalised',

            'landing.how.eyebrow': 'How it works',
            'landing.how.h2_html': 'Three steps.<br>A <em>lifetime</em> of matches.',
            'landing.how.aside': 'No spreadsheets, no soggy notebook. Your trips to the stadium organised in one place to revisit whenever you want.',
            'landing.how.s1.title': 'Create your account.',
            'landing.how.s1.desc': 'Email, password, the club you support. 20 seconds and the match catalogue is right there.',
            'landing.how.s2.title': 'Mark the matches you went to.',
            'landing.how.s2.desc': 'Price, section, seat, notes. Every attendance becomes a ticket — and feeds your personal record.',
            'landing.how.s3.title': 'Open the diary anytime.',
            'landing.how.s3.desc': 'Win rate, the rival who beat you most, total spent. And every match kept as memory.',

            'landing.feat.eyebrow': 'More than a notebook',
            'landing.feat.h2_html': 'Everything that <em>fits</em> in a fan diary.',
            'landing.feat.copa.tag': 'World Cup 2026',
            'landing.feat.copa.title': 'World Cup catalogue, from opener to final.',
            'landing.feat.copa.desc': 'Heading to a World Cup match in the US, Mexico or Canada? Mark attendance, keep the ticket and watch your tournament unfold — no matter the club you support.',
            'landing.feat.ach.tag': 'Achievements',
            'landing.feat.ach.title': 'Every milestone becomes a trophy.',
            'landing.feat.ach.desc': 'First derby, first final, a thousand spent, ten wins in a row. The system unlocks achievements as your record grows.',
            'landing.feat.friends.tag': 'Friends',
            'landing.feat.friends.title': 'Who was with you at the stadium.',
            'landing.feat.friends.desc': 'Add fans by @username, tag company on every match, discover the matches you lived together.',
            'landing.feat.card.tag': 'Member card',
            'landing.feat.card.title': 'Your fan ID.',
            'landing.feat.card.desc': 'A digital credential with your club, total matches, win rate and how long you have been logging — ready to share.',
            'landing.feat.spend.tag': 'Spending',
            'landing.feat.spend.title': 'How much each win cost you.',
            'landing.feat.spend.desc': 'Total spent, average per match, most expensive match, most expensive year. Loving your club has a statement too.',
            'landing.feat.stats.tag': 'Record',
            'landing.feat.stats.title': 'Win rate by rival, stadium, section.',
            'landing.feat.stats.desc': 'Who beat you most, the section that gave you the most wins, your best year. All cross-referenced in one place.',

            'landing.museum.eyebrow': 'The museum',
            'landing.museum.h2_html': 'Every match becomes a <em>real ticket</em>.',
            'landing.museum.desc': 'Yellowed paper, perforated stub, scoreboard typeface. Your collection grows match by match — and you can revisit each one with details, goals and what you wrote down.',
            'landing.museum.cta': 'Start my collection',

            'landing.clubs.eyebrow': 'Catalogue ready',
            'landing.clubs.h2': 'For your club, the catalogue is already there.',
            'landing.clubs.desc': '14 clubs (Brazil + Argentina) with matches pre-loaded. You just mark attendance.',

            'landing.final.h2_html': 'Your next match has<br>not <em>happened</em> yet.',
            'landing.final.lede': 'But the ones that already did deserve a place to live.',
            'landing.footer': 'Cadeira Numerada · cadeiranumerada.com.br · © 2026',

            'auth.tagline': 'Fan Diary',
            'auth.login.title_pre': 'Welcome ',
            'auth.login.title_em': 'back',
            'auth.login.title_post': '.',
            'auth.login.email': 'Email',
            'auth.login.password': 'Password',
            'auth.login.btn': 'Sign in',
            'auth.login.btn_loading': 'Signing in...',
            'auth.login.no_account': 'No account?',
            'auth.login.create': 'Create account',
            'auth.login.err_invalid': 'Wrong email or password',
            'auth.login.err_generic': 'Sign in error',
            'auth.divider': 'or',
            'auth.google.continue': 'Continue with Google',
            'auth.google.err_invalid': 'Could not authenticate with Google. Please try again.',
            'auth.google.err_email': 'Your Google account must have a verified email.',

            'auth.signup.title_pre': 'Open the ',
            'auth.signup.title_em': 'diary',
            'auth.signup.title_post': '.',
            'auth.signup.name': 'What should we call you?',
            'auth.signup.username': 'Username',
            'auth.signup.username_ph': 'e.g. guizaguini or gui_zaguini',
            'auth.signup.username_hint': '3 to 30 characters · letters, numbers, dot (.) or underscore (_) — no spaces or accents',
            'auth.signup.email': 'Email',
            'auth.signup.password': 'Password',
            'auth.signup.password_hint': '(minimum 8 characters)',
            'auth.signup.password_confirm': 'Confirm password',
            'auth.signup.club': 'Which club do you support?',
            'auth.signup.club_none': '— I rather not pick now —',
            'auth.signup.club_hint': 'You can change it later. Your club drives the visual theme and match catalogue.',
            'auth.signup.btn': 'Create account',
            'auth.signup.btn_loading': 'Creating...',
            'auth.signup.has_account': 'Already have an account?',
            'auth.signup.signin': 'Sign in',
            'auth.signup.required': '*',
            'auth.signup.err_username_invalid': 'Invalid username — use 3 to 30 characters (letters, numbers, . or _)',
            'auth.signup.err_password_mismatch': 'Passwords do not match.',
            'auth.signup.err_username_format': 'Use only letters, numbers, dot (.) or underscore (_), 3 to 30 characters',
            'auth.signup.err_password_match': 'Passwords do not match',
            'auth.signup.err_email_taken': 'That email already has an account',
            'auth.signup.err_username_taken': 'That @username is taken, try another',
            'auth.signup.err_validation': 'Check the fields — password 8+ chars, username 3-30 (letters/numbers/_/.)',
            'auth.signup.err_club': 'Invalid club',
            'auth.signup.err_generic': 'Error creating account',

            'app.brand': 'Cadeira Numerada',
            'app.tagline': 'Fan Diary',
            'app.greeting': 'Hi',
            'app.admin': 'Admin',
            'app.profile': 'Profile',

            'app.tab.catalog': 'Catalogue',
            'app.tab.mine': 'My tickets',
            'app.tab.museum': 'Museum',
            'app.tab.copa': 'World Cup',
            'app.tab.friends': 'Friends',
            'app.tab.feed': 'Feed',
            'app.tab.achievements': 'Achievements',
            'app.tab.card': 'Member card',

            'app.kpi.games': 'Matches',
            'app.kpi.wins': 'Wins',
            'app.kpi.draws': 'Draws',
            'app.kpi.losses': 'Losses',
            'app.kpi.win_rate': 'Win rate',
            'app.kpi.spent': 'Spent',
            'app.kpi.no_data': 'Mark your first match to see your stats here.',

            'app.empty.no_club_catalog': 'Pick your club in Profile to see the match catalogue.',
            'app.empty.no_club_mine': 'Your tickets show up here once you pick a club.',
            'app.empty.no_games': 'No matches found.',
            'app.empty.no_mine': 'You have not marked attendance on any match yet.',
            'app.btn.save': 'Save',
            'app.btn.cancel': 'Cancel',
            'app.btn.confirm': 'Confirm',
            'app.btn.delete': 'Delete',
            'app.btn.edit': 'Edit',
            'app.btn.close': 'Close',
            'app.btn.share': 'Share',
            'app.btn.add_friend': 'Add friend',
            'app.btn.mark_attended': 'I went',
            'app.btn.mark_skip': 'Did not go',
            'app.btn.update': 'Update',
            'app.btn.go_back': 'Back',
            'app.error.load': 'Failed to load',
            'app.error.save': 'Failed to save',
            'app.error.network': 'Network error — try again',
            // Welcome modal (1st time via Google with no club)
            'welcome.eyebrow': 'Welcome',
            'welcome.title': 'Pick your favorite club',
            'welcome.subtitle': 'To get started, tell us which team you support.',
            'welcome.info_title': 'What changes when you pick a club?',
            'welcome.info_b1': 'The app switches to your <b>club\'s colors</b> automatically.',
            'welcome.info_b2': 'You see the <b>full match catalogue</b> of your club, past and present — mark which ones you attended.',
            'welcome.info_b3': 'You unlock <b>achievements</b> as you log attendances, wins, derbies and more.',
            'welcome.info_b4': 'Personal stats: win rate, head-to-head against each rival, etc.',
            'welcome.info_b5': 'Add <b>friends</b>, see their <b>match collection</b>, compare achievements and who has been to the stadium more.',
            'welcome.club_label': 'Which club do you support?',
            'welcome.club_placeholder': '— Select your club —',
            'welcome.btn_skip': 'Skip for now',
            'welcome.btn_save': 'Confirm',
            'welcome.skip_hint': 'You can pick later in Profile.',
            // Bell — notification items
            'bell.welcome.eyebrow': 'Welcome',
            'bell.welcome.title': 'Welcome to Cadeira Numerada!',
            'bell.welcome.desc': 'Tap to pick your club and personalize the app.',
            'bell.system.eyebrow': 'Notice',
            // Album of World Cup 2026
            'app.album.entry_title': 'My World Cup album',
            'app.album.entry_sub': 'Track your stickers · spot duplicates · trade with friends',
            'app.album.back': 'Back to World Cup',
            'app.album.eyebrow': 'FIFA World Cup 2026 · Album',
            'app.album.title': 'My World Cup album',
            'app.album.subtitle': 'Mark which stickers you have. See missing and duplicate ones to trade.',
            'app.album.progress': 'Progress',
            'app.album.tenho': 'Have',
            'app.album.faltam': 'Missing',
            'app.album.repetidos': 'Duplicates',
            'app.album.share': 'Share my trade list',
            'app.album.search_ph': 'Search team or sticker...',
            'app.album.filter_all': 'All',
            'app.album.filter_faltam': 'Missing',
            'app.album.filter_tenho': 'Have',
            'app.album.filter_repetidos': 'Duplicates',
            'app.album.loading': 'Loading album...',
            'app.album.empty_filter': 'No stickers match these filters.',
            'app.album.share_title': 'Trade list',
            'app.album.share_meta': 'Share this link anywhere. People who open it see what you need and what you have to trade.',
            'app.album.share_link_label': 'Public link to your list',
            'app.album.share_text_label': 'Ready-to-paste text (WhatsApp, etc)',
            'app.album.share_copy_text': 'Copy text',
            'app.album.share_need_username': 'Set a @username in Profile to share.',
            'app.album.copied': 'Copied',
            'app.album.share_text_header': '🎴 My World Cup 2026 album',
            'app.album.share_text_falta': '📋 Missing',
            'app.album.share_text_rep': '🔄 Duplicates',
            'app.album.share_text_cta': '🤝 Wanna trade?',
            'app.album.grupo': 'Group',
            'app.album.grupo_special': 'Specials',
            // Compare modal
            'app.album.compare_eyebrow': 'Album comparison',
            'app.album.compare_you': 'You',
            'app.album.compare_trades': 'possible trades',
            'app.album.compare_tab_get': 'They give',
            'app.album.compare_tab_give': 'You give',
            'app.album.compare_tab_both_miss': 'Both missing',
            'app.album.compare_empty_get': 'They have no duplicates that you need.',
            'app.album.compare_empty_give': 'You have no duplicates they need.',
            'app.album.compare_empty_both': 'You both completed everything!',
            'app.btn.copy': 'Copy',

            'app.profile.title': 'Edit profile',
            'app.profile.desc': 'Update your name and the club you support.',
            'app.profile.name': 'Name',
            'app.profile.club': 'Club',
            'app.profile.club_none': '— No club —',
            'app.profile.delete': 'Delete my account',
            'app.profile.delete_confirm': 'Delete my account',
            'app.profile.delete_warning': 'This action cannot be undone. All your matches, achievements and friends will be removed.',

            'app.ticket.title': 'Ticket details',
            'app.ticket.value': 'Amount paid',
            'app.ticket.sector': 'Section / Stand',
            'app.ticket.seat': 'Seat',
            'app.ticket.notes': 'Notes',
            'app.ticket.companions': 'Who came with you',
            'app.ticket.attended': 'I went',
            'app.ticket.not_attended': 'Did not go',

            'app.copa.title': 'World Cup 2026',
            'app.copa.subtitle': 'USA · Mexico · Canada',
            'app.copa.bolao_title': 'World Cup pool',
            'app.copa.bolao_sub': 'Make your predictions and play with friends',
            'app.copa.bolao_back': 'Back to World Cup',

            'app.friends.title': 'Friends',
            'app.friends.add_ph': '@username',
            'app.friends.invite_share': 'Add me as a friend on Cadeira Numerada',
            'app.friends.pending_in': 'Incoming requests',
            'app.friends.pending_out': 'Outgoing requests',
            'app.friends.accept': 'Accept',
            'app.friends.reject': 'Decline',
            'app.friends.remove': 'Remove',

            'app.ach.title': 'Achievements',
            'app.ach.locked': 'Locked',
            'app.ach.unlocked': 'Unlocked',
            'app.ach.toast_unlocked': 'Achievement unlocked!',
            'app.ach.progress': 'Progress',

            'app.copa.header_eyebrow': 'FIFA World Cup · 16 host cities',
            'app.copa.header_title': 'World Cup 2026',
            'app.copa.header_subtitle': 'Canada · Mexico · United States. Mark your matches as "GOING" beforehand and confirm attendance once the ball rolls.',

            'app.bolao.entry_title': 'World Cup Pool',
            'app.bolao.entry_sub': 'Predict matches · climb the leaderboard · earn points for each correct call',
            'app.bolao.back': 'Back to World Cup',
            'app.bolao.hero_eyebrow': 'FIFA WORLD CUP 2026 · POOL',
            'app.bolao.hero_title_html': 'Predict. Score. <em>Win.</em>',
            'app.bolao.hero_sub': 'Join a pool with the invite code and predict every match of the World Cup. Nail the scoreline and climb the rankings.',
            'app.bolao.stat_my': 'My pools',
            'app.bolao.stat_palpites': 'Predictions made',
            'app.bolao.stat_proximo': 'Next match',
            'app.bolao.join_eyebrow': 'Got an invite?',
            'app.bolao.join_label': 'Paste the code here',
            'app.bolao.join_placeholder': 'e.g. A3F7B9C2E1',
            'app.bolao.join_btn': 'Join',
            'app.bolao.join_btn_loading': 'Joining...',
            'app.bolao.join_err_invalid': 'Enter a valid code.',
            'app.bolao.join_err_not_found': 'Invalid code. Double-check and try again.',
            'app.bolao.join_err_member': 'You are already in this pool.',
            'app.bolao.publicos_title': 'Open pools',
            'app.bolao.publicos_sub': 'Join straight away, no code needed',
            'app.bolao.meus_title': 'My pools',
            'app.bolao.create_btn': 'Create pool',
            'app.bolao.create_btn_locked_title': 'Coming soon',
            'app.bolao.loading_boloes': 'Loading pools...',
            'app.bolao.loading_jogos': 'Loading matches...',
            'app.bolao.loading': 'Loading...',
            'app.bolao.detail_members_suffix': 'members',
            'app.bolao.detail_code_label': 'Code',
            'app.bolao.detail_copy_title': 'Copy',
            'app.bolao.detail_my_points': 'My points',
            'app.bolao.detail_leave': 'Leave pool',
            'app.bolao.detail_leave_title': 'Leave this pool',
            'app.bolao.detail_delete': 'Delete pool',
            'app.bolao.detail_delete_title': 'Delete this pool permanently',
            'app.bolao.detail_ranking_toggle': 'Leaderboard',
            'app.bolao.jogos_title': 'World Cup matches',
            'app.bolao.jogos_stats': '{count} predictions',
            'app.bolao.jogos_stats_filtered': '{shown} of {total} matches · {palpitados} predicted',
            'app.bolao.jogos_filter_search_ph': 'Search team (e.g. Brazil, Argentina)...',
            'app.bolao.jogos_filter_grupos': 'All groups',
            'app.bolao.jogos_fase_todas': 'All',
            'app.bolao.jogos_fase_grupos': 'Groups',
            'app.bolao.jogos_fase_r32': 'Round of 32',
            'app.bolao.jogos_fase_oitavas': 'Round of 16',
            'app.bolao.jogos_fase_quartas': 'Quarterfinals',
            'app.bolao.jogos_fase_semis': 'Semifinals',
            'app.bolao.jogos_fase_terceiro': '3rd place',
            'app.bolao.jogos_fase_final': 'Final',
            'app.bolao.jogos_empty': 'No matches match these filters.',
            'app.bolao.jogos_clear_filters': 'Clear filters',
            'app.bolao.ranking_title': 'Leaderboard',
            'app.bolao.regras_title': 'How scoring works',
            'app.bolao.regras_exato': 'Exact score',
            'app.bolao.regras_saldo': 'Winner + goal difference',
            'app.bolao.regras_vencedor': 'Winner only',
            'app.bolao.regras_empate': 'Correct draw',
            'app.bolao.regras_pts': 'pts',
            'app.bolao.card_progress_label': 'Your predictions',
            'app.bolao.card_pos_title': 'Your leaderboard position',
            'app.bolao.create_modal_title': 'Create pool',
            'app.bolao.create_modal_meta': 'Give it a name and an (optional) description. The invite code is generated automatically.',
            'app.bolao.create_name_label': 'Pool name',
            'app.bolao.create_name_ph': 'e.g. Office Pool · Cup 2026',
            'app.bolao.create_desc_label': 'Description (optional)',
            'app.bolao.create_desc_ph': 'Special rules, prize, anything...',
            'app.bolao.create_save': 'Create',
            'app.bolao.created_title': 'Pool created!',
            'app.bolao.created_meta': 'Share the invite code so the crew can join:',
            'app.bolao.created_code_label': 'Invite code',
            'app.bolao.created_copy': 'Copy code',
            'app.bolao.created_open': 'Open pool',
            'app.bolao.leave_confirm': 'Leave pool "{title}"?\n\nYour predictions will be removed. To rejoin, you need the invite code.',
        },

        es: {
            'nav.signin': 'Entrar',
            'nav.signup': 'Crear cuenta',
            'nav.signout': 'Salir',
            'nav.have_account': 'Ya tengo cuenta',
            'lang.label': 'Idioma',

            'meta.title': 'Cadeira Numerada — Diario del Hincha',
            'landing.brand.mark': '· Est. 2026',
            'landing.hero.eyebrow': 'cadeiranumerada.com.br · Diario del Hincha',
            'landing.hero.h1_html': 'El partido termina.<br>La <em>memoria</em> queda <span class="underline">guardada</span>.',
            'landing.hero.lede': 'Un cuaderno personal de cada partido al que fuiste al estadio. Marcá la presencia, registrá el sector, anotá lo que viviste. Tu historial, tu museo, tu club — a tu manera.',
            'landing.hero.cta_primary': 'Abrir mi diario',
            'landing.hero.meta_clubs': 'clubes',
            'landing.hero.meta_copa': 'Copa 2026',
            'landing.hero.meta_copa_sub': 'incluida',
            'landing.hero.meta_free': 'Gratis',
            'landing.hero.meta_free_sub': 'para siempre',

            'landing.stats.games_value': '124+',
            'landing.stats.games': 'Partidos catalogados',
            'landing.stats.clubs_value': '14',
            'landing.stats.clubs': 'Clubes en el catálogo',
            'landing.stats.museum_html': '<em>1</em> museo',
            'landing.stats.museum_label': 'Por hincha · personalizado',

            'landing.how.eyebrow': 'Cómo funciona',
            'landing.how.h2_html': 'Tres pasos.<br>Una <em>vida entera</em> de partidos.',
            'landing.how.aside': 'Sin planillas, sin cuaderno mojado. Tus idas al estadio organizadas en un solo lugar, listas para volver cuando quieras.',
            'landing.how.s1.title': 'Creá tu cuenta.',
            'landing.how.s1.desc': 'Email, contraseña y el club que hinchás. Lleva 20 segundos y ya muestra el catálogo de sus partidos.',
            'landing.how.s2.title': 'Marcá los partidos a los que fuiste.',
            'landing.how.s2.desc': 'Precio, sector, asiento, observaciones. Cada presencia se vuelve un ticket — y entra en tu historial.',
            'landing.how.s3.title': 'Abrí el diario cuando quieras.',
            'landing.how.s3.desc': 'Rendimiento, rival que más te ganó, cuánto gastaste. Y cada partido guardado como memoria.',

            'landing.feat.eyebrow': 'Más que un cuaderno',
            'landing.feat.h2_html': 'Todo lo que <em>cabe</em> en un diario de hincha.',
            'landing.feat.copa.tag': 'Mundial 2026',
            'landing.feat.copa.title': 'Catálogo del Mundial, del primero a la final.',
            'landing.feat.copa.desc': '¿Vas a un partido del Mundial en EE.UU., México o Canadá? Marcá presencia, guardá el ticket y mirá tu Mundial — sin importar el club que hinchás.',
            'landing.feat.ach.tag': 'Logros',
            'landing.feat.ach.title': 'Cada hito se vuelve un trofeo.',
            'landing.feat.ach.desc': 'Primer clásico, primera final, mil pesos gastados, diez victorias seguidas. El sistema desbloquea logros mientras tu historial crece.',
            'landing.feat.friends.tag': 'Amigos',
            'landing.feat.friends.title': 'Quién fue contigo al estadio.',
            'landing.feat.friends.desc': 'Agregá hinchas por @username, marcá compañía en cada partido, descubrí los partidos que vivieron juntos.',
            'landing.feat.card.tag': 'Carnet',
            'landing.feat.card.title': 'Tu identidad de hincha.',
            'landing.feat.card.desc': 'Una credencial digital con tu club, total de partidos, rendimiento y desde cuándo estás cargando — lista para compartir.',
            'landing.feat.spend.tag': 'Gastos',
            'landing.feat.spend.title': 'Cuánto te costó cada victoria.',
            'landing.feat.spend.desc': 'Total gastado, promedio por partido, partido más caro, año más caro. El amor por el club también tiene resumen.',
            'landing.feat.stats.tag': 'Historial',
            'landing.feat.stats.title': 'Rendimiento por rival, estadio, sector.',
            'landing.feat.stats.desc': 'Quién más te ganó, qué sector te dio más victorias, cuál fue tu mejor año. Todo cruzado en un mismo lugar.',

            'landing.museum.eyebrow': 'El museo',
            'landing.museum.h2_html': 'Cada partido es un <em>ticket de verdad</em>.',
            'landing.museum.desc': 'Papel amarillento, talón picado, marcador en tipografía de estadio. Tu colección crece partido a partido — y podés volver a cada una con detalles, goles y lo que anotaste.',
            'landing.museum.cta': 'Empezar mi colección',

            'landing.clubs.eyebrow': 'Catálogo listo',
            'landing.clubs.h2': 'Para tu club, el catálogo ya está.',
            'landing.clubs.desc': '14 clubes (Brasil + Argentina) con los partidos pre-cargados. Vos solo marcás presencia.',

            'landing.final.h2_html': 'Tu próximo partido todavía<br>no <em>pasó</em>.',
            'landing.final.lede': 'Pero los que ya pasaron se merecen un lugar para vivir.',
            'landing.footer': 'Cadeira Numerada · cadeiranumerada.com.br · © 2026',

            'auth.tagline': 'Diario del Hincha',
            'auth.login.title_pre': 'Bienvenido de ',
            'auth.login.title_em': 'vuelta',
            'auth.login.title_post': '.',
            'auth.login.email': 'Email',
            'auth.login.password': 'Contraseña',
            'auth.login.btn': 'Entrar',
            'auth.login.btn_loading': 'Entrando...',
            'auth.login.no_account': '¿No tenés cuenta?',
            'auth.login.create': 'Crear cuenta',
            'auth.login.err_invalid': 'Email o contraseña incorrectos',
            'auth.login.err_generic': 'Error al entrar',
            'auth.divider': 'o',
            'auth.google.continue': 'Continuar con Google',
            'auth.google.err_invalid': 'No se pudo autenticar con Google. Probá de nuevo.',
            'auth.google.err_email': 'Tu cuenta de Google necesita tener el email verificado.',

            'auth.signup.title_pre': 'Abrir el ',
            'auth.signup.title_em': 'diario',
            'auth.signup.title_post': '.',
            'auth.signup.name': '¿Cómo te llamamos?',
            'auth.signup.username': 'Username',
            'auth.signup.username_ph': 'ej: guizaguini o gui_zaguini',
            'auth.signup.username_hint': '3 a 30 caracteres · letras, números, punto (.) o guión bajo (_) — sin espacios ni acentos',
            'auth.signup.email': 'Email',
            'auth.signup.password': 'Contraseña',
            'auth.signup.password_hint': '(mínimo 8 caracteres)',
            'auth.signup.password_confirm': 'Confirmá la contraseña',
            'auth.signup.club': '¿A qué club hinchás?',
            'auth.signup.club_none': '— Prefiero no elegir ahora —',
            'auth.signup.club_hint': 'Lo podés cambiar después. Tu club define el tema visual y el catálogo de partidos.',
            'auth.signup.btn': 'Crear cuenta',
            'auth.signup.btn_loading': 'Creando...',
            'auth.signup.has_account': '¿Ya tenés cuenta?',
            'auth.signup.signin': 'Entrar',
            'auth.signup.required': '*',
            'auth.signup.err_username_invalid': 'Username inválido — usá 3 a 30 caracteres (letras, números, . o _)',
            'auth.signup.err_password_mismatch': 'Las contraseñas no coinciden.',
            'auth.signup.err_username_format': 'Usá solo letras, números, punto (.) o guión bajo (_), 3 a 30 caracteres',
            'auth.signup.err_password_match': 'Las contraseñas no coinciden',
            'auth.signup.err_email_taken': 'Ese email ya tiene cuenta',
            'auth.signup.err_username_taken': 'Ese @username ya está en uso, probá otro',
            'auth.signup.err_validation': 'Revisá los campos — contraseña 8+ chars, username 3-30 (letras/números/_/.)',
            'auth.signup.err_club': 'Club inválido',
            'auth.signup.err_generic': 'Error al crear cuenta',

            'app.brand': 'Cadeira Numerada',
            'app.tagline': 'Diario del Hincha',
            'app.greeting': 'Hola',
            'app.admin': 'Admin',
            'app.profile': 'Perfil',

            'app.tab.catalog': 'Catálogo',
            'app.tab.mine': 'Mis tickets',
            'app.tab.museum': 'Museo',
            'app.tab.copa': 'Mundial',
            'app.tab.friends': 'Amigos',
            'app.tab.feed': 'Feed',
            'app.tab.achievements': 'Logros',
            'app.tab.card': 'Carnet',

            'app.kpi.games': 'Partidos',
            'app.kpi.wins': 'Victorias',
            'app.kpi.draws': 'Empates',
            'app.kpi.losses': 'Derrotas',
            'app.kpi.win_rate': 'Rendimiento',
            'app.kpi.spent': 'Gastado',
            'app.kpi.no_data': 'Marcá tu primer partido para ver tus estadísticas acá.',

            'app.empty.no_club_catalog': 'Elegí tu club en Perfil para ver el catálogo de partidos.',
            'app.empty.no_club_mine': 'Tus tickets aparecen acá cuando elijas un club.',
            'app.empty.no_games': 'No se encontraron partidos.',
            'app.empty.no_mine': 'Todavía no marcaste presencia en ningún partido.',
            'app.btn.save': 'Guardar',
            'app.btn.cancel': 'Cancelar',
            'app.btn.confirm': 'Confirmar',
            'app.btn.delete': 'Eliminar',
            'app.btn.edit': 'Editar',
            'app.btn.close': 'Cerrar',
            'app.btn.share': 'Compartir',
            'app.btn.add_friend': 'Agregar amigo',
            'app.btn.mark_attended': 'Fui',
            'app.btn.mark_skip': 'No fui',
            'app.btn.update': 'Actualizar',
            'app.btn.go_back': 'Volver',
            'app.error.load': 'Error al cargar',
            'app.error.save': 'Error al guardar',
            'app.error.network': 'Error de red — probá de nuevo',
            // Welcome modal (1ª vez via Google sin club)
            'welcome.eyebrow': 'Bienvenida',
            'welcome.title': 'Elegí tu club del corazón',
            'welcome.subtitle': 'Para empezar, contanos a qué equipo le hinchás.',
            'welcome.info_title': '¿Qué cambia cuando elegís un club?',
            'welcome.info_b1': 'La app pasa a usar los <b>colores de tu club</b> automáticamente.',
            'welcome.info_b2': 'Aparece el <b>catálogo completo</b> de partidos de tu club, históricos y actuales — marcás cuáles fuiste.',
            'welcome.info_b3': 'Desbloqueás <b>logros</b> a medida que sumás presencias, victorias y clásicos.',
            'welcome.info_b4': 'Estadísticas personales: rendimiento, historial contra cada rival, etc.',
            'welcome.info_b5': 'Agregá <b>amigos</b>, mirá su <b>colección de partidos</b>, compará logros y quién fue más a la cancha.',
            'welcome.club_label': '¿A qué club hinchás?',
            'welcome.club_placeholder': '— Seleccioná tu club —',
            'welcome.btn_skip': 'Saltar por ahora',
            'welcome.btn_save': 'Confirmar',
            'welcome.skip_hint': 'Podés elegir después en Perfil.',
            // Bell — items de notificación
            'bell.welcome.eyebrow': 'Bienvenida',
            'bell.welcome.title': '¡Bienvenido a Cadeira Numerada!',
            'bell.welcome.desc': 'Tocá para elegir tu club y personalizar la app.',
            'bell.system.eyebrow': 'Aviso',
            // Álbum del Mundial 2026
            'app.album.entry_title': 'Mi álbum del Mundial',
            'app.album.entry_sub': 'Marcá tus figuritas · mirá repetidas · cambialas con amigos',
            'app.album.back': 'Volver al Mundial',
            'app.album.eyebrow': 'FIFA World Cup 2026 · Álbum',
            'app.album.title': 'Mi álbum del Mundial',
            'app.album.subtitle': 'Marcá las figuritas que tenés. Ves cuáles te faltan y cuáles tenés repetidas para cambiar.',
            'app.album.progress': 'Progreso',
            'app.album.tenho': 'Tengo',
            'app.album.faltam': 'Faltan',
            'app.album.repetidos': 'Repetidas',
            'app.album.share': 'Compartir mi lista de cambio',
            'app.album.search_ph': 'Buscar selección o figurita...',
            'app.album.filter_all': 'Todas',
            'app.album.filter_faltam': 'Faltan',
            'app.album.filter_tenho': 'Tengo',
            'app.album.filter_repetidos': 'Repetidas',
            'app.album.loading': 'Cargando álbum...',
            'app.album.empty_filter': 'No hay figuritas con esos filtros.',
            'app.album.share_title': 'Lista para cambiar',
            'app.album.share_meta': 'Pegá ese link donde quieras. Quien lo abra ve tus faltantes y repetidas para cerrar el cambio.',
            'app.album.share_link_label': 'Link público de tu lista',
            'app.album.share_text_label': 'Texto listo para pegar (WhatsApp, etc)',
            'app.album.share_copy_text': 'Copiar texto',
            'app.album.share_need_username': 'Definí un @username en Perfil para compartir.',
            'app.album.copied': 'Copiado',
            'app.album.share_text_header': '🎴 Mi álbum del Mundial 2026',
            'app.album.share_text_falta': '📋 Faltan',
            'app.album.share_text_rep': '🔄 Repetidas',
            'app.album.share_text_cta': '🤝 ¿Cambiamos?',
            'app.album.grupo': 'Grupo',
            'app.album.grupo_special': 'Especiales',
            // Compare modal
            'app.album.compare_eyebrow': 'Comparación de álbumes',
            'app.album.compare_you': 'Vos',
            'app.album.compare_trades': 'cambios posibles',
            'app.album.compare_tab_get': 'Te da',
            'app.album.compare_tab_give': 'Le das',
            'app.album.compare_tab_both_miss': 'Faltan a los 2',
            'app.album.compare_empty_get': 'No tiene repetidas que vos necesités.',
            'app.album.compare_empty_give': 'No tenés repetidas que le falten.',
            'app.album.compare_empty_both': '¡Los 2 ya completaron todo!',
            'app.btn.copy': 'Copiar',

            'app.profile.title': 'Editar perfil',
            'app.profile.desc': 'Actualizá tu nombre y el club que hinchás.',
            'app.profile.name': 'Nombre',
            'app.profile.club': 'Club',
            'app.profile.club_none': '— Sin club —',
            'app.profile.delete': 'Eliminar mi cuenta',
            'app.profile.delete_confirm': 'Eliminar mi cuenta',
            'app.profile.delete_warning': 'Esta acción es irreversible. Todos tus partidos, logros y amigos serán eliminados.',

            'app.ticket.title': 'Detalles del ticket',
            'app.ticket.value': 'Importe pagado',
            'app.ticket.sector': 'Sector / Tribuna',
            'app.ticket.seat': 'Asiento',
            'app.ticket.notes': 'Observaciones',
            'app.ticket.companions': 'Quién fue contigo',
            'app.ticket.attended': 'Fui',
            'app.ticket.not_attended': 'No fui',

            'app.copa.title': 'Mundial 2026',
            'app.copa.subtitle': 'EE.UU. · México · Canadá',
            'app.copa.bolao_title': 'Quiniela del Mundial',
            'app.copa.bolao_sub': 'Hacé tus predicciones y jugá con tus amigos',
            'app.copa.bolao_back': 'Volver al Mundial',

            'app.friends.title': 'Amigos',
            'app.friends.add_ph': '@username',
            'app.friends.invite_share': 'Agregame como amigo en Cadeira Numerada',
            'app.friends.pending_in': 'Solicitudes recibidas',
            'app.friends.pending_out': 'Solicitudes enviadas',
            'app.friends.accept': 'Aceptar',
            'app.friends.reject': 'Rechazar',
            'app.friends.remove': 'Quitar',

            'app.ach.title': 'Logros',
            'app.ach.locked': 'Bloqueado',
            'app.ach.unlocked': 'Desbloqueado',
            'app.ach.toast_unlocked': '¡Logro desbloqueado!',
            'app.ach.progress': 'Progreso',

            'app.copa.header_eyebrow': 'FIFA World Cup · 16 sedes',
            'app.copa.header_title': 'Mundial 2026',
            'app.copa.header_subtitle': 'Canadá · México · Estados Unidos. Marcá tus partidos con "VOY" antes y confirmá presencia cuando ruede la pelota.',

            'app.bolao.entry_title': 'Quiniela del Mundial',
            'app.bolao.entry_sub': 'Predecí los partidos · pelea el ranking · ganá puntos por cada acierto',
            'app.bolao.back': 'Volver al Mundial',
            'app.bolao.hero_eyebrow': 'FIFA WORLD CUP 2026 · QUINIELA',
            'app.bolao.hero_title_html': 'Predecí. Sumá. <em>Ganá.</em>',
            'app.bolao.hero_sub': 'Entrá a una quiniela con el código de invitación y predecí cada partido del Mundial. Pegale al resultado y subí en el ranking.',
            'app.bolao.stat_my': 'Quinielas en las que estoy',
            'app.bolao.stat_palpites': 'Pronósticos hechos',
            'app.bolao.stat_proximo': 'Próximo partido',
            'app.bolao.join_eyebrow': '¿Tenés un invite?',
            'app.bolao.join_label': 'Pegá el código acá',
            'app.bolao.join_placeholder': 'Ej: A3F7B9C2E1',
            'app.bolao.join_btn': 'Entrar',
            'app.bolao.join_btn_loading': 'Entrando...',
            'app.bolao.join_err_invalid': 'Ingresá un código válido.',
            'app.bolao.join_err_not_found': 'Código inválido. Revisá y volvé a intentar.',
            'app.bolao.join_err_member': 'Ya estás en esta quiniela.',
            'app.bolao.publicos_title': 'Quinielas abiertas',
            'app.bolao.publicos_sub': 'Entrá directo, sin código',
            'app.bolao.meus_title': 'Mis quinielas',
            'app.bolao.create_btn': 'Crear quiniela',
            'app.bolao.create_btn_locked_title': 'Pronto',
            'app.bolao.loading_boloes': 'Cargando quinielas...',
            'app.bolao.loading_jogos': 'Cargando partidos...',
            'app.bolao.loading': 'Cargando...',
            'app.bolao.detail_members_suffix': 'miembros',
            'app.bolao.detail_code_label': 'Código',
            'app.bolao.detail_copy_title': 'Copiar',
            'app.bolao.detail_my_points': 'Mis puntos',
            'app.bolao.detail_leave': 'Salir de la quiniela',
            'app.bolao.detail_leave_title': 'Salir de esta quiniela',
            'app.bolao.detail_delete': 'Eliminar quiniela',
            'app.bolao.detail_delete_title': 'Eliminar esta quiniela permanentemente',
            'app.bolao.detail_ranking_toggle': 'Ranking',
            'app.bolao.jogos_title': 'Partidos del Mundial',
            'app.bolao.jogos_stats': '{count} pronósticos',
            'app.bolao.jogos_stats_filtered': '{shown} de {total} partidos · {palpitados} pronosticados',
            'app.bolao.jogos_filter_search_ph': 'Buscar selección (ej: Brasil, Argentina)...',
            'app.bolao.jogos_filter_grupos': 'Todos los grupos',
            'app.bolao.jogos_fase_todas': 'Todas',
            'app.bolao.jogos_fase_grupos': 'Grupos',
            'app.bolao.jogos_fase_r32': 'Round of 32',
            'app.bolao.jogos_fase_oitavas': 'Octavos',
            'app.bolao.jogos_fase_quartas': 'Cuartos',
            'app.bolao.jogos_fase_semis': 'Semis',
            'app.bolao.jogos_fase_terceiro': '3er puesto',
            'app.bolao.jogos_fase_final': 'Final',
            'app.bolao.jogos_empty': 'Ningún partido coincide con estos filtros.',
            'app.bolao.jogos_clear_filters': 'Limpiar filtros',
            'app.bolao.ranking_title': 'Ranking',
            'app.bolao.regras_title': 'Cómo se puntúa',
            'app.bolao.regras_exato': 'Resultado exacto',
            'app.bolao.regras_saldo': 'Ganador + diferencia',
            'app.bolao.regras_vencedor': 'Solo ganador',
            'app.bolao.regras_empate': 'Empate correcto',
            'app.bolao.regras_pts': 'pts',
            'app.bolao.card_progress_label': 'Tus pronósticos',
            'app.bolao.card_pos_title': 'Tu posición en el ranking',
            'app.bolao.create_modal_title': 'Crear quiniela',
            'app.bolao.create_modal_meta': 'Dale un nombre y una descripción (opcional). El código de invitación se genera automáticamente.',
            'app.bolao.create_name_label': 'Nombre de la quiniela',
            'app.bolao.create_name_ph': 'Ej: Quiniela de la oficina · Mundial 2026',
            'app.bolao.create_desc_label': 'Descripción (opcional)',
            'app.bolao.create_desc_ph': 'Reglas especiales, premio, lo que sea...',
            'app.bolao.create_save': 'Crear',
            'app.bolao.created_title': '¡Quiniela creada!',
            'app.bolao.created_meta': 'Compartí el código de invitación para que se sumen:',
            'app.bolao.created_code_label': 'Código de invitación',
            'app.bolao.created_copy': 'Copiar código',
            'app.bolao.created_open': 'Abrir quiniela',
            'app.bolao.leave_confirm': '¿Salir de la quiniela "{title}"?\n\nTus pronósticos se van a borrar. Para volver, necesitás el código de invitación.',
        },
    };

    function getLang() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && T[stored]) return stored;
        // Auto-detecta navegador na primeira visita
        const nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
        if (nav.startsWith('en')) return 'en';
        if (nav.startsWith('es')) return 'es';
        return DEFAULT_LANG;
    }

    function setLang(lang) {
        if (!T[lang]) return;
        localStorage.setItem(STORAGE_KEY, lang);
        document.documentElement.lang = lang;
        applyTranslations(document.body);
        document.dispatchEvent(new CustomEvent('cn:langchange', { detail: { lang } }));
    }

    function t(key, vars) {
        const lang = getLang();
        const dict = T[lang] || T[DEFAULT_LANG];
        let str = dict[key];
        if (str == null) str = T[DEFAULT_LANG][key];
        if (str == null) return key;
        if (vars) {
            str = str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : ''));
        }
        return str;
    }

    function applyTranslations(root) {
        if (!root) root = document.body;
        // data-i18n="key" — substitui textContent
        root.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const val = t(key);
            if (val) el.textContent = val;
        });
        // data-i18n-attr="attr:key, attr2:key2" — substitui atributos
        root.querySelectorAll('[data-i18n-attr]').forEach(el => {
            const spec = el.getAttribute('data-i18n-attr');
            spec.split(',').forEach(pair => {
                const [attr, key] = pair.split(':').map(s => s.trim());
                if (!attr || !key) return;
                el.setAttribute(attr, t(key));
            });
        });
        // data-i18n-html="key" — para casos com markup interno (poucos)
        root.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            const val = t(key);
            if (val) el.innerHTML = val;
        });
        // <title data-i18n-title="key">
        const titleEl = document.querySelector('title[data-i18n-title]');
        if (titleEl) titleEl.textContent = t(titleEl.getAttribute('data-i18n-title'));
    }

    function createLangDropdown(opts) {
        opts = opts || {};
        const variant = opts.variant || 'paper'; // 'paper' (landing/auth) | 'dark' | 'light' (app)
        const wrap = document.createElement('div');
        wrap.className = `cn-lang cn-lang-${variant}`;
        const cur = getLang();
        wrap.innerHTML = `
            <button type="button" class="cn-lang-trigger" aria-haspopup="listbox" aria-expanded="false" title="${LANGS[cur].label}" aria-label="${LANGS[cur].label}">
                ${langFlag(cur)}
            </button>
        `;

        // Menu vai num portal (document.body) pra escapar de stacking contexts
        // de elementos pais (que estavam clipando ele na landing/área logada).
        const menu = document.createElement('ul');
        menu.className = `cn-lang-menu cn-lang-menu-${variant}`;
        menu.setAttribute('role', 'listbox');
        menu.hidden = true;
        // Sem rótulo de país — só bandeira + nome do idioma (Português / English / Español)
        menu.innerHTML = Object.values(LANGS).map(l => `
            <li role="option" data-lang="${l.code}" ${l.code === cur ? 'aria-selected="true"' : ''}>
                ${langFlag(l.code)}
                <span class="cn-lang-name">${l.label}</span>
            </li>
        `).join('');

        const trigger = wrap.querySelector('.cn-lang-trigger');

        function position() {
            const rect = trigger.getBoundingClientRect();
            menu.style.position = 'fixed';
            menu.style.top = (rect.bottom + 4) + 'px';
            // Posiciona via LEFT (não via RIGHT) e clampa pra dentro da viewport.
            // Antes usava RIGHT — se o trigger ficava perto da margem esquerda
            // do mobile (header compacto), o menu vazava pra fora à esquerda.
            const menuW = menu.offsetWidth || 220;
            // Preferência: alinha borda direita do menu com a do trigger
            let left = rect.right - menuW;
            // Garante margem mínima das laterais da viewport
            left = Math.max(8, Math.min(left, window.innerWidth - menuW - 8));
            menu.style.left = left + 'px';
            menu.style.right = 'auto';
        }
        function close() {
            menu.hidden = true;
            trigger.setAttribute('aria-expanded', 'false');
        }
        function open() {
            if (!menu.parentNode) document.body.appendChild(menu);
            // Mostra primeiro, depois posiciona — assim offsetWidth retorna o
            // valor real (não 0) e o clamp do position() funciona corretamente.
            menu.hidden = false;
            trigger.setAttribute('aria-expanded', 'true');
            position();
        }
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.hidden ? open() : close();
        });
        menu.querySelectorAll('li').forEach(li => {
            li.addEventListener('click', (e) => {
                e.stopPropagation();
                const lang = li.getAttribute('data-lang');
                setLang(lang);
                // Atualiza o badge do trigger
                trigger.innerHTML = langFlag(lang);
                trigger.title = LANGS[lang].label;
                trigger.setAttribute('aria-label', LANGS[lang].label);
                menu.querySelectorAll('li').forEach(x => x.removeAttribute('aria-selected'));
                li.setAttribute('aria-selected', 'true');
                close();
            });
        });
        document.addEventListener('click', (e) => {
            if (!wrap.contains(e.target) && !menu.contains(e.target)) close();
        });
        window.addEventListener('resize', () => { if (!menu.hidden) position(); });
        window.addEventListener('scroll', () => { if (!menu.hidden) position(); }, true);
        return wrap;
    }

    function injectStyles() {
        if (document.getElementById('cn-lang-styles')) return;
        const style = document.createElement('style');
        style.id = 'cn-lang-styles';
        style.textContent = `
            .cn-lang { position: relative; font-family: 'Oswald', sans-serif; }
            /* Trigger circular — mesma proporção do .bell-btn (38x38, 34x34 mobile) */
            .cn-lang-trigger {
                display: inline-flex; align-items: center; justify-content: center;
                width: 38px; height: 38px; padding: 0; cursor: pointer;
                background: transparent; border: 1.5px solid currentColor;
                border-radius: 50%; line-height: 1;
                color: inherit; transition: all 150ms;
            }
            .cn-lang-trigger:hover { background: rgba(0,0,0,0.06); }
            .cn-lang-paper .cn-lang-trigger:hover { background: rgba(20,20,20,0.06); }
            .cn-lang-dark .cn-lang-trigger:hover { background: rgba(255,255,255,0.08); }
            @media (max-width: 680px) {
                .cn-lang-trigger { width: 34px; height: 34px; }
            }
            /* Bandeira PNG real (mesmo padrão das seleções da Copa via flagcdn).
               Sem dependência de emoji — funciona em todo device. */
            .cn-lang-flag {
                width: 24px;
                height: 16px;
                object-fit: cover;
                border-radius: 3px;
                box-shadow: 0 1px 2px rgba(0,0,0,0.2);
                display: block;
                flex-shrink: 0;
            }
            .cn-lang-trigger .cn-lang-flag { width: 22px; height: 15px; }
            @media (max-width: 680px) {
                .cn-lang-trigger .cn-lang-flag { width: 20px; height: 14px; }
            }
            .cn-lang-menu .cn-lang-flag { width: 26px; height: 18px; }
            /* Menu portado pro body via position: fixed — não fica preso em
               stacking context de pais (problema na landing/área logada). */
            .cn-lang-menu {
                min-width: 200px; list-style: none; margin: 0; padding: 0.3rem 0;
                background: #fff; color: #141414;
                border: 1px solid rgba(0,0,0,0.12);
                border-radius: 8px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.22);
                z-index: 2147483000; font-size: 0.85rem;
                font-family: 'Oswald', sans-serif;
                overflow: hidden;
            }
            .cn-lang-menu-dark {
                background: #1a1a1a; color: #f5f0e4;
                border-color: rgba(255,255,255,0.12);
                box-shadow: 0 8px 24px rgba(0,0,0,0.55);
            }
            .cn-lang-menu li {
                display: flex; align-items: center; gap: 0.65rem;
                padding: 0.6rem 0.95rem; cursor: pointer;
                letter-spacing: 0.02em; text-transform: none; font-weight: 500;
            }
            .cn-lang-menu li:hover { background: rgba(0,0,0,0.06); }
            .cn-lang-menu-dark li:hover { background: rgba(255,255,255,0.08); }
            .cn-lang-menu li[aria-selected="true"] { font-weight: 700; }
            /* Indicador da opção selecionada — Material Icon "radio_button_checked"
               (bolinha preenchida no estilo radio button), em vez de "✓" */
            .cn-lang-menu li[aria-selected="true"]::after {
                content: 'radio_button_checked';
                font-family: 'Material Icons';
                font-size: 1.05rem;
                font-weight: normal;
                font-style: normal;
                letter-spacing: 0;
                text-transform: none;
                margin-left: auto;
                opacity: 0.85;
                /* Render hint pra suavizar o ícone */
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
            .cn-lang-menu .cn-lang-name { line-height: 1.1; }
            .cn-lang-menu .cn-lang-country {
                font-size: 0.66rem;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                opacity: 0.5;
                margin-left: 0.3rem;
            }
            .cn-lang-menu-dark .cn-lang-country { opacity: 0.55; }
        `;
        document.head.appendChild(style);
    }

    // Aplica tradução assim que possível
    function init() {
        injectStyles();
        document.documentElement.lang = getLang();
        applyTranslations(document.body);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.CN_I18N = { t, getLang, setLang, applyTranslations, createLangDropdown, LANGS };
})();
