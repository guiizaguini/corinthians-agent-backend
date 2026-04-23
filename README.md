# Fiel — Diário do Torcedor (SaaS)

Plataforma multi-tenant onde torcedores criam conta e registram os jogos que foram, com valor pago, setor, observações — e acompanham estatísticas pessoais de retrospecto, gastos e presença.

Arquitetura white-label: hoje só Corinthians tem catálogo, mas a estrutura já suporta múltiplos clubes (Palmeiras, Flamengo, etc).

## Duas APIs convivem

- **v2 (SaaS, novo)** — auth JWT, tabelas `clubs` / `users` / `games` / `attendances`. Rotas sob `/auth`, `/games`, `/attendances`, `/me`.
- **v1 (legado)** — rotas antigas `/jogos` e `/estatisticas` (protegidas por `x-api-key`) e `/public/snapshot`. Continuam funcionando em paralelo durante a transição, servem o dashboard antigo (`/dashboard`, `/museu`) e o MCP Agent da Botmaker.

## Endpoints v2 (SaaS)

### Auth

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/signup` | `{ email, password (8+), display_name?, club_slug? }` → `{ token, user }` |
| POST | `/auth/login` | `{ email, password }` → `{ token, user }` |
| GET  | `/auth/me` | Bearer → `{ user }` |

### Catálogo de jogos (do clube do user)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/games?ano=&rival=&campeonato=&so_presenca=&limit=` | Lista jogos do catálogo (já com o attendance do user via LEFT JOIN) |
| GET | `/games/:id` | Um jogo + attendance do user |

### Attendances (ingressos do user)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/attendances` | Lista do user |
| POST | `/attendances` | Cria/upsert: `{ game_id, status?, setor?, assento?, valor_pago?, observacoes? }` |
| PATCH | `/attendances/:id` | Atualiza campos |
| DELETE | `/attendances/:id` | Remove |

### Estatísticas do user

| Método | Rota | Descrição |
|---|---|---|
| GET | `/me/snapshot` | Tudo que a dashboard precisa: geral, por_ano, por_campeonato, por_rival, por_estadio, por_setor, gastos, top_goleadas, classicos, jogos |

Todas as rotas protegidas pedem `Authorization: Bearer <token>`.

### Páginas

- `/login`, `/signup` — entrada no app
- `/app` — dashboard do usuário logado (catálogo + meus ingressos)
- `/dashboard`, `/museu` — páginas legadas (leem do `/public/snapshot` antigo)

## Rodando localmente

```bash
# 1. Postgres
docker run -d --name pg-cor -p 5432:5432 \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=corinthians \
  postgres:16

# 2. Env
cp .env.example .env
# Edite: DATABASE_URL, JWT_SECRET (32+ chars), SEED_USER_PASSWORD

# 3. Deps
npm install

# 4. Rodar migrações v1 (legado) + v2 + popular com jogos da planilha
npm run migrate:seed                # cria tabela `jogos` legada + popula
npm run migrate:v2:from-legacy      # cria tabelas v2 + copia jogos pra catálogo
                                     #  + cria user seed com as attendances

# 5. Start
npm run dev
```

## Deploy no Railway

### Primeira vez (v1 → v2)

Se o projeto já tá rodando v1 no Railway, pra habilitar o SaaS:

1. **Adicionar variáveis no Railway** (Service → Variables):
   - `JWT_SECRET` — gere com `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`
   - `SEED_USER_EMAIL` — seu email
   - `SEED_USER_PASSWORD` — senha pro seed user (mínimo 8 chars)
   - `SEED_USER_NAME` — seu nome
2. **Push** do código novo — Railway faz deploy automático.
3. **Rodar a migração v2** uma única vez:
   ```bash
   railway run npm run migrate:v2:from-legacy
   ```
   Isso cria as tabelas `clubs`, `users`, `games`, `attendances`, copia todos os jogos do `jogos` legado pro catálogo novo e cria sua conta seed com todas as presenças já migradas.

4. Pode remover `SEED_USER_PASSWORD` do Railway depois — ela só é usada no momento do seed.

### Projeto novo (só v2)

Igual ao antigo, mas com `JWT_SECRET` nas variáveis (e sem precisar rodar a migração `from-legacy`).

## Schema v2

```
clubs          (id, slug, name, short_name, primary_color, secondary_color)
users          (id, email, password_hash, display_name, club_id, is_admin)
games          (id, club_id, data, time_casa, time_visitante, campeonato,
                gols_casa, gols_visitante, resultado, foi_classico, ...)
attendances    (id, user_id, game_id, status, setor, assento, valor_pago, observacoes)
```

`attendances` tem UNIQUE(`user_id`, `game_id`) — um ingresso por jogo por user.

`games.resultado` é V/E/D do ponto de vista do `clubs.name` dono do jogo (o campo é derivado comparando `time_casa` com o nome do clube).

## Integração com o MCP Agent da Botmaker (v1 legada)

As tools registradas na Botmaker continuam apontando pras rotas v1 (`/jogos`, `/estatisticas/*`) com o header `x-api-key`. Nada precisa mudar lá. Quando a migração estiver completa, dá pra trocar a integração pras rotas v2 (passando um token específico pra conta do agente, ou mantendo uma API key separada — a definir).
