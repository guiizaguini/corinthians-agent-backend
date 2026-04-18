# Corinthians Agent — Backend

API REST para alimentar um agente de IA (MCP Agent na Botmaker) que funciona como um especialista pessoal nos seus jogos do Corinthians.

## O que está aqui

- **Banco**: PostgreSQL com uma tabela `jogos` + views de retrospecto/estatísticas
- **API**: Node.js + Express com autenticação por API key
- **Seed**: 128 jogos já importados da sua planilha

## Endpoints

### Jogos

| Método | Rota | Descrição |
|---|---|---|
| GET | `/jogos` | Lista com filtros: `ano`, `rival`, `campeonato`, `resultado`, `status_presenca`, `is_corinthians`, `estadio`, `foi_classico`, `limit`, `offset`, `order` |
| GET | `/jogos/:id` | Um jogo específico |
| POST | `/jogos` | Adiciona jogo novo (o agente usa isso quando você diz "fui no jogo X") |
| PATCH | `/jogos/:id` | Atualiza campos de um jogo |
| DELETE | `/jogos/:id` | Remove um jogo |

### Estatísticas

| Método | Rota | Descrição |
|---|---|---|
| GET | `/estatisticas/retrospecto` | Retrospecto geral, filtros: `ano`, `campeonato`, `rival` |
| GET | `/estatisticas/por-ano` | Breakdown ano a ano |
| GET | `/estatisticas/por-campeonato` | Breakdown por campeonato |
| GET | `/estatisticas/por-rival?top=10` | Retrospecto contra cada adversário |
| GET | `/estatisticas/por-estadio` | Retrospecto por estádio |
| GET | `/estatisticas/gastos` | Total, ticket médio, gasto por ano |
| GET | `/estatisticas/resumo` | Tudo em uma chamada só (ótimo pro agente) |

### Saúde

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Healthcheck (usado pelo Railway) — sem auth |
| GET | `/` | Lista de endpoints — sem auth |

Todas as rotas exceto `/health` e `/` exigem o header `x-api-key`.

## Rodando localmente

```bash
# 1. Subir um postgres local (ou apontar pro do Railway)
docker run -d --name pg-cor -p 5432:5432 \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=corinthians \
  postgres:16

# 2. Configurar env
cp .env.example .env
# Edite .env com a DATABASE_URL e uma API_KEY

# 3. Instalar deps
npm install

# 4. Criar schema + popular com os 128 jogos
npm run migrate:seed

# 5. Subir a API
npm run dev
```

Testar:
```bash
curl http://localhost:3000/health

curl -H "x-api-key: sua-key" http://localhost:3000/estatisticas/resumo | jq

curl -H "x-api-key: sua-key" \
     "http://localhost:3000/jogos?ano=2024&resultado=V&limit=5" | jq
```

## Deploy no Railway

### Passo 1: Subir o código pro GitHub

```bash
cd backend
git init && git add . && git commit -m "initial commit"
gh repo create corinthians-agent-backend --private --source=. --push
# ou manualmente: criar repo no GitHub e dar push
```

### Passo 2: Criar projeto no Railway

