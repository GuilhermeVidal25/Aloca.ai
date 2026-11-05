# Aloca.ai

Assistente de alocação para a equipe de TI da VINT_GLOBAL. Projeto autoral desenvolvido para o hackathon.

Documentação completa: [índice](docs/README.md), [instalação Windows/Linux/macOS](docs/instalacao.md), [manual de fluxos](docs/fluxos.md), [manual em PDF](output/pdf/aloca-ai-manual-da-plataforma.pdf) e [testes e cobertura](docs/testes.md).

## Executar

Requisitos: Node.js 22+, npm e Docker com Compose para o modo PostgreSQL.

1. Clone o repositório e execute `npm ci`.
2. Copie `.env.example` para `.env.local`. Configure `GEMINI_API_KEY` e `DATABASE_URL` apenas nesse arquivo local. A senha na URL deve ser codificada para URL quando contiver caracteres especiais.
3. Obtenha o pacote oficial da base do desafio. Coloque `01-hackathon.sql` em `challenge/db/01-hackathon.sql` e o `.env` do pacote em `challenge/.env` (variável `POSTGRES_PASSWORD`). A senha deve corresponder à configurada em `DATABASE_URL`.
4. Execute `docker compose up -d --wait` para importar o banco na primeira execução.
5. Execute `npm run dev`. A aplicação fica em http://localhost:3000.

Nos três sistemas, `npm run start:local` inicia banco e aplicação. No macOS, `Iniciar.command` é um atalho opcional para o mesmo iniciador Node. Credenciais fora da raiz podem ser configuradas em `.env.runtime` com `ALOCA_ENV_FILE="/caminho/para/.env.local"`; no Windows use um caminho como `C:/Users/usuario/config/aloca.env`. Consulte o guia de instalação para PowerShell e Linux/macOS.

O rodapé identifica **PostgreSQL conectado**. Não há dados inventados na busca: as consultas usam a base fornecida pelo desafio. Isso não representa uma integração ativa com os sistemas da VINT_GLOBAL. Chaves, base do desafio e histórico de uso não são distribuídos neste repositório.

A configuração do banco fica em `DATABASE_URL`. A imagem e o dump ficam em `challenge/`, ignorado pelo Git. O banco é exposto somente em loopback. O modo `npm run start:snapshot` usa o dump para consulta de perfis; autenticação e solicitações continuam exigindo PostgreSQL. O rodapé identifica **Base do desafio · SQL**, sem troca silenciosa de fonte.

## Fluxo

1. Descrever a demanda no chat, ou escolher **Prefiro definir os critérios**.
2. Conferir e ajustar skills, dedicação, início, duração e senioridade.
3. Buscar profissionais internos. O percentual livre deve atender à dedicação em **cada mês**.
4. Consultar talentos externos somente se não houver internos elegíveis.
5. Registrar a solicitação. O histórico e os pedidos ficam no schema `"AlocaAI"` do PostgreSQL, separado das tabelas originais `"InHire"`. O arquivo legado `data/history.json` é importado sem apagar o original. No modo snapshot, a persistência continua em arquivo.

O MVP não efetiva alocações: pedidos ficam pendentes e não reservam capacidade. GP e administrador podem validar ou recusar o pedido com justificativa. Essa decisão administrativa não modifica o SGD nem reserva capacidade. A capacidade é derivada dos planejamentos; conforme a função fornecida no desafio, ausência de planejamento individual é tratada como zero alocação. Meses sem cobertura global são bloqueados. A confirmação do GP continua necessária.

## IA

A extração usa Gemini com saída estruturada em JSON e validação por Zod. A chave fica no servidor e não é enviada ao navegador. Apenas a descrição da demanda é enviada ao modelo; os perfis permanecem locais. Configure `LLM_PROVIDER=gemini`, `GEMINI_API_KEY` e, opcionalmente, `GEMINI_MODEL` (padrão `gemini-2.5-flash`). O endpoint `/api/status` identifica provedor, modelo e presença da configuração, sem expor a credencial.

Gemini foi validado com uma extração real. OpenAI continua disponível como alternativa explícita via `LLM_PROVIDER=openai`, `OPENAI_API_KEY` e `OPENAI_MODEL`. Não há troca automática entre provedores; uma falha é informada ao usuário. Os critérios manuais e o matching funcionam independentemente da IA.

Documentação: https://ai.google.dev/gemini-api/docs/structured-output e https://ai.google.dev/api/generate-content

## Demonstração com a base fornecida

Período: novembro de 2026 a janeiro de 2027, sem senioridade eliminatória.

- Interno: Node.js, TypeScript e PostgreSQL; dedicação de 50%.
- Externo: Delphi e C#; dedicação de 100%.
- Vazio: uma skill que não existe no catálogo.

Os exemplos são cenários de verificação; os resultados vêm dos registros do desafio.

## Verificação

`npm test`: regras de elegibilidade, equivalências, período entre anos, disponibilidade por mês e prioridade interna.

`npm run build`: TypeScript e compilação de produção.

`npm run verify:postgres`: verifica migração, importação idempotente, equivalência de resultados com o dump, persistência e unicidade sob concorrência. Remove apenas os registros temporários gerados por esta verificação.

Contrato dos endpoints e códigos de erro: [docs/api.md](docs/api.md).

## Limites

Aplicação local para demonstração, com autenticação e autorização por perfil. Não inclui reserva efetiva no SGD, mensageria, embeddings ou predição de produtividade. O ranking considera cobertura de desejáveis, níveis de skills obrigatórias, evidências de projetos com horizonte semelhante, planejamento documentado e capacidade. Não representa probabilidade de sucesso nem avaliação de desempenho.

## Acesso e evidências

No primeiro acesso, crie o administrador pela própria tela, com senha de 12 a 128 caracteres. Não há conta ou senha padrão. O administrador cadastra os perfis **TI**, **GP** e **Administrador**. Veja [acesso e evidências](docs/acesso-e-evidencias.md).

O manual PDF existente corresponde à versão anterior à autenticação. Para os fluxos atuais, consulte a documentação Markdown.
