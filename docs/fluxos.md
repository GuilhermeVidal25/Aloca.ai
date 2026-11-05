# Manual de fluxos da plataforma

Público: equipe de TI da VINT_GLOBAL. Produto autoral: Aloca.ai. Este manual descreve a aplicação local do MVP.

## Navegação

- **Assistente**: criar demanda, interpretar texto, confirmar critérios e consultar candidatos.
- **Histórico**: recuperar consultas salvas e seus resultados no momento da busca.
- **Solicitações**: visualizar pedidos pendentes e interesses em contratação.
- **Nova demanda**: limpa a conversa da tela; não apaga o histórico.
- **Rodapé**: identifica PostgreSQL ou snapshot. Configuração de IA não garante saldo ou cota.

## Fluxo 1 - Descrever uma demanda

1. Abra o Assistente e digite cargo/contexto, stack obrigatória, dedicação, início e duração.
2. Diferencie desejáveis: “Docker é desejável”, por exemplo.
3. Clique na seta de envio. Enter envia; Shift+Enter permite nova linha.
4. Aguarde a interpretação e confira o formulário.

Exemplo: “Preciso de backend pleno com Node.js, TypeScript e PostgreSQL por 3 meses, a partir de novembro de 2026, com dedicação de 50%. Docker é desejável.”

Resultado esperado: obrigatórias separadas das desejáveis, início 2026-11, duração 3, dedicação 50 e senioridade Pleno. A IA não consulta candidatos antes da confirmação.

## Fluxo 2 - Definir ou corrigir critérios

1. Para dispensar a IA, clique em **Prefiro definir os critérios**.
2. Preencha nome, skills obrigatórias separadas por vírgula, desejáveis, dedicação, início, duração e senioridade.
3. Se senioridade não for eliminatória, deixe **Não exigida**.
4. Clique em **Confirmar e encontrar**.

Confira sempre os valores: o padrão da interpretação é 50% de dedicação, 1 mês e mês atual quando omitidos; a abertura manual usa valores iniciais próprios do formulário, incluindo duração de 3 meses. O que vale é o formulário confirmado.

## Fluxo 3 - Avaliar um interno

1. Verifique a indicação **SGD · INTERNO**.
2. Confira as skills atendidas e a senioridade.
3. Leia os percentuais livres em cada competência e o mínimo do período.
4. Abra **Ver skills do perfil** para consultar o catálogo completo cadastrado.
5. Leia a justificativa e, se adequado, clique em **Solicitar alocação**.

A disponibilidade exibida é calculada dos planejamentos; ausência de registro individual conta como zero alocação. O card não comprova liberação pelo GP. Solicitar registra um pedido pendente, sem reservar agenda.

## Fluxo 4 - Avaliar um talento externo

O fluxo externo ocorre automaticamente quando nenhum interno atende. A tela explica isso e marca **BANCO DE TALENTOS**. Confira skills, senioridade e disponibilidade declarada. Clique em **Registrar interesse** para adicionar um registro pendente. Interesse não representa contratação e depende de confirmação de disponibilidade e avaliação posterior.

## Fluxo 5 - Nenhum candidato ou período sem cobertura

Sem candidatos nas duas bases, use **Revisar critérios** ou **Ajustar esta busca**. Revise dedicação, período, senioridade e obrigatórias. A plataforma não flexibiliza esses critérios automaticamente.

Se a competência não tem planejamento, aparece uma mensagem de período sem dados. Esse caso não significa que não existem profissionais e não dispara contratação externa. Escolha um período coberto ou atualize a base com a equipe responsável.

## Fluxo 6 - Solicitações e repetição

Ao solicitar, a API verifica novamente o perfil. Se ainda elegível, grava o pedido e desabilita a ação com indicação de registro. Repetir a chamada para a mesma consulta e candidato devolve o mesmo pedido. O menu **Solicitações** mostra o estado pendente. GP e administrador visualizam botões de validação/recusa, com justificativa obrigatória. A validação reconsulta a elegibilidade e não efetiva alocação no SGD.

Pedidos para consultas diferentes não são tratados como duplicados. Eles também não reduzem a disponibilidade. A liberação real precisa ser coordenada fora do protótipo.

## Fluxo 7 - Retomar pelo histórico

Abra **Histórico** e selecione a demanda. O resultado é o retrato salvo na data da consulta; não é recalculado ao abrir. Use **Ajustar esta busca** para executar novamente os critérios. Mesmo em um resultado antigo, solicitar exige revalidação antes do primeiro registro.

## Fluxo 8 - Falha da IA ou do banco

Se a IA falhar, leia a mensagem e utilize o formulário manual apresentado. Erros de autenticação, quota, tempo e resposta incompleta são distintos. Não há fallback automático para outro modelo.

Se o banco falhar, a aplicação informa a falha. Não converte indisponibilidade do banco em “nenhum candidato” nem consulta silenciosamente outra fonte.

## Roteiro de demonstração

Para novembro de 2026 a janeiro de 2027, com senioridade não exigida:

| Cenário | Obrigatórias | Dedicação | Resultado verificado na base original |
|---|---|---|---|
| Interno | Node.js, TypeScript, PostgreSQL | 50% | Cinco cards internos |
| Externo | Delphi, C# | 100% | Um talento externo |
| Vazio | Skill inexistente de teste | 50% | Sem candidatos |

Esses resultados dependem da versão e das condições da base. Confirme os exemplos antes da apresentação. A demonstração deve explicar que a decisão do GP é persistida, mas a reserva no SGD não é efetuada, e que o uso ainda é local.
