# Estratégia de testes e cobertura

Medição de 05/11/2026, Node.js 24, macOS. Relatório reproduzível com c8 e V8; fonte resumida em [coverage-summary.json](coverage-summary.json). Cobertura descreve execução de código, não garante ausência de falhas nem qualidade de recomendação.

## Resultado

| Execução | Testes | Linhas / instruções | Funções | Ramificações |
|---|---|---|---|---|
| Sem PostgreSQL | 34 aprovados, 1 ignorado | 95,56% | 80,95% | 93,57% |
| Com PostgreSQL real | 35 aprovados, nenhum ignorado | 100% | 100% | 95,49% |

O escopo inclui sete módulos: IA, API, database, dump, erros, matching e storage. Não inclui frontend React, CSS, arquivos de testes, bootstrap `server/index.ts`, o roteiro `verify-postgres.ts`, scripts de inicialização ou gerador do PDF. As instruções/linhas são contabilizadas pelo V8 nos arquivos TypeScript, que possuem trechos compactos; não representam porcentagem de cenários de negócio. Os percentuais diferentes entre suítes refletem também as funções carregadas e exercidas.

## Módulos na suíte integrada

| Módulo | Linhas | Ramificações | Funções |
|---|---|---|---|
| ai.ts | 100% | 97.05% | 100% |
| app.ts | 100% | 97.67% | 100% |
| database.ts | 100% | 93.33% | 100% |
| dump.ts | 100% | 93.75% | 100% |
| errors.ts | 100% | 100% | 100% |
| matching.ts | 100% | 100% | 100% |
| storage.ts | 100% | 87.09% | 100% |

## O que é verificado

- Matching: obrigatórias, senioridade, equivalências, desejáveis, ordenação, limite, sobre-alocação, dados incompletos e mudança de ano.
- IA com transporte simulado: schema, cabeçalhos, confidencialidade da chave, ausência de skills, respostas inválidas/incompletas/bloqueadas, quota, autenticação, timeout e seleção de provedor. Nenhum teste automatizado chama a API comercial.
- HTTP: validação, JSON, corpo máximo, origem, status, fallback, falha interna sem fallback indevido, persistência, revalidação e idempotência de pedidos concorrentes.
- Snapshot sintético: COPY, campos nulos/escapados, tabelas relacionadas, inativos, somatório e competência sem cobertura.
- PostgreSQL local: migração/importação idempotentes, equivalência com dump em cenários interno/externo e seis inserções simultâneas com um único pedido. Só os registros temporários com UUIDs do teste são removidos.

O teste PostgreSQL é uma unidade agregadora com várias asserções; o total de 35 testes não equivale a 35 integrações independentes.

## Executar em qualquer sistema

```text
npm ci
npm test
npm run test:coverage
npm run build
```

Abra `coverage/index.html`. `coverage/lcov.info` atende ferramentas de análise; `coverage/coverage-summary.json` contém os números brutos. Cada execução de cobertura substitui o relatório anterior.

O comando de cobertura falha se ficar abaixo dos pisos globais configurados: 90% de linhas/instruções, 90% de ramificações e 80% de funções. Eles são compatíveis com a suíte sem banco; não exigem que um clone público tenha acesso à base restrita.

Para integração: inicie PostgreSQL, disponibilize o dump em `challenge/db/01-hackathon.sql` e configure `.env.local` na raiz. Execute `npm run test:coverage:integration`. O relatório integrado depende da base oficial e não é gerado no CI público.

Se as credenciais estiverem fora da raiz, defina ALOCA_ENV_FILE na sessão. Windows PowerShell: `$env:ALOCA_ENV_FILE = "C:/caminho/aloca.env"`. Linux/macOS: `export ALOCA_ENV_FILE='/caminho/aloca.env'`. Não copie valores de chaves ou senhas para o relatório.

## CI e limitações

O workflow `.github/workflows/ci.yml` está configurado para Ubuntu, Windows e macOS com Node.js 24: instalação pelo lockfile, suíte sem banco, cobertura, build e artefato HTML. A presença do workflow não comprova que essas execuções remotas passaram; verificar os resultados no GitHub Actions após o envio.

Permanecem sem cobertura automatizada: navegação de ponta a ponta da interface, acessibilidade, carga, homologação Windows/Linux real, aprovação do GP e integrações corporativas não implementadas. Capturas do manual foram obtidas da aplicação real, mas não substituem uma suíte E2E.

Ramificações ainda não executadas incluem variações de campos ausentes e caminhos de falha/importação no armazenamento. O mecanismo não deve ser apresentado como 100% homologado para produção. A auditoria das dependências de execução não reportou vulnerabilidades conhecidas na consulta desta entrega; isso não substitui revisão de segurança.
