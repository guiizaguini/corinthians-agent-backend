-- =============================================================
-- Jogos exemplo pra popular o catálogo de outros clubes
-- Idempotente — ON CONFLICT pula se já existe
-- =============================================================

INSERT INTO games (
    club_id, data, dia_semana, time_casa, time_visitante, mando,
    campeonato, genero, gols_casa, gols_visitante, resultado,
    foi_classico, fase, autores_gols
) VALUES
    -- São Paulo 1 x 0 Juventude — Copa do Brasil
    (
        (SELECT id FROM clubs WHERE slug = 'sao-paulo'),
        '2026-04-21', 'Terça', 'São Paulo', 'Juventude', 'MANDANTE',
        'Copa do Brasil', 'M', 1, 0, 'V',
        FALSE, 'Quinta rodada · Jogo 1 de 2',
        '[{"time":"São Paulo","autor":"Calleri","minuto":34}]'::jsonb
    ),
    -- Palmeiras 1 x 0 Athletico-PR — Brasileiro
    (
        (SELECT id FROM clubs WHERE slug = 'palmeiras'),
        '2026-04-19', 'Domingo', 'Palmeiras', 'Athletico-PR', 'MANDANTE',
        'Brasileiro', 'M', 1, 0, 'V',
        FALSE, NULL,
        '[{"time":"Palmeiras","autor":"Estêvão","minuto":67}]'::jsonb
    )
ON CONFLICT (club_id, data, time_casa, time_visitante, genero) DO UPDATE SET
    gols_casa = EXCLUDED.gols_casa,
    gols_visitante = EXCLUDED.gols_visitante,
    resultado = EXCLUDED.resultado,
    autores_gols = EXCLUDED.autores_gols,
    fase = EXCLUDED.fase;
