-- Ajuste incremental: jogos restantes (id 108, 25)
-- Gerado em 2026-04-21T21:42:29.449Z

BEGIN;

-- id 25: 2020-02-12 Corinthians 2x1 Guarani (PAR) (Libertadores)
UPDATE jogos SET
    gols_texto = 'Luan 8''1T (COR); Mauro Boselli 31''1T (COR); Fernando Fernández 7''2T (GUA)',
    autores_gols = NULL
WHERE id = 25;

-- id 108: 2025-05-03 Corinthians 4x2 Internacional (Brasileiro)
UPDATE jogos SET
    gols_texto = 'Yuri Alberto 25''1T (COR); Aguirre 37''1T (INT); Thiago Maia 42''1T (INT); Yuri Alberto 19''2T (COR); Yuri Alberto 45''2T (COR); Igor Coronado 45''2T (COR)',
    autores_gols = NULL
WHERE id = 108;

COMMIT;
