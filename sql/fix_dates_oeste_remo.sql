-- Corrige datas dos jogos Oeste e Remo no catálogo do Corinthians
-- (validado pelo agente de IA + inspeção do banco)

-- 2019 — Corinthians x Oeste: data correta é 17/03, não 17/02
UPDATE games
SET data = '2019-03-17', dia_semana = 'Domingo'
WHERE id = 113
  AND time_casa = 'Corinthians' AND time_visitante = 'Oeste';

-- 2023 — Corinthians x Remo: data correta é 26/04, não 02/05
UPDATE games
SET data = '2023-04-26', dia_semana = 'Quarta'
WHERE id = 112
  AND time_casa = 'Corinthians' AND time_visitante = 'Remo';

-- Verificação
SELECT id, data, time_casa, time_visitante, gols_casa, gols_visitante, resultado
FROM games
WHERE id IN (112, 113);
