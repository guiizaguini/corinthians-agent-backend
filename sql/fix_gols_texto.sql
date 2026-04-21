-- =====================================================================
-- CORREÇÕES DE gols_texto E DADOS INCONSISTENTES
-- Execute em ordem. Todas as queries são idempotentes (pode rodar 2x).
-- =====================================================================

BEGIN;

-- id 108 (2025-05-03): Corinthians 4x2 Internacional
-- Antes: "...Yuri Alberto 2x no 2T...; Igor Coronado 2T (COR)"
-- Agora: minutos individualizados. O segundo gol do Yuri foi de pênalti no fim do jogo.
UPDATE jogos SET
    gols_texto = 'Yuri Alberto 25''1T (COR); Aguirre 37''1T (INT); Thiago Maia 42''1T (INT); Yuri Alberto 64''2T (COR); Yuri Alberto 90''2T (COR); Igor Coronado 90''2T (COR)',
    autores_gols = NULL
WHERE id = 108;

-- id 81 (2024-01-30): o jogo foi no MORUMBI, São Paulo venceu 2x1.
-- O banco tem time_casa='Corinthians', gols_casa=2, gols_visitante=1, resultado=D
-- que é inconsistente. Corrigindo:
UPDATE jogos SET
    time_casa = 'São Paulo',
    time_visitante = 'Corinthians',
    gols_casa = 2,
    gols_visitante = 1,
    gols_texto = 'Calleri 1''1T (SAO); Luiz Gustavo 38''1T (SAO); Arthur Sousa 45''2T (COR)',
    autores_gols = NULL
WHERE id = 81;

-- id 69 (2023-04-17): Corinthians Feminino 3x2 Palmeiras Feminino
UPDATE jogos SET
    gols_texto = 'Vic Albuquerque 5''1T (COR); Benítez 29''1T (PAL); Camilinha 37''1T (PAL); Tamires 3''2T (COR); Tarciane 41''2T (COR)',
    autores_gols = NULL
WHERE id = 69;

-- id 64 (2023-01-18): Corinthians 3x0 Água Santa (Paulistão 2023)
UPDATE jogos SET
    gols_texto = 'Yuri Alberto 20''1T (COR); Róger Guedes 39''1T (COR); Róger Guedes 24''2T (COR)',
    autores_gols = NULL
WHERE id = 64;

-- id 58 (2022-09-24): Corinthians Feminino 4x1 Internacional Feminino (Final Brasileiro)
-- Minutos aproximados — fontes divergiram.
UPDATE jogos SET
    gols_texto = 'Jaqueline 22''1T (COR); Vic Albuquerque 45''1T (COR); Diany 1''2T (COR); Sorriso 13''2T (INT); Jheniffer 40''2T (COR)',
    autores_gols = NULL
WHERE id = 58;

-- id 49 (2022-07-20): Corinthians 3x1 Coritiba (Copa do Brasil)
-- IMPORTANTE: Luciano Castán jogava PELO Coritiba, não foi gol contra.
-- O parser antigo marcava (COR) incorretamente.
UPDATE jogos SET
    gols_texto = 'Róger Guedes 35''1T (COR); Luciano Castán 8''2T (CTB); Adson 20''2T (COR); Raul Gustavo 40''2T (COR)',
    autores_gols = NULL
WHERE id = 49;

-- id 35 (2022-02-02): Santos 2x1 Corinthians (Paulistão, Vila Belmiro)
UPDATE jogos SET
    gols_texto = 'Jô 7''2T (COR); Marcos Leonardo 19''2T (SAN); Marcos Leonardo 24''2T (SAN)',
    autores_gols = NULL
WHERE id = 35;

-- id 25 (2020-02-12): Corinthians 2x1 Guaraní-PAR (Pré-Libertadores)
-- Já estava correto — só remove o texto narrativo do final.
UPDATE jogos SET
    gols_texto = 'Luan 8''1T (COR); Mauro Boselli 31''1T (COR); Fernando Fernández 7''2T (GUA)',
    autores_gols = NULL
WHERE id = 25;

-- id 10 (2018-03-18): Bragantino 3x2 Corinthians (Paulistão 2018)
-- Terceiro gol do Bragantino é do Italo (não genérico).
UPDATE jogos SET
    gols_texto = 'Matheus Peixoto 45+2''1T (BRA); Fabián Balbuena 21''2T (COR); Vitinho 26''2T (BRA); Italo 31''2T (BRA); Pedrinho 43''2T (COR)',
    autores_gols = NULL
WHERE id = 10;

COMMIT;

-- =====================================================================
-- VERIFICAÇÃO PÓS-UPDATE
-- =====================================================================
SELECT id, data::date, time_casa, gols_casa, gols_visitante, time_visitante, resultado, gols_texto
FROM jogos
WHERE id IN (10, 25, 35, 49, 58, 64, 69, 81, 108)
ORDER BY id;
