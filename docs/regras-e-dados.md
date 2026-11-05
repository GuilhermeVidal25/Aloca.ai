# Regras de negócio e dicionário de dados

## Requisitos

Título de 1 a 120 caracteres; de 1 a 20 skills obrigatórias; até 20 desejáveis; dedicação inteira de 1 a 100%; início no formato AAAA-MM; duração de 1 a 12 meses; senioridade opcional. Campos extras são rejeitados. Na extração, quando omitidos, dedicação assume 50%, duração assume 1 mês e início assume o mês atual de Fortaleza. A pessoa usuária deve conferir esses valores antes da busca.

## Elegibilidade e ordenação

- Todas as skills obrigatórias devem constar no perfil, consideradas as equivalências.
- Senioridade informada exige o nível exato normalizado: um sênior não substitui automaticamente um pleno.
- Internos precisam atender à dedicação em **cada mês**. A menor disponibilidade do período é a capacidade exibida.
- Talentos precisam declarar disponibilidade suficiente. Valor ausente é desconhecido e não é considerado elegível.
- Desejáveis aumentam a nota, mas não eliminam candidatos.
- Com desejáveis, a nota é `80 + 20 × (desejáveis atendidas / desejáveis pedidas)`. Sem desejáveis, os elegíveis recebem 100. Não é uma previsão de sucesso nem uma nota de produtividade.
- Ordenação: nota decrescente, capacidade decrescente, nome em ordem alfabética. Retorno limitado a cinco.
- Se existe interno elegível, não se consulta a base externa. Sem internos, avaliam-se talentos. Sem ambos, a resposta é vazia.

Exemplos de equivalência: Node/Node.js; TS/TypeScript; Postgre/Postgres/PostgreSQL; React.js/React; JS/JavaScript. NestJS e Express não são automaticamente aceitos como comprovação de Node.js neste MVP.

## Disponibilidade

Somam-se os percentuais de planejamentos ativos e não excluídos de todas as alocações ativas e não excluídas do profissional, por competência. Disponibilidade = 100 - soma. Sobre-alocação pode gerar valor negativo e torna a pessoa inelegível para uma demanda positiva.

Ausência de registro individual conta como zero alocação, conforme as funções fornecidas. Isso não comprova capacidade confirmada. Meses sem qualquer cobertura global na tabela são bloqueados com 422. Férias, afastamentos, dados antigos ou alocações ainda não registradas não são inferidos. A confirmação do GP é necessária.

## Fonte InHire

| Tabela | Conteúdo e ligação |
|---|---|
| `colaboradores` | ID, nome abreviado e IDs de cargo/senioridade; status e exclusão |
| `colaborador_skills` | Colaborador → skill; nível de conhecimento e situação |
| `skills` | Catálogo e área de tecnologia |
| `dominios` | Descrições de senioridade, cargo e demais listas |
| `contratos` | Contrato, vigência e responsável |
| `demandas` | Projeto, contrato, gerente, datas e situação |
| `demanda_skills` | Demanda → skills requeridas |
| `alocacoes` | Colaborador → demanda; estado do vínculo |
| `planejamentos` | Alocação → percentual, ano e mês |
| `talentos` | Cadastro externo, senioridade e disponibilidade declarada |
| `talento_skills` | Talento → skill e nível |

A consulta atual usa presença de skills; não exige um nível mínimo de conhecimento. Cargo não é filtro implementado no contrato atual. Contratos, demandas e seus vínculos existem na base, mas não geram uma métrica de desempenho ou de experiência no card.

## Persistência AlocaAI

`searches`: UUID, data da consulta e JSONB com requisitos, origem, candidatos, justificativas e tempo. `allocation_requests`: UUID, referência à consulta, candidato, data e JSONB com nome, origem e status `pending`. Restrição única: `(search_id, candidate_id)`. Listagens retornam até 100 registros recentes, sem apagar os demais do banco.

No modo snapshot, os mesmos contratos ficam em `data/history.json`. Esse modo atende a um único processo local, sem a garantia de concorrência entre múltiplos processos oferecida pelo PostgreSQL.
