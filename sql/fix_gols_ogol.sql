-- =====================================================================
-- NORMALIZAÇÃO DE gols_texto E publico_total A PARTIR DO OGOL.COM.BR
-- Gerado em 2026-04-21T21:03:44.204Z
-- 24 jogos processados
-- =====================================================================

BEGIN;

-- id 1: 2013-08-11 Corinthians 2x0 Vitória (Brasileiro)
UPDATE jogos SET
    gols_texto = 'Ralf 7''1T (COR); Alexandre Pato 7''2T (COR)',
    publico_total = 25603,
    autores_gols = NULL
WHERE id = 1;

-- id 36: 2022-02-06 Corinthians 3x0 Palmeiras (null)
-- WARN: divergência placar. Banco: 3x0 (3COR-0ADV). Ogol: 3COR-2ADV gols parseados. Revise mandante/placar.
UPDATE jogos SET
    gols_texto = 'Neto Berola 6''1T (ITU); Fábio Santos 31''1T (COR); Cleberson 42''1T (ITU); Giuliano 1''2T (COR); Paulinho 27''2T (COR)',
    autores_gols = NULL
WHERE id = 36;

-- id 38: 2022-02-27 Corinthians 1x0 Bragantino (Paulista)
UPDATE jogos SET
    gols_texto = 'Gustavo Mosquito 35''2T (COR)',
    autores_gols = NULL
WHERE id = 38;

-- id 43: 2022-05-11 Corinthians 2x0 Portuguesa-RJ (Copa do Brasil)
UPDATE jogos SET
    gols_texto = 'Júnior Moraes 8''1T (COR); Giuliano 32''1T (COR)',
    autores_gols = NULL
WHERE id = 43;

-- id 73: 2023-06-28 Corinthians 4x0 Liverpool URU (Libertadores)
-- WARN: divergência placar. Banco: 4x0 (4COR-0ADV). Ogol: 3COR-0ADV gols parseados. Revise mandante/placar.
UPDATE jogos SET
    gols_texto = 'Matheus Araújo 32''1T (COR); Felipe Augusto 19''2T (COR); Adson 35''2T (COR)',
    autores_gols = NULL
WHERE id = 73;

-- id 75: 2023-07-15 Corinthians 3x2 América-MG (Copa do Brasil)
UPDATE jogos SET
    gols_texto = 'Renato Augusto 2''2T (COR); Yuri Alberto 20''2T (COR); Róger Guedes 27''2T (COR); Martín Benítez 24''2T (AMM); Gonzalo Mastriani 38''2T (AMM)',
    autores_gols = NULL
WHERE id = 75;

-- id 76: 2023-09-26 Corinthians 1x1 Fortaleza (Sulamericana)
UPDATE jogos SET
    gols_texto = 'Zé Welison 22''1T (FOR); Yuri Alberto 40''1T (COR)',
    publico_total = 48905,
    autores_gols = NULL
WHERE id = 76;

-- id 77: 2023-10-07 Corinthians 1x1 Flamengo (Brasileiro)
UPDATE jogos SET
    gols_texto = 'Gerson 9''2T (FLA); Fábio Santos 34''2T (COR)',
    autores_gols = NULL
WHERE id = 77;

-- id 78: 2023-10-29 Corinthians 1x1 Santos (Brasileiro)
UPDATE jogos SET
    gols_texto = 'Jean Lucas (gol contra) 12''2T (COR); Stiven Mendoza 45+9''2T (SAN)',
    autores_gols = NULL
WHERE id = 78;

-- id 82: 2024-02-04 Corinthians 1x3 Novorizontino (Paulista)
UPDATE jogos SET
    gols_texto = 'Jenison 45+2''1T (NOV); Jenison 3''2T (NOV); Jenison 13''2T (NOV); Yuri Alberto 27''2T (COR)',
    autores_gols = NULL
WHERE id = 82;

-- id 83: 2024-04-09 Corinthians 4x0 Nacional URU (Sulamericana)
UPDATE jogos SET
    gols_texto = 'Ángel Romero 22''1T (COR); Yuri Alberto 19''2T (COR); Ángel Romero 28''2T (COR); Pedro Raul 44''2T (COR)',
    autores_gols = NULL
