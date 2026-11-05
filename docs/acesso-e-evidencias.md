# Acesso e evidências da recomendação

## Primeiro acesso

Inicie a aplicação com PostgreSQL disponível. Abra http://localhost:3000 e crie o administrador inicial. Não há usuário ou senha padrão. A criação inicial só é aceita enquanto não existir nenhuma conta; a verificação é serializada em transação. Não envie senhas no chat nem as grave no repositório.

Em **Usuários e acessos**, o administrador cadastra nome, e-mail, senha inicial (12–128 caracteres) e perfil. Pode alterar perfil e ativar/desativar contas. Alterações encerram as sessões do usuário afetado. A própria conta não pode remover seu acesso administrativo.

| Perfil | Permissões |
|---|---|
| Equipe de TI | Consultar perfis, ver o próprio histórico, registrar solicitações a partir das próprias consultas |
| Gestor / GP | Consultar perfis, acompanhar todas as solicitações e validar/recusar com justificativa |
| Administrador | Consultar, solicitar, acompanhar e decidir solicitações; gerenciar contas e consultar auditoria |

GP não tem restrição por projeto responsável nesta versão: acompanha todas as solicitações. Vincular cada gestor apenas a seus projetos requer associação entre conta e gerente da base. Registros antigos sem proprietário só aparecem para GP/administrador.

## Proteção implementada

As permissões são verificadas pela API, inclusive em chamadas diretas. Senhas usam scrypt com salt aleatório. Tokens de sessão são aleatórios e apenas seus hashes são persistidos. Cookies são HttpOnly, SameSite=Strict, com validade absoluta de oito horas; Secure é aplicado em HTTPS. Login limita tentativas por IP/e-mail em memória (cinco falhas em 15 minutos). Desativação e alteração de perfil revogam sessões. Criação/alteração de contas, login e decisões geram auditoria.

A implantação atual é local. Não inclui SSO, MFA, recuperação/troca de senha pelo usuário, limitação distribuída nem política de retenção de sessões/auditoria. Senhas iniciais precisam ser entregues por canal autorizado; não há envio por e-mail.

## Recomendação fundamentada

Novas consultas mostram níveis cadastrados das skills obrigatórias/desejáveis, origem da capacidade por mês, demandas com planejamento anterior, stack exigida na demanda e duração prevista. Uma demanda relacionada não comprova que a pessoa utilizou pessoalmente cada tecnologia, entregou no prazo ou teve bom desempenho. Vínculos sem planejamento anterior à consulta não contam como experiência demonstrada.

A ordenação mantém a elegibilidade por todas as skills obrigatórias e disponibilidade no período. Entre elegíveis, prioriza cobertura de desejáveis, quantidade de obrigatórias em nível avançado/intermediário, demandas relacionadas com horizonte semelhante, meses com planejamento individual e capacidade. Trata-se de ordenação explicável, sem nota inventada de produtividade.

A duração é prevista, não duração efetiva. Histórico semelhante é indício de contexto, não previsão de entrega. Ausência de planejamento individual fica marcada como capacidade inferida. Consultas antigas precisam ser refeitas para receber as novas evidências.

## Produtividade

TTV, retrabalho e conclusão de histórias aparecem como **não medidos**. A base original não contém os eventos necessários. Para calcular essas métricas, integrar datas de ingresso/contexto e primeira entrega relevante, entregas com correções atribuíveis e histórias concluídas com contexto e critérios comparáveis. Não usar volume bruto de commits/linhas nem transformar ausência de histórico em desempenho ruim. A decisão final permanece humana.

## Validação da solicitação

TI registra pedido pendente. GP/administrador informa justificativa e valida ou recusa. Na validação, a API verifica novamente a elegibilidade. A transição de estado é atômica e aceita apenas pedidos pendentes. A decisão guarda nome do responsável, data e justificativa. **Não reserva capacidade, não altera InHire/SGD e não envia notificações externas.** Duas solicitações validadas ainda podem disputar a mesma capacidade.

## API de acesso

GET /api/auth/session informa sessão e necessidade de configuração inicial. POST /api/auth/setup cria o primeiro administrador. POST /api/auth/login e /logout iniciam/encerram sessão. GET/POST /api/auth/users e PATCH /api/auth/users/:id são exclusivos do administrador. GET /api/auth/audit retorna os últimos 100 eventos. POST /api/allocations/:id/decision recebe status validated/declined e note com 5–1000 caracteres, exclusivo GP/administrador. Health e rotas de autenticação são públicas; rotas de negócio exigem sessão.

Snapshot altera apenas a origem de perfis. PostgreSQL continua obrigatório para contas, sessões, histórico e decisões.
