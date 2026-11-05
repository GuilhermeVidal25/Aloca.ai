# API local do Aloca.ai

URL: `http://localhost:3000/api`. O servidor escuta apenas na máquina local. Os endpoints não possuem autenticação multiusuário e não devem ser expostos publicamente.

## Contrato de requisitos

```json
{
  "title": "Backend MVP",
  "mandatory_skills": ["Node.js", "TypeScript", "PostgreSQL"],
  "desired_skills": ["Docker"],
  "min_availability": 50,
  "start_month": "2026-11",
  "duration_months": 3,
  "seniority": null
}
```

Skills obrigatórias: 1–20. Dedicação: inteiro 1–100. Duração: 1–12 meses. Senioridade nula significa não eliminatória; quando informada, exige o nível exato. As equivalências de skills são explícitas, sem inferir conhecimento por proximidade semântica.

## Endpoints

| Método | Caminho | Uso |
|---|---|---|
| GET | `/health` | Processo disponível |
| GET | `/status` | Estado do banco, fonte, persistência, provedor e modelo; configuração de IA não garante cota |
| POST | `/chat/parse` | Recebe `{ "message": "..." }`; devolve requisitos para conferência |
| POST | `/chat/match` | Recebe requisitos; devolve consulta com ID, origem, candidatos, evidências e duração |
| GET | `/history` | Até 100 consultas e 100 solicitações recentes |
| POST | `/allocations/request` | Recebe `{ "searchId": "UUID", "candidateId": "42" }`; registra pedido pendente |

O pedido retorna 201 na criação e 200 em repetição, com o mesmo ID. Há restrição única no PostgreSQL por consulta/candidato, inclusive em chamadas concorrentes. A elegibilidade é consultada novamente antes do primeiro registro. **Registrar o pedido não reserva nem efetiva alocação.**

Nenhum erro de consulta interna provoca fallback externo. O fallback só ocorre após uma consulta interna bem-sucedida sem candidatos elegíveis. Períodos sem cobertura global dos planejamentos retornam 422. A ausência de planejamento individual segue a regra do desafio: zero alocação; a liberação depende de confirmação do GP.

## Persistência

Fonte normal: PostgreSQL. Histórico e pedidos ficam no schema `"AlocaAI"`, separado de `"InHire"`. Migrações são transacionais e não alteram as tabelas do desafio. O arquivo legado `data/history.json` é importado de forma idempotente na inicialização, sem apagá-lo. Os registros antigos continuam no banco; o limite de 100 vale apenas para a listagem.

O modo snapshot é explícito, via `SQL_DUMP_PATH`, com persistência em arquivo; não há fallback silencioso entre fontes. `Iniciar.command --snapshot` ativa esse modo para demonstração offline.

## Erros

Formato: `{ "code": "...", "error": "Mensagem em português", "requestId": "..." }`. Erros de validação incluem `fields`.

| Status | Exemplos |
|---|---|
| 400 | JSON inválido |
| 403 | Origem externa não permitida |
| 404 | Recomendação ou rota inexistente |
| 409 | Elegibilidade/capacidade mudou desde a consulta |
| 413 | Corpo maior que 20 KB |
| 422 | Requisitos inválidos, falta de esclarecimento ou período sem cobertura |
| 429 | Limite temporário de requisições à IA |
| 502 | Falha de interpretação no provedor de IA |
| 503 | Banco indisponível, IA sem chave ou quota esgotada |
| 504 | Tempo limite de interpretação |

A API nunca devolve chaves, strings de conexão ou mensagens internas do PostgreSQL. Cada resposta inclui `X-Request-Id`.

## Provedores de IA

Gemini é o provedor configurado para a demonstração (`LLM_PROVIDER=gemini`, `GEMINI_MODEL=gemini-2.5-flash`). Autenticação por `GEMINI_API_KEY`, somente em cabeçalho do servidor. A descrição da demanda é enviada ao Google, sem os perfis da base. Saída JSON é validada por Zod antes de ser apresentada para confirmação. Mensagens sem skills retornam `AI_NEEDS_CLARIFICATION`; saídas inválidas ou truncadas são rejeitadas. A chave nunca é enviada no endereço da chamada, no navegador ou nas respostas de erro.

OpenAI é uma alternativa explícita via `LLM_PROVIDER=openai`; não há fallback automático entre provedores.