WHERE id = 83;

-- id 85: 2024-05-04 Corinthians 0x0 Fortaleza (Brasileiro)
UPDATE jogos SET
    gols_texto = '',
    publico_total = 42456,
    autores_gols = NULL
WHERE id = 85;

-- id 86: 2024-06-26 Corinthians 1x1 Cuiabá (Brasileiro)
UPDATE jogos SET
    gols_texto = 'Marllon 5''1T (CUI); Matheus Bidu 41''2T (COR)',
    publico_total = 38219,
    autores_gols = NULL
WHERE id = 86;

-- id 89: 2024-07-31 Corinthians 0x0 Grêmio (Copa do Brasil)
UPDATE jogos SET
    gols_texto = '',
    publico_total = 43014,
    autores_gols = NULL
WHERE id = 89;

-- id 90: 2024-08-04 Corinthians 0x0 Juventude (Brasileiro)
-- WARN: divergência placar. Banco: 0x0 (0COR-0ADV). Ogol: 1COR-1ADV gols parseados. Revise mandante/placar.
UPDATE jogos SET
    gols_texto = 'Alan Ruschel 4''1T (JUV); Pedro Henrique 3''2T (COR)',
    autores_gols = NULL
WHERE id = 90;

-- id 92: 2024-10-20 Corinthians 0x0 Flamengo (Copa do Brasil)
UPDATE jogos SET
    gols_texto = '',
    publico_total = 46977,
    autores_gols = NULL
WHERE id = 92;

-- id 93: 2024-10-24 Corinthians 2x2 Racing (Sulamericana)
UPDATE jogos SET
    gols_texto = 'Maxi Salas 6''1T (RAC); Yuri Alberto 11''1T (COR); Yuri Alberto 33''1T (COR); Gastón Martirena 9''2T (RAC)',
    autores_gols = NULL
WHERE id = 93;

-- id 94: 2024-11-24 Corinthians 3x1 Vasco (Brasileiro)
UPDATE jogos SET
    gols_texto = 'Gustavo Henrique 11''1T (COR); Rodrigo Garro 15''1T (COR); Rodrigo Garro 25''1T (COR); Pumita Rodríguez 32''2T (VAS)',
    autores_gols = NULL
WHERE id = 94;

-- id 110: 2025-07-23 Corinthians 0x0 Cruzeiro (Brasileiro)
UPDATE jogos SET
    gols_texto = '',
    publico_total = 48932,
    autores_gols = NULL
WHERE id = 110;

-- id 113: 2025-08-16 Corinthians 1x2 Bahia (Brasileiro)
UPDATE jogos SET
    gols_texto = 'Michel Araújo 2''1T (BAH); Gui Negão 31''1T (COR); Willian José 43''1T (BAH)',
    publico_total = 42183,
    autores_gols = NULL
WHERE id = 113;

-- id 114: 2025-10-18 Corinthians 1x0 Atlético-MG (Brasileiro)
UPDATE jogos SET
    gols_texto = 'Maycon 4''2T (COR)',
    publico_total = 39640,
    autores_gols = NULL
WHERE id = 114;

-- id 116: 2025-12-14 Corinthians 1x2 Cruzeiro (Copa do Brasil)
UPDATE jogos SET
    gols_texto = 'Matheus Bidu 10''2T (COR); Keny Arroyo 40''1T (CRU); Keny Arroyo 6''2T (CRU)',
    publico_total = 48905,
    autores_gols = NULL
WHERE id = 116;

-- id 117: 2025-12-17 Corinthians 0x0 Vasco (Copa do Brasil)
UPDATE jogos SET
    gols_texto = '',
    autores_gols = NULL
WHERE id = 117;

-- id 118: 2025-12-21 Vasco 2x1 Corinthians (Copa do Brasil)
-- WARN: divergência placar. Banco: 2x1 (1COR-2ADV). Ogol: 2COR-1ADV gols parseados. Revise mandante/placar.
UPDATE jogos SET
    gols_texto = 'Yuri Alberto 19''1T (COR); Nuno Moreira 41''1T (VAS); Memphis Depay 17''2T (COR)',
    publico_total = 67111,
    autores_gols = NULL