1. Entre em [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo** → selecione o repo
2. No mesmo projeto, clique em **+ New** → **Database** → **Add PostgreSQL**
3. O Railway injeta automaticamente a variável `DATABASE_URL` no seu serviço web, mas **confirme**: na aba do serviço web → **Variables** → deve aparecer `DATABASE_URL` referenciando o Postgres
4. Adicione manualmente a variável `API_KEY` com uma string longa e aleatória:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
5. Aguarde o deploy terminar. O Railway usa `railway.json` para configurar healthcheck em `/health`.

### Passo 3: Rodar as migrações (1ª vez)

No Railway você pode rodar one-off commands. A maneira mais fácil:

**Opção A — CLI do Railway:**
```bash
npm install -g @railway/cli
railway login
railway link   # vincula ao projeto
railway run npm run migrate:seed
```

**Opção B — terminal do próprio Railway:** no serviço web, aba **Settings → Deploy → Custom Start Command**, troque temporariamente para `npm run migrate:seed && npm start`, faça redeploy, depois volte pra `npm start`.

### Passo 4: Gerar o domínio público

No serviço web → **Settings** → **Networking** → **Generate Domain**. Você receberá algo tipo `https://corinthians-agent-backend-production.up.railway.app`.

Teste:
```bash
curl https://seu-dominio.up.railway.app/health
```

## Integração com o MCP Agent da Botmaker

Dentro da Botmaker, ao configurar o MCP Agent, registre cada endpoint como uma tool. Sugestão de definições (ajuste conforme o painel da Botmaker):

### Tool: listar_jogos
- **Método**: GET
- **URL**: `https://seu-dominio.up.railway.app/jogos`
- **Headers**: `x-api-key: <sua API_KEY>`
- **Query params opcionais**: `ano`, `rival`, `campeonato`, `resultado`, `status_presenca`, `limit`
- **Quando chamar**: usuário pede lista de jogos (ex.: "quais jogos eu fui em 2024?", "me lista as vitórias contra o Palmeiras")

### Tool: adicionar_jogo
- **Método**: POST
- **URL**: `https://seu-dominio.up.railway.app/jogos`
- **Headers**: `x-api-key: <sua API_KEY>`, `Content-Type: application/json`
- **Body** (JSON):
  ```json
  {
    "data": "2026-05-10",
    "time_casa": "Corinthians",
    "time_visitante": "Palmeiras",
    "campeonato": "Brasileiro",
    "estadio": "Neo Química Arena",
    "setor": "Leste Inf Lateral",
    "assento": "[426] A-47 [N]",
    "valor_pago": 120.00,
    "gols_casa": 2,
    "gols_visitante": 1,
    "foi_classico": true
  }
  ```
- **Quando chamar**: usuário diz "fui no jogo ontem/tal dia", "acabei de voltar do jogo contra o X"
- **Observação**: `resultado`, `mando`, `dia_semana` e `is_corinthians` são inferidos automaticamente pelo backend — não precisa mandar

### Tool: retrospecto
- **Método**: GET
- **URL**: `https://seu-dominio.up.railway.app/estatisticas/retrospecto`
- **Headers**: `x-api-key: <sua API_KEY>`
- **Query params opcionais**: `ano`, `campeonato`, `rival`
- **Quando chamar**: "qual meu aproveitamento", "como estou contra o São Paulo", "retrospecto de 2023"

### Tool: resumo_completo
- **Método**: GET
- **URL**: `https://seu-dominio.up.railway.app/estatisticas/resumo`
- **Headers**: `x-api-key: <sua API_KEY>`
- **Quando chamar**: "me dá um panorama geral", "resumão" — retorna tudo que o agente pode precisar numa chamada só

### Tool: gastos
- **Método**: GET
- **URL**: `https://seu-dominio.up.railway.app/estatisticas/gastos`
- **Headers**: `x-api-key: <sua API_KEY>`
- **Quando chamar**: "quanto já gastei", "ticket médio", "meu gasto em 2024"

### Prompt sugerido pro agente

> Você é um especialista pessoal nos jogos do Corinthians a que o usuário foi. Sempre que ele perguntar sobre estatísticas, retrospectos ou jogos específicos, use as tools para buscar os dados reais — nunca chute. Quando ele falar que foi a um jogo novo, use `adicionar_jogo` confirmando os dados antes. Datas sempre em formato YYYY-MM-DD. Resultados são sempre relativos ao Corinthians (V=vitória, E=empate, D=derrota). Quando o usuário falar de um jogo sem dar todos os detalhes, puxe os que faltam pela data/adversário antes de inserir.

## Estrutura do banco

### Tabela `jogos`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | SERIAL PK | |
| `data` | DATE | |
| `dia_semana` | VARCHAR | derivado, mas persistido |
| `time_casa` | VARCHAR | |
| `time_visitante` | VARCHAR | |
| `is_corinthians` | BOOL | `true` se Corinthians joga (mesmo como visitante) |
| `mando` | ENUM | MANDANTE, VISITANTE, NEUTRO |
| `campeonato` | VARCHAR | Brasileiro, Paulista, Libertadores, etc |
| `genero` | VARCHAR | M, F, S-20 |
| `estadio` | VARCHAR | |
| `status_presenca` | ENUM | PRESENTE, FALTEI, REVENDA, CASHBACK, AGENDADO, AUSENTE |
| `setor` | VARCHAR | |
| `assento` | VARCHAR | |
| `valor_pago` | NUMERIC(10,2) | |
| `gols_casa` | INT | |
| `gols_visitante` | INT | |
| `resultado` | CHAR(1) | V/E/D relativo ao Corinthians |
| `foi_classico` | BOOL | |
| `teve_penal` | BOOL | cobrou ou sofreu pênalti |
| `observacoes` | TEXT | campo livre para notas |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

### Views
- `v_jogos_validos` — só jogos do Corinthians com presença confirmada e resultado
- `v_retrospecto_geral`, `v_retrospecto_por_ano`, `v_retrospecto_por_campeonato`, `v_retrospecto_por_rival`, `v_retrospecto_por_estadio`, `v_gastos_por_ano`
