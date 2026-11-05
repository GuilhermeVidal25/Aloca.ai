# Operação, segurança e diagnóstico

## Comandos comuns

| Ação | Comando |
|---|---|
| Iniciar banco e aplicação | `npm run start:local` |
| Servidor com banco já pronto | `npm run dev` |
| Snapshot sem Docker | `npm run start:snapshot` |
| Compilar e executar build | `npm run build`, depois `npm start` |
| Estado do banco | `docker compose ps` |
| Logs de importação | `docker compose logs --tail 100 postgres` |
| Parar banco, preservando volume | `docker compose stop` |
| Verificação básica | `npm test` |

Não use `docker compose down -v` como diagnóstico: ele apaga o volume. O dump só é importado automaticamente em um volume vazio; substituir o arquivo não atualiza um volume existente.

## Diagnóstico

| Sintoma | Verificação e ação |
|---|---|
| Página não abre | Confirme o servidor e a porta. Se 3000 estiver ocupada, ajuste `PORT` e abra a nova URL. |
| PostgreSQL não inicia | Abra Docker Desktop ou o serviço Docker. Confira `challenge/.env` e o dump. |
| Porta 5432 ocupada | Ajuste a porta à esquerda do mapeamento no Compose e a porta na `DATABASE_URL`. |
| Senha recusada | Confira usuário `postgres`, senha do volume existente e URL codificada. Alterar o `.env` não muda a senha de um volume já criado. |
| IA indisponível | Confira provedor, chave, acesso ao modelo e cota no projeto. Use os critérios manuais enquanto resolve. |
| Período sem dados | Escolha competências cobertas pelos planejamentos. Não trate esse erro como ausência de profissionais. |
| Nenhum candidato | Confira skills obrigatórias, senioridade exata e dedicação em todos os meses. Critérios só devem ser flexibilizados conscientemente. |
| Pedido retorna 409 | A capacidade ou elegibilidade mudou. Faça uma nova consulta. |
| Histórico vazio | Confira a conta autenticada (TI vê apenas o próprio histórico) e o banco configurado. |

`GET /api/health` confirma que o processo responde. `GET /api/status` informa conexão, fonte, persistência e configuração da IA. Ao investigar uma falha, guarde `X-Request-Id` e o código, sem incluir credenciais nos logs ou capturas.

## Backup e recuperação

Para PostgreSQL, mantenha backup administrado do banco `hackathon`, incluindo `InHire` e `AlocaAI`. Em ambientes corporativos, use o procedimento de backup da infraestrutura e teste a restauração em um banco separado. Não restaure sobre a base de demonstração sem avaliar o impacto.

No snapshot, preserve o dump e faça backup do schema AlocaAI no PostgreSQL. O arquivo legado data/history.json também pode conter nomes e requisitos de projetos; não deve entrar no repositório. A importação do histórico legado no PostgreSQL mantém o arquivo original e evita registros repetidos pelo ID.

## Credenciais e dados

`.env.local`, `.env.runtime`, `challenge/`, `data/`, `node_modules/`, `dist/` e `coverage/` são ignorados pelo Git. `.env.example` contém somente opções e campos sem segredos. O provedor recebe o texto da demanda: evite incluir informações confidenciais desnecessárias. As chaves ficam no backend; trocar de modelo não altera as regras determinísticas.

O MVP possui autenticação, autorização por perfil e histórico segregado de TI. Antes de implantação corporativa, integrar SSO, recuperação de senha, HTTPS, gestão central de segredos, retenção e observabilidade. O servidor continua em loopback; a validação administrativa do GP não substitui reserva transacional no SGD.

## Evolução prevista, não entregue

Reserva transacional de capacidade, fluxo de liberação pelo GP, integrações com os sistemas corporativos, freshness dos dados, métricas de adequação temporal baseadas em evidências e avaliação de qualidade de recomendação com usuários. Não há predição de produtividade nesta versão.
