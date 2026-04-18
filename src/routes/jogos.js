import express from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';

const router = express.Router();

// =============================================================
// Schemas de validação
// =============================================================

const JogoSchema = z.object({
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use formato YYYY-MM-DD'),
    time_casa: z.string().min(1).max(60),
    time_visitante: z.string().min(1).max(60),
    campeonato: z.string().max(40).optional().nullable(),
    genero: z.enum(['M', 'F', 'S-20']).optional().default('M'),
    estadio: z.string().max(60).optional().nullable(),
    status_presenca: z.enum(['PRESENTE','FALTEI','REVENDA','CASHBACK','AGENDADO','AUSENTE'])
        .optional().default('PRESENTE'),
    setor: z.string().max(60).optional().nullable(),
    assento: z.string().max(40).optional().nullable(),
    valor_pago: z.number().nonnegative().optional().nullable(),
    gols_casa: z.number().int().nonnegative().optional().nullable(),
    gols_visitante: z.number().int().nonnegative().optional().nullable(),
    resultado: z.enum(['V', 'E', 'D']).optional().nullable(),
    foi_classico: z.boolean().optional().default(false),
    teve_penal: z.boolean().optional().default(false),
    observacoes: z.string().optional().nullable(),
});

// =============================================================
// Helpers
// =============================================================

const DIAS_SEMANA = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];

function diaDaSemana(dateStr) {
    const d = new Date(dateStr + 'T12:00:00Z');
    // getUTCDay: 0=Domingo..6=Sábado
    const idx = d.getUTCDay();
    return DIAS_SEMANA[(idx + 6) % 7];
}

function inferirMando(timeCasa, timeVisitante) {
    if (timeCasa === 'Corinthians') return 'MANDANTE';
    if (timeVisitante === 'Corinthians') return 'VISITANTE';
    return 'NEUTRO';
}

function inferirResultado(body) {
    // Se já veio resultado explícito, usa
    if (body.resultado) return body.resultado;
    // Se tem placar e é jogo do Corinthians, calcula
    if (body.gols_casa == null || body.gols_visitante == null) return null;
    const isCor = body.time_casa === 'Corinthians' || body.time_visitante === 'Corinthians';
    if (!isCor) return null;
    const golsPro = body.time_casa === 'Corinthians' ? body.gols_casa : body.gols_visitante;
    const golsCon = body.time_casa === 'Corinthians' ? body.gols_visitante : body.gols_casa;
    if (golsPro > golsCon) return 'V';
    if (golsPro < golsCon) return 'D';
    return 'E';
}

// =============================================================
// GET /jogos — listar com filtros
// =============================================================
router.get('/', async (req, res, next) => {
    try {
        const {
            ano,
            rival,
            campeonato,
            resultado,
            status_presenca,
            is_corinthians,
            estadio,
            foi_classico,
            limit = 50,
            offset = 0,
            order = 'desc',
        } = req.query;

        const conds = [];
        const params = [];

        if (ano)         { params.push(parseInt(ano));        conds.push(`EXTRACT(YEAR FROM data) = $${params.length}`); }
        if (rival)       { params.push(`%${rival}%`);         conds.push(`(time_visitante ILIKE $${params.length} OR time_casa ILIKE $${params.length})`); }
        if (campeonato)  { params.push(`%${campeonato}%`);    conds.push(`campeonato ILIKE $${params.length}`); }
        if (resultado)   { params.push(resultado);            conds.push(`resultado = $${params.length}`); }
        if (status_presenca) { params.push(status_presenca);  conds.push(`status_presenca = $${params.length}`); }
        if (is_corinthians !== undefined) {
            params.push(is_corinthians === 'true' || is_corinthians === '1');
            conds.push(`is_corinthians = $${params.length}`);
        }
        if (estadio)     { params.push(`%${estadio}%`);       conds.push(`estadio ILIKE $${params.length}`); }
        if (foi_classico !== undefined) {
            params.push(foi_classico === 'true' || foi_classico === '1');
            conds.push(`foi_classico = $${params.length}`);
        }

        const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
        const ord = order === 'asc' ? 'ASC' : 'DESC';

        params.push(Math.min(parseInt(limit), 500));
        params.push(parseInt(offset));

        const sql = `
            SELECT * FROM jogos
            ${where}
            ORDER BY data ${ord}, id ${ord}
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `;

        console.log('[jogos] filtros:', req.query, 'conds:', conds, 'params:', params);

        const { rows } = await query(sql, params);

        // Total para paginação
        const countSql = `SELECT COUNT(*)::int AS total FROM jogos ${where}`;
        const countParams = params.slice(0, params.length - 2);
        const { rows: countRows } = await query(countSql, countParams);

        console.log(`[jogos] retornou ${rows.length} de ${countRows[0].total} total`);

        res.json({
            total: countRows[0].total,
            count: rows.length,
            jogos: rows,
        });
    } catch (err) {
        console.error('[jogos] ERRO:', err);
        next(err);
    }
});

