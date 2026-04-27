// Cadeira Numerada — i18n compartilhado entre landing/login/signup/app.
// Idiomas: pt (default), en, es. Persistido em localStorage.cn_lang.
// Uso em HTML:    <span data-i18n="nav.signin">Entrar</span>
// Uso em atributo: <input data-i18n-attr="placeholder:hero.search_ph">
// Uso em JS:      t('nav.signin')  /  t('hero.meta_clubs', {count: 12})
(function () {
    const STORAGE_KEY = 'cn_lang';
    const DEFAULT_LANG = 'pt';
    const LANGS = {
        pt: { code: 'pt', label: 'Português', short: 'PT', flag: '🇧🇷' },
        en: { code: 'en', label: 'English',   short: 'EN', flag: '🇺🇸' },
        es: { code: 'es', label: 'Español',   short: 'ES', flag: '🇪🇸' },
    };

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
            'landing.stats.clubs_value': '12',
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
            'landing.clubs.desc': '12 clubes brasileiros com os jogos pré-cadastrados. Você só marca a presença.',

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
            'landing.stats.clubs_value': '12',
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
            'landing.clubs.desc': '12 Brazilian clubs with matches pre-loaded. You just mark attendance.',

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
            'landing.stats.clubs_value': '12',
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
            'landing.clubs.desc': '12 clubes brasileños con los partidos pre-cargados. Vos solo marcás presencia.',

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
        wrap.innerHTML = `
            <button type="button" class="cn-lang-trigger" aria-haspopup="listbox" aria-expanded="false">
                <span class="cn-lang-flag">${LANGS[getLang()].flag}</span>
                <span class="cn-lang-short">${LANGS[getLang()].short}</span>
                <span class="cn-lang-caret">▾</span>
            </button>
            <ul class="cn-lang-menu" role="listbox" hidden>
                ${Object.values(LANGS).map(l => `
                    <li role="option" data-lang="${l.code}" ${l.code === getLang() ? 'aria-selected="true"' : ''}>
                        <span class="cn-lang-flag">${l.flag}</span>
                        <span>${l.label}</span>
                    </li>
                `).join('')}
            </ul>
        `;
        const trigger = wrap.querySelector('.cn-lang-trigger');
        const menu = wrap.querySelector('.cn-lang-menu');
        const flagEl = wrap.querySelector('.cn-lang-trigger .cn-lang-flag');
        const shortEl = wrap.querySelector('.cn-lang-short');

        function close() {
            menu.hidden = true;
            trigger.setAttribute('aria-expanded', 'false');
        }
        function open() {
            menu.hidden = false;
            trigger.setAttribute('aria-expanded', 'true');
        }
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.hidden ? open() : close();
        });
        menu.querySelectorAll('li').forEach(li => {
            li.addEventListener('click', () => {
                const lang = li.getAttribute('data-lang');
                setLang(lang);
                flagEl.textContent = LANGS[lang].flag;
                shortEl.textContent = LANGS[lang].short;
                menu.querySelectorAll('li').forEach(x => x.removeAttribute('aria-selected'));
                li.setAttribute('aria-selected', 'true');
                close();
            });
        });
        document.addEventListener('click', (e) => {
            if (!wrap.contains(e.target)) close();
        });
        return wrap;
    }

    function injectStyles() {
        if (document.getElementById('cn-lang-styles')) return;
        const style = document.createElement('style');
        style.id = 'cn-lang-styles';
        style.textContent = `
            .cn-lang { position: relative; font-family: 'Oswald', sans-serif; }
            .cn-lang-trigger {
                display: inline-flex; align-items: center; gap: 0.4rem;
                padding: 0.5rem 0.8rem; cursor: pointer;
                background: transparent; border: 1.5px solid currentColor;
                font-family: inherit; font-size: 0.72rem; letter-spacing: 0.18em;
                text-transform: uppercase; font-weight: 600; line-height: 1;
                color: inherit; transition: all 150ms;
            }
            .cn-lang-trigger:hover { background: rgba(0,0,0,0.06); }
            .cn-lang-paper .cn-lang-trigger:hover { background: rgba(20,20,20,0.06); }
            .cn-lang-dark .cn-lang-trigger:hover { background: rgba(255,255,255,0.08); }
            .cn-lang-flag { font-size: 1rem; line-height: 1; }
            .cn-lang-caret { font-size: 0.7rem; opacity: 0.7; }
            .cn-lang-menu {
                position: absolute; right: 0; top: calc(100% + 4px);
                min-width: 160px; list-style: none; margin: 0; padding: 0.3rem 0;
                background: #fff; color: #141414;
                border: 1px solid rgba(0,0,0,0.12);
                box-shadow: 0 8px 24px rgba(0,0,0,0.18);
                z-index: 1000; font-size: 0.85rem;
            }
            .cn-lang-dark .cn-lang-menu {
                background: #1a1a1a; color: #f5f0e4;
                border-color: rgba(255,255,255,0.12);
                box-shadow: 0 8px 24px rgba(0,0,0,0.5);
            }
            .cn-lang-menu li {
                display: flex; align-items: center; gap: 0.55rem;
                padding: 0.5rem 0.85rem; cursor: pointer;
                letter-spacing: 0.04em; text-transform: none; font-weight: 500;
            }
            .cn-lang-menu li:hover { background: rgba(0,0,0,0.06); }
            .cn-lang-dark .cn-lang-menu li:hover { background: rgba(255,255,255,0.08); }
            .cn-lang-menu li[aria-selected="true"] { font-weight: 700; }
            .cn-lang-menu li[aria-selected="true"]::after {
                content: '✓'; margin-left: auto; opacity: 0.7;
            }
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
