# Testes e cobertura

## Resultado desta revisão

| Execução | Resultado | Linhas/instruções | Funções | Ramificações |
|---|---|---|---|---|
| Sem PostgreSQL | 39 aprovados, 2 ignorados | 83,33% | 75,47% | 89,66% |
| Com PostgreSQL real | 41 aprovados, nenhum ignorado | 100% | 100% | 92,58% |

Métricas medidas por c8 sobre nove módulos de backend: ai, app, auth, database, dump, errors, evidence, matching e storage. Entrypoint, verificador de integração, testes e frontend não entram nessa cobertura. Cobertura de linhas não equivale a homologação completa.

## Executar

- `npm test`: suíte sem banco, com duas integrações ignoradas.
- `npm run test:coverage`: mesma suíte com relatório; não impõe pisos, pois não exercita as integrações PostgreSQL de autenticação e persistência.
- `npm run test:coverage:integration`: exige DATABASE_URL e dump oficial, aplica os pisos globais de 90% linhas/instruções, 90% ramificações e 80% funções.
- `npm run build`: valida TypeScript e compila a interface.

Use ALOCA_ENV_FILE para apontar ao arquivo externo de configuração. Abra coverage/index.html para o relatório; coverage/lcov.info e coverage/coverage-summary.json contêm resultados estruturados. Cada execução substitui os relatórios. Não execute duas coberturas simultaneamente.

A integração de acesso cria um banco temporário com nome aleatório, cadastra apenas contas fictícias e remove esse banco ao terminar; requer permissão CREATE DATABASE no PostgreSQL de desenvolvimento. Nunca use credenciais de produção para testes. A integração da base valida consultas e persistência em transação, preservando InHire.

## Comportamentos verificados

- Parsing e contratos de requisitos, erros de IA com transporte simulado, fallback interno/externo, skills obrigatórias e capacidade mínima em todos os meses.
- Equivalência PostgreSQL/dump, importação idempotente, pedidos concorrentes sem duplicidade e preservação da base original.
- Sessões, primeiro administrador único, login inválido e limite de tentativas, senhas com hash/salt, logout, revogação por desativação e auditoria.
- TI sem acesso à gestão de contas, isolamento entre dois usuários TI, GP sem criar pedidos, TI sem decidir pedidos e GP validando apenas pedido pendente.
- Evidências: níveis de skills, ausência de planejamento sinalizada, exclusão de vínculos sem planejamento anterior, horizonte previsto, ranking por evidências e ausência explícita de métricas de produtividade.

Nenhum teste chama a API comercial de IA. O build passa nesta revisão. A suíte de CI configurada para Windows/Linux/macOS executa a parcela sem banco e o build; isso não comprova homologação remota até o workflow executar.

## Limitações

Não há suíte automatizada E2E da interface, carga, acessibilidade ou homologação em máquinas Windows/Linux. Existem caminhos de falha e variações de dados ainda não executados. A aprovação administrativa está coberta, mas reserva no SGD e integrações corporativas não existem. O servidor continua local; não apresentar esta cobertura como garantia de segurança ou produtividade predita.