// =============================================================
// GET /jogos/:id
// =============================================================
router.get('/:id', async (req, res, next) => {
    try {
        const { rows } = await query('SELECT * FROM jogos WHERE id = $1', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'jogo_nao_encontrado' });
        res.json(rows[0]);
    } catch (err) { next(err); }
});

// =============================================================
// POST /jogos — adicionar jogo novo
// =============================================================
router.post('/', async (req, res, next) => {
    try {
        const parsed = JogoSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: 'validation_failed',
                detalhes: parsed.error.flatten().fieldErrors,
            });
        }
        const body = parsed.data;

        const is_corinthians =
            body.time_casa === 'Corinthians' || body.time_visitante === 'Corinthians';
        const mando = inferirMando(body.time_casa, body.time_visitante);
        const dia_semana = diaDaSemana(body.data);
        const resultado = inferirResultado(body);

        const { rows } = await query(
            `INSERT INTO jogos (
                data, dia_semana, time_casa, time_visitante, is_corinthians, mando,
                campeonato, genero, estadio, status_presenca, setor, assento,
                valor_pago, gols_casa, gols_visitante, resultado, foi_classico, teve_penal,
                observacoes
            ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
            ) RETURNING *`,
            [
                body.data, dia_semana, body.time_casa, body.time_visitante,
                is_corinthians, mando,
                body.campeonato ?? null, body.genero ?? 'M',
                body.estadio ?? null, body.status_presenca ?? 'PRESENTE',
                body.setor ?? null, body.assento ?? null,
                body.valor_pago ?? null,
                body.gols_casa ?? null, body.gols_visitante ?? null,
                resultado,
                body.foi_classico ?? false, body.teve_penal ?? false,
                body.observacoes ?? null,
            ]
        );

        res.status(201).json({ criado: true, jogo: rows[0] });
    } catch (err) { next(err); }
});

// =============================================================
// PATCH /jogos/:id — atualizar campos
// =============================================================
router.patch('/:id', async (req, res, next) => {
    try {
        const allowed = [
            'data','time_casa','time_visitante','campeonato','genero','estadio',
            'status_presenca','setor','assento','valor_pago','gols_casa',
            'gols_visitante','resultado','foi_classico','teve_penal','observacoes',
        ];
        const fields = [];
        const values = [];
        for (const [k, v] of Object.entries(req.body)) {
            if (!allowed.includes(k)) continue;
            values.push(v);
            fields.push(`${k} = $${values.length}`);
        }
        if (!fields.length) {
            return res.status(400).json({ error: 'nenhum_campo_valido' });
        }

        values.push(req.params.id);
        const { rows } = await query(
            `UPDATE jogos SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
            values
        );
        if (!rows.length) return res.status(404).json({ error: 'jogo_nao_encontrado' });
        res.json({ atualizado: true, jogo: rows[0] });
    } catch (err) { next(err); }
});

// =============================================================
// DELETE /jogos/:id
// =============================================================
router.delete('/:id', async (req, res, next) => {
    try {
        const { rowCount } = await query('DELETE FROM jogos WHERE id = $1', [req.params.id]);
        if (!rowCount) return res.status(404).json({ error: 'jogo_nao_encontrado' });
        res.json({ removido: true });
    } catch (err) { next(err); }
});

export default router;
