-- =============================================================
-- Seed dos jogos da Copa do Mundo 2026 (datas e sedes oficiais FIFA)
-- Faz parte da Copa como "club hidden" via is_tournament=TRUE
-- =============================================================

-- Opener + Final (datas/sedes oficiais FIFA)
INSERT INTO games (
    club_id, data, dia_semana, time_casa, time_visitante, mando,
    campeonato, genero, estadio, fase, gols_casa, gols_visitante, resultado
) VALUES
    -- Abertura
    ((SELECT id FROM clubs WHERE slug = 'copa-do-mundo-2026'),
     '2026-06-11', 'Quinta', 'México', 'A Definir', 'NEUTRO',
     'Copa do Mundo 2026', 'M', 'Estádio Azteca',
     'Abertura · Grupo A', NULL, NULL, NULL),

    -- Alguns jogos dos EUA
    ((SELECT id FROM clubs WHERE slug = 'copa-do-mundo-2026'),
     '2026-06-12', 'Sexta', 'Canadá', 'A Definir', 'NEUTRO',
     'Copa do Mundo 2026', 'M', 'BMO Field (Toronto)',
     'Grupo B · Rodada 1', NULL, NULL, NULL),

    ((SELECT id FROM clubs WHERE slug = 'copa-do-mundo-2026'),
     '2026-06-12', 'Sexta', 'EUA', 'A Definir', 'NEUTRO',
     'Copa do Mundo 2026', 'M', 'SoFi Stadium (Los Angeles)',
     'Grupo D · Rodada 1', NULL, NULL, NULL),

    -- Finais mata-mata (datas oficiais FIFA)
    ((SELECT id FROM clubs WHERE slug = 'copa-do-mundo-2026'),
     '2026-07-04', 'Sábado', 'A Definir', 'A Definir', 'NEUTRO',
     'Copa do Mundo 2026', 'M', 'Mercedes-Benz (Atlanta)',
     'Oitavas de Final', NULL, NULL, NULL),

    ((SELECT id FROM clubs WHERE slug = 'copa-do-mundo-2026'),
     '2026-07-09', 'Quinta', 'A Definir', 'A Definir', 'NEUTRO',
     'Copa do Mundo 2026', 'M', 'MetLife (East Rutherford)',
     'Quartas de Final', NULL, NULL, NULL),

    ((SELECT id FROM clubs WHERE slug = 'copa-do-mundo-2026'),
     '2026-07-14', 'Terça', 'A Definir', 'A Definir', 'NEUTRO',
     'Copa do Mundo 2026', 'M', 'AT&T Stadium (Arlington)',
     'Semifinal', NULL, NULL, NULL),

    ((SELECT id FROM clubs WHERE slug = 'copa-do-mundo-2026'),
     '2026-07-15', 'Quarta', 'A Definir', 'A Definir', 'NEUTRO',
     'Copa do Mundo 2026', 'M', 'Mercedes-Benz (Atlanta)',
     'Semifinal', NULL, NULL, NULL),

    ((SELECT id FROM clubs WHERE slug = 'copa-do-mundo-2026'),
     '2026-07-18', 'Sábado', 'A Definir', 'A Definir', 'NEUTRO',
     'Copa do Mundo 2026', 'M', 'Hard Rock (Miami)',
     'Disputa de 3º lugar', NULL, NULL, NULL),

    -- FINAL
    ((SELECT id FROM clubs WHERE slug = 'copa-do-mundo-2026'),
     '2026-07-19', 'Domingo', 'A Definir', 'A Definir', 'NEUTRO',
     'Copa do Mundo 2026', 'M', 'MetLife (East Rutherford)',
     'FINAL', NULL, NULL, NULL)
ON CONFLICT (club_id, data, time_casa, time_visitante, genero) DO NOTHING;
