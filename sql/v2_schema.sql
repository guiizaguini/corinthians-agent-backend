-- =============================================================
-- SCHEMA v2 — SaaS multi-tenant (white-label ready)
--
-- Separação em 4 camadas:
--   clubs        → catálogo de times (Corinthians, Palmeiras, …)
--   users        → contas com email/senha
--   games        → jogos do catálogo (fatos do jogo, placar, etc)
--   attendances  → "fulano foi no jogo X, pagou Y, setor Z"
--
-- Idempotente: pode rodar várias vezes sem quebrar nada existente.
-- NÃO dropa a tabela `jogos` legada — ela continua viva em paralelo
-- durante a migração.
-- =============================================================

CREATE EXTENSION IF NOT EXISTS unaccent;

-- =============================================================
-- CLUBS (white-label)
-- =============================================================
CREATE TABLE IF NOT EXISTS clubs (
    id               SERIAL PRIMARY KEY,
    slug             VARCHAR(40) UNIQUE NOT NULL,
    name             VARCHAR(60) NOT NULL,
    short_name       VARCHAR(20),
    primary_color    VARCHAR(20),
    secondary_color  VARCHAR(20),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Flag pra "clubes" que na verdade são torneios (Copa do Mundo, etc).
-- Eles NÃO aparecem no dropdown de signup mas têm um catálogo próprio de jogos.
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS is_tournament BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS logo_url VARCHAR(300);

-- Seed de clubes (cores pensadas pra funcionar como accent em UI dark)
INSERT INTO clubs (slug, name, short_name, primary_color, secondary_color) VALUES
    ('corinthians',   'Corinthians',       'Timão',       '#9c8a52', '#ffffff'),
    ('palmeiras',     'Palmeiras',         'Verdão',      '#3fa966', '#ffffff'),
    ('sao-paulo',     'São Paulo',         'Tricolor',    '#e53e3e', '#000000'),
    ('santos',        'Santos',            'Peixe',       '#f5f5f5', '#000000'),
    ('flamengo',      'Flamengo',          'Mengão',      '#e53e3e', '#000000'),
    ('vasco',         'Vasco',             'Gigante',     '#f5f5f5', '#000000'),
    ('fluminense',    'Fluminense',        'Flu',         '#8b1e3f', '#2d7a4f'),
    ('botafogo',      'Botafogo',          'Fogão',       '#f5f5f5', '#000000'),
    ('gremio',        'Grêmio',            'Imortal',     '#3b82f6', '#000000'),
    ('internacional', 'Internacional',     'Colorado',    '#e53e3e', '#ffffff'),
    ('atletico-mg',   'Atlético Mineiro',  'Galo',        '#f5f5f5', '#000000'),
    ('cruzeiro',      'Cruzeiro',          'Raposa',      '#3b82f6', '#ffffff')
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    primary_color = EXCLUDED.primary_color,
    secondary_color = EXCLUDED.secondary_color;

-- Torneios (hidden clubs — aparecem em aba própria, não no dropdown de signup)
INSERT INTO clubs (slug, name, short_name, primary_color, secondary_color, is_tournament, logo_url) VALUES
    ('copa-do-mundo-2026', 'Copa do Mundo 2026', 'WC26', '#e63946', '#ffc93a', TRUE, '/logos/fifa-2026.png')
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    primary_color = EXCLUDED.primary_color,
    secondary_color = EXCLUDED.secondary_color,
    is_tournament = TRUE,
    logo_url = EXCLUDED.logo_url;

-- =============================================================
-- USERS
-- =============================================================
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(200) UNIQUE NOT NULL,
    password_hash   VARCHAR(200) NOT NULL,
    display_name    VARCHAR(80),
    club_id         INTEGER REFERENCES clubs(id) ON DELETE SET NULL,
    is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_club ON users(club_id);

-- Username (handle) pra rede social — único e case-insensitive
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(30);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower
    ON users(LOWER(username)) WHERE username IS NOT NULL;

-- Tracking de último login/acesso (pra indicador online na rede social)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- =============================================================
-- GAMES (catálogo — fatos do jogo, sem dados pessoais do torcedor)
-- Cada jogo pertence a um clube (do ponto de vista da UI do torcedor).
-- Um Corinthians x Palmeiras existe duas vezes: uma com club_id=Cor,
-- outra com club_id=Pal. É duplicação proposital pra simplificar.
-- =============================================================
CREATE TABLE IF NOT EXISTS games (
    id                 SERIAL PRIMARY KEY,
    club_id            INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    data               DATE NOT NULL,
    dia_semana         VARCHAR(10),
    time_casa          VARCHAR(60) NOT NULL,
    time_visitante     VARCHAR(60) NOT NULL,
    mando              VARCHAR(10) NOT NULL CHECK (mando IN ('MANDANTE','VISITANTE','NEUTRO')),
    campeonato         VARCHAR(40),
    genero             VARCHAR(10),
    estadio            VARCHAR(60),
    gols_casa          INTEGER,
    gols_visitante     INTEGER,
    resultado          CHAR(1) CHECK (resultado IN ('V','E','D') OR resultado IS NULL),
    foi_classico       BOOLEAN NOT NULL DEFAULT FALSE,
    teve_penal         BOOLEAN NOT NULL DEFAULT FALSE,
    fase               VARCHAR(40),
    titulo_conquistado VARCHAR(60),
    autores_gols       JSONB,
    gols_texto         TEXT,
    publico_total      INTEGER,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (club_id, data, time_casa, time_visitante, genero)
);

CREATE INDEX IF NOT EXISTS idx_games_club_data ON games(club_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_games_campeonato ON games(campeonato);

-- Horário do jogo (formato HH:MM) — add idempotente
ALTER TABLE games ADD COLUMN IF NOT EXISTS horario VARCHAR(5);

-- =============================================================
-- ATTENDANCES (registro por usuário)
-- =============================================================
CREATE TABLE IF NOT EXISTS attendances (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id      INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    status       VARCHAR(15) NOT NULL DEFAULT 'PRESENTE'
                 CHECK (status IN ('PRESENTE','AUSENTE')),
    setor        VARCHAR(60),
    assento      VARCHAR(40),
    valor_pago   NUMERIC(10,2),
    observacoes  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_attendances_user ON attendances(user_id);
CREATE INDEX IF NOT EXISTS idx_attendances_game ON attendances(game_id);

-- =============================================================
-- NOTES (histórias do torcedor sobre jogos)
-- Pode ser standalone ou tied a uma attendance
-- =============================================================
CREATE TABLE IF NOT EXISTS notes (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attendance_id   INTEGER REFERENCES attendances(id) ON DELETE SET NULL,
    game_id         INTEGER REFERENCES games(id) ON DELETE SET NULL,
    title           VARCHAR(140),
    body            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_attendance ON notes(attendance_id);
CREATE INDEX IF NOT EXISTS idx_notes_game ON notes(game_id);

-- Visibilidade pública/privada — públicas vão pro feed dos amigos
ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_notes_public ON notes(is_public, created_at DESC) WHERE is_public = TRUE;

-- =============================================================
-- FRIENDSHIPS (rede social)
-- requester_id manda solicitação pra recipient_id
-- status PENDING vira ACCEPTED quando recipient aceita
-- =============================================================
CREATE TABLE IF NOT EXISTS friendships (
    id              SERIAL PRIMARY KEY,
    requester_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          VARCHAR(15) NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING','ACCEPTED')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (requester_id, recipient_id),
    CHECK (requester_id <> recipient_id)
);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_recipient ON friendships(recipient_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- =============================================================
-- ATTENDANCE_COMPANIONS (n:n entre attendances e users)
-- "fui no jogo X com fulano e ciclano"
-- =============================================================
CREATE TABLE IF NOT EXISTS attendance_companions (
    attendance_id        INTEGER NOT NULL REFERENCES attendances(id) ON DELETE CASCADE,
    companion_user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (attendance_id, companion_user_id)
);
CREATE INDEX IF NOT EXISTS idx_companions_user ON attendance_companions(companion_user_id);

-- Confirmação bidirecional: quando você marca alguém como companhia,
-- a pessoa precisa aceitar pra virar CONFIRMED. Defaults retroativos: existentes ficam CONFIRMED.
ALTER TABLE attendance_companions
    ADD COLUMN IF NOT EXISTS status VARCHAR(15) NOT NULL DEFAULT 'CONFIRMED';
ALTER TABLE attendance_companions
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE attendance_companions
    ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_companions_user_status
    ON attendance_companions(companion_user_id, status);

-- =============================================================
-- Triggers de updated_at (reutiliza função existente se já houver)
-- =============================================================
CREATE OR REPLACE FUNCTION trg_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_users_touch ON users;
CREATE TRIGGER tr_users_touch BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

DROP TRIGGER IF EXISTS tr_games_touch ON games;
CREATE TRIGGER tr_games_touch BEFORE UPDATE ON games
    FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

DROP TRIGGER IF EXISTS tr_attendances_touch ON attendances;
CREATE TRIGGER tr_attendances_touch BEFORE UPDATE ON attendances
    FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

DROP TRIGGER IF EXISTS tr_notes_touch ON notes;
CREATE TRIGGER tr_notes_touch BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

DROP TRIGGER IF EXISTS tr_friendships_touch ON friendships;
CREATE TRIGGER tr_friendships_touch BEFORE UPDATE ON friendships
    FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

-- =============================================================
-- BOLÃO DA COPA 2026
-- =============================================================

-- Um bolão é um "grupo" de usuários palpitando sobre os jogos de um torneio
CREATE TABLE IF NOT EXISTS boloes (
    id                 SERIAL PRIMARY KEY,
    tournament_club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
    name               VARCHAR(120) NOT NULL,
    description        TEXT,
    invite_code        VARCHAR(24) UNIQUE NOT NULL,
    created_by         INTEGER REFERENCES users(id),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_boloes_invite ON boloes(UPPER(invite_code));

-- Bolão público: visível pra todo mundo, qualquer usuário pode entrar sem código
ALTER TABLE boloes ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_boloes_is_public ON boloes(is_public) WHERE is_public = TRUE;

-- created_by usa SET NULL quando user é excluído (não derruba o bolão dos outros membros)
ALTER TABLE boloes DROP CONSTRAINT IF EXISTS boloes_created_by_fkey;
ALTER TABLE boloes ADD CONSTRAINT boloes_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Quem participa de qual bolão
CREATE TABLE IF NOT EXISTS bolao_members (
    id         SERIAL PRIMARY KEY,
    bolao_id   INTEGER NOT NULL REFERENCES boloes(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(bolao_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_bolao_members_user ON bolao_members(user_id);

-- Palpite de placar pra cada jogo dentro do bolão
CREATE TABLE IF NOT EXISTS bolao_palpites (
    id              SERIAL PRIMARY KEY,
    bolao_id        INTEGER NOT NULL REFERENCES boloes(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    gols_casa       INTEGER NOT NULL CHECK (gols_casa BETWEEN 0 AND 20),
    gols_visitante  INTEGER NOT NULL CHECK (gols_visitante BETWEEN 0 AND 20),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(bolao_id, user_id, game_id)
);
CREATE INDEX IF NOT EXISTS idx_palpites_game_real ON bolao_palpites(game_id);
-- Acelera o cálculo de ranking (JOIN bolao_members + bolao_palpites + games)
CREATE INDEX IF NOT EXISTS idx_palpites_bolao_game ON bolao_palpites(bolao_id, game_id);
-- Acelera "quais jogos têm resultado deste torneio" (CTE jogos_com_resultado)
CREATE INDEX IF NOT EXISTS idx_games_club_resultado ON games(club_id) WHERE gols_casa IS NOT NULL;

-- Palpites "extras" (campeão, artilheiro, fase do Brasil) — 1 por usuário por bolão
CREATE TABLE IF NOT EXISTS bolao_palpites_extras (
    id            SERIAL PRIMARY KEY,
    bolao_id      INTEGER NOT NULL REFERENCES boloes(id) ON DELETE CASCADE,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campeao       VARCHAR(80),
    vice          VARCHAR(80),
    artilheiro    VARCHAR(80),
    fase_brasil   VARCHAR(20),  -- GRUPOS|OITAVAS_32|OITAVAS|QUARTAS|SEMIS|FINAL|CAMPEAO
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(bolao_id, user_id)
);

-- Resultados "extras" oficiais do torneio (o admin preenche quando a Copa acabar)
CREATE TABLE IF NOT EXISTS bolao_extras_oficiais (
    bolao_id      INTEGER PRIMARY KEY REFERENCES boloes(id) ON DELETE CASCADE,
    campeao       VARCHAR(80),
    vice          VARCHAR(80),
    artilheiro    VARCHAR(80),
    fase_brasil   VARCHAR(20),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Triggers de touch
DROP TRIGGER IF EXISTS tr_palpites_touch ON bolao_palpites;
CREATE TRIGGER tr_palpites_touch BEFORE UPDATE ON bolao_palpites
    FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

DROP TRIGGER IF EXISTS tr_palpites_extras_touch ON bolao_palpites_extras;
CREATE TRIGGER tr_palpites_extras_touch BEFORE UPDATE ON bolao_palpites_extras
    FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();
