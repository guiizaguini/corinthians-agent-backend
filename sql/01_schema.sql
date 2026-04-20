-- =============================================================
-- SCHEMA: Base de Dados dos Jogos do Corinthians
-- Banco: PostgreSQL (Railway)
-- =============================================================

-- Extensões: unaccent permite buscas sem depender de acentuação
-- ("sao paulo" bate com "São Paulo")
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Drop em ordem reversa de dependência (idempotente para reruns)
DROP VIEW IF EXISTS v_retrospecto_geral;
DROP VIEW IF EXISTS v_retrospecto_por_ano;
DROP VIEW IF EXISTS v_retrospecto_por_campeonato;
DROP VIEW IF EXISTS v_retrospecto_por_rival;
DROP VIEW IF EXISTS v_retrospecto_por_estadio;
DROP VIEW IF EXISTS v_retrospecto_por_setor;
DROP VIEW IF EXISTS v_gastos_por_ano;
DROP TABLE IF EXISTS jogos;

-- =============================================================
-- TABELA PRINCIPAL
-- =============================================================
CREATE TABLE jogos (
    id                SERIAL PRIMARY KEY,
    data              DATE NOT NULL,
    dia_semana        VARCHAR(10),
    time_casa         VARCHAR(60) NOT NULL,
    time_visitante    VARCHAR(60) NOT NULL,
    is_corinthians    BOOLEAN NOT NULL DEFAULT TRUE,
    mando             VARCHAR(10) NOT NULL CHECK (mando IN ('MANDANTE','VISITANTE','NEUTRO')),
    campeonato        VARCHAR(40),
    genero            VARCHAR(10),            -- M, F, S-20
    estadio           VARCHAR(60),
    status_presenca   VARCHAR(15) NOT NULL DEFAULT 'PRESENTE'
                      CHECK (status_presenca IN ('PRESENTE','AUSENTE')),
    setor             VARCHAR(60),
    assento           VARCHAR(40),
    valor_pago        NUMERIC(10,2),
    gols_casa         INTEGER,
    gols_visitante    INTEGER,
    resultado         CHAR(1) CHECK (resultado IN ('V','E','D') OR resultado IS NULL),
    foi_classico      BOOLEAN NOT NULL DEFAULT FALSE,
    teve_penal        BOOLEAN NOT NULL DEFAULT FALSE,
    fase              VARCHAR(40),   -- "Final","Semifinal","Quartas","Oitavas","Grupos","Rodada 12",...
    titulo_conquistado VARCHAR(60),  -- Se esse jogo deu o troféu (ex: "Copa do Brasil 2025")
    observacoes       TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jogos_data         ON jogos(data);
CREATE INDEX idx_jogos_rival        ON jogos(time_visitante);
CREATE INDEX idx_jogos_campeonato   ON jogos(campeonato);
CREATE INDEX idx_jogos_status       ON jogos(status_presenca);
CREATE INDEX idx_jogos_corinthians  ON jogos(is_corinthians);

-- Trigger para manter updated_at
CREATE OR REPLACE FUNCTION trg_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_jogos_touch
BEFORE UPDATE ON jogos
FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

-- =============================================================
-- VIEWS ANALÍTICAS
-- =============================================================

-- View auxiliar: só jogos do Corinthians onde estive presente e com resultado
-- (para facilitar retrospecto real)
CREATE OR REPLACE VIEW v_jogos_validos AS
SELECT
    *,
    EXTRACT(YEAR FROM data)::INT AS ano,
    CASE
        WHEN time_casa = 'Corinthians' THEN gols_casa
        ELSE gols_visitante
    END AS gols_pro,
    CASE
        WHEN time_casa = 'Corinthians' THEN gols_visitante
        ELSE gols_casa
    END AS gols_contra,
    CASE
        WHEN time_casa = 'Corinthians' THEN time_visitante
        ELSE time_casa
    END AS adversario
FROM jogos
WHERE is_corinthians = TRUE
  AND status_presenca = 'PRESENTE'
  AND resultado IS NOT NULL;

-- Retrospecto geral
CREATE VIEW v_retrospecto_geral AS
SELECT
    COUNT(*) AS jogos,
    SUM(CASE WHEN resultado='V' THEN 1 ELSE 0 END) AS vitorias,
    SUM(CASE WHEN resultado='E' THEN 1 ELSE 0 END) AS empates,
    SUM(CASE WHEN resultado='D' THEN 1 ELSE 0 END) AS derrotas,
    SUM(gols_pro)     AS gols_pro,
    SUM(gols_contra)  AS gols_contra,
    SUM(gols_pro) - SUM(gols_contra) AS saldo,
    ROUND(
        (SUM(CASE WHEN resultado='V' THEN 3 ELSE 0 END)
         + SUM(CASE WHEN resultado='E' THEN 1 ELSE 0 END))::NUMERIC
        / NULLIF(COUNT(*)*3, 0) * 100,
        2
    ) AS aproveitamento_pct
FROM v_jogos_validos;

-- Retrospecto por ano
CREATE VIEW v_retrospecto_por_ano AS
SELECT
    ano,
    COUNT(*) AS jogos,
    SUM(CASE WHEN resultado='V' THEN 1 ELSE 0 END) AS vitorias,
    SUM(CASE WHEN resultado='E' THEN 1 ELSE 0 END) AS empates,
    SUM(CASE WHEN resultado='D' THEN 1 ELSE 0 END) AS derrotas,
    SUM(gols_pro)    AS gols_pro,
    SUM(gols_contra) AS gols_contra,
    ROUND(
        (SUM(CASE WHEN resultado='V' THEN 3 ELSE 0 END)
         + SUM(CASE WHEN resultado='E' THEN 1 ELSE 0 END))::NUMERIC
        / NULLIF(COUNT(*)*3, 0) * 100,
        2
    ) AS aproveitamento_pct
FROM v_jogos_validos
GROUP BY ano
ORDER BY ano;

-- Retrospecto por campeonato
CREATE VIEW v_retrospecto_por_campeonato AS
SELECT
    campeonato,
    COUNT(*) AS jogos,
    SUM(CASE WHEN resultado='V' THEN 1 ELSE 0 END) AS vitorias,
    SUM(CASE WHEN resultado='E' THEN 1 ELSE 0 END) AS empates,
    SUM(CASE WHEN resultado='D' THEN 1 ELSE 0 END) AS derrotas,
    SUM(gols_pro)    AS gols_pro,
    SUM(gols_contra) AS gols_contra,
    ROUND(
        (SUM(CASE WHEN resultado='V' THEN 3 ELSE 0 END)
         + SUM(CASE WHEN resultado='E' THEN 1 ELSE 0 END))::NUMERIC
        / NULLIF(COUNT(*)*3, 0) * 100,
        2
    ) AS aproveitamento_pct
FROM v_jogos_validos
GROUP BY campeonato
ORDER BY jogos DESC;

-- Retrospecto por rival
CREATE VIEW v_retrospecto_por_rival AS
SELECT
    adversario,
    COUNT(*) AS jogos,
    SUM(CASE WHEN resultado='V' THEN 1 ELSE 0 END) AS vitorias,
    SUM(CASE WHEN resultado='E' THEN 1 ELSE 0 END) AS empates,
    SUM(CASE WHEN resultado='D' THEN 1 ELSE 0 END) AS derrotas,
    SUM(gols_pro)    AS gols_pro,
    SUM(gols_contra) AS gols_contra
FROM v_jogos_validos
GROUP BY adversario
ORDER BY jogos DESC, adversario;

-- Retrospecto por estádio
CREATE VIEW v_retrospecto_por_estadio AS
SELECT
    estadio,
    COUNT(*) AS jogos,
    SUM(CASE WHEN resultado='V' THEN 1 ELSE 0 END) AS vitorias,
    SUM(CASE WHEN resultado='E' THEN 1 ELSE 0 END) AS empates,
    SUM(CASE WHEN resultado='D' THEN 1 ELSE 0 END) AS derrotas
FROM v_jogos_validos
GROUP BY estadio
ORDER BY jogos DESC;

-- Retrospecto por setor (arquibancada/cadeira onde assistiu)
CREATE VIEW v_retrospecto_por_setor AS
SELECT
    setor,
    COUNT(*) AS jogos,
    SUM(CASE WHEN resultado='V' THEN 1 ELSE 0 END) AS vitorias,
    SUM(CASE WHEN resultado='E' THEN 1 ELSE 0 END) AS empates,
    SUM(CASE WHEN resultado='D' THEN 1 ELSE 0 END) AS derrotas,
    ROUND(AVG(valor_pago) FILTER (WHERE valor_pago > 0), 2) AS ticket_medio
FROM v_jogos_validos
WHERE setor IS NOT NULL AND setor <> ''
GROUP BY setor
ORDER BY jogos DESC;

-- Gastos por ano
CREATE VIEW v_gastos_por_ano AS
SELECT
    EXTRACT(YEAR FROM data)::INT AS ano,
    COUNT(*) FILTER (WHERE valor_pago IS NOT NULL) AS ingressos_pagos,
    SUM(valor_pago) AS gasto_total,
    ROUND(AVG(valor_pago), 2) AS ticket_medio,
    MIN(valor_pago) AS ingresso_mais_barato,
    MAX(valor_pago) AS ingresso_mais_caro
FROM jogos
WHERE valor_pago IS NOT NULL AND valor_pago > 0
GROUP BY ano
ORDER BY ano;