WHERE id = 118;

COMMIT;

-- =====================================================================
-- PENDENTES (23 jogos) - precisam busca manual/scraping individual
-- =====================================================================
-- id 23: 2019-11-16 Corinthians 3x0 São Paulo (Paulista) - falta: gols_texto
-- id 32: 2021-12-01 PSG ?x? Nice (null) - falta: gols_texto+publico_total
-- id 33: 2022-01-25 Corinthians 0x0 Ferroviária (Paulista) - falta: gols_texto
-- id 34: 2022-01-30 Santo André 1x0 Corinthians (Paulista) - falta: gols_texto+publico_total
-- id 37: 2022-02-10 Corinthians 3x0 Mirassol (Paulista) - falta: gols_texto+publico_total
-- id 39: 2022-03-24 Corinthians 1x1 Guarani (Paulista) - falta: gols_texto+publico_total
-- id 42: 2022-05-01 Corinthians 1x0 Fortaleza (Brasileiro) - falta: gols_texto+publico_total
-- id 44: 2022-05-22 Corinthians 1x1 São Paulo (Brasileiro) - falta: gols_texto+publico_total
-- id 45: 2022-05-29 Corinthians 1x1 América-MG (Brasileiro) - falta: gols_texto+publico_total
-- id 68: 2023-03-12 Corinthians 1x1 Ituano (Paulista) - falta: gols_texto+publico_total
-- id 69: 2023-04-17 Corinthians 3x2 Palmeiras (null) - falta: publico_total
-- id 70: 2023-05-02 Corinthians 2x0 Remo (Copa do Brasil) - falta: gols_texto+publico_total
-- id 71: 2023-05-02 Corinthians 0x2 Ind. Del Valle (Libertadores) - falta: gols_texto+publico_total
-- id 72: 2023-05-31 Corinthians 2x0 Atlético-MG (Copa do Brasil) - falta: gols_texto+publico_total
-- id 80: 2024-01-25 Corinthians 1x0 Cruzeiro (Copinha) - falta: gols_texto
-- id 84: 2024-04-14 Corinthians 0x0 Atlético-MG (Brasileiro) - falta: gols_texto+publico_total
-- id 98: 2025-02-09 Corinthians 2x0 São Bernardo (Paulista) - falta: gols_texto+publico_total
-- id 100: 2025-02-26 Corinthians 3x2 U. Central [VEN] (Libertadores) - falta: gols_texto+publico_total
-- id 102: 2025-03-09 Corinthians 2x1 Santos (Paulista) - falta: gols_texto+publico_total
-- id 103: 2025-03-12 Corinthians 2x0 Barcelona SC (Libertadores) - falta: gols_texto+publico_total
-- id 104: 2025-03-27 Corinthians 0x0 Palmeiras (Paulista) - falta: gols_texto
-- id 105: 2025-04-05 Corinthians 3x0 Vasco (Brasileiro) - falta: gols_texto+publico_total
-- id 129: 2026-03-11 Corinthians 0x2 Coritiba (Brasileiro) - falta: gols_texto+publico_total

-- =====================================================================
-- WARNS DE DIVERGÊNCIA (4)
-- =====================================================================
-- id 36 (2022-02-06 vs Palmeiras): banco=3x0, parse ogol=3-2
-- id 73 (2023-06-28 vs Liverpool URU): banco=4x0, parse ogol=3-0
-- id 90 (2024-08-04 vs Juventude): banco=0x0, parse ogol=1-1
-- id 118 (2025-12-21 vs Corinthians): banco=2x1, parse ogol=2-1

-- Verificação pós-update:
SELECT id, gols_texto, publico_total FROM jogos WHERE id IN (1, 36, 38, 43, 73, 75, 76, 77, 78, 82, 83, 85, 86, 89, 90, 92, 93, 94, 110, 113, 114, 116, 117, 118) ORDER BY id;
