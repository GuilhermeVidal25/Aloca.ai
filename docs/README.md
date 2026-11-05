# Documentação do Aloca.ai

Referência da implementação do MVP, revisada em 05/11/2026. A interface é destinada à equipe de TI da VINT_GLOBAL. A autoria e a marca do produto são Aloca.ai.

| Documento | Conteúdo |
|---|---|
| [Instalação](instalacao.md) | Windows, Linux e macOS; ambientes e comandos |
| [Arquitetura](arquitetura.md) | Componentes, sequência de execução e decisões |
| [Regras e dados](regras-e-dados.md) | Elegibilidade, ranking, disponibilidade e persistência |
| [API](api.md) | Endpoints, contratos e códigos de erro |
| [Fluxos](fluxos.md) | Manual operacional e cenários de demonstração |
| [Operação](operacao.md) | Diagnóstico, segurança, recuperação e limitações |
| [Testes e cobertura](testes.md) | Execução reproduzível, métricas e lacunas |
| [Manual PDF](../output/pdf/aloca-ai-manual-da-plataforma.pdf) | Versão diagramada para uso e apresentação |

## Estado da solução

Implementados: chat com extração Gemini, critérios editáveis, consulta prioritária interna, fallback externo, justificativas determinísticas, histórico e pedidos pendentes persistidos. PostgreSQL é o modo normal; snapshot SQL é uma opção explícita.

Não implementados: autenticação por pessoa, autorização por perfil, notificações reais, aprovação do GP, efetivação/reserva de capacidade, sincronização com SGD/Jira/Teams/Slack, embeddings e previsão de produtividade. A interface roda localmente. Não publicar esse servidor na internet sem preparar autenticação, autorização e operação adequadas.

Os testes automatizados descritos não enviam mensagens aos provedores de IA. Os testes de integração opcionais usam o banco local do desafio e removem apenas os registros temporários que criaram.

## Gerar novamente o PDF

O PDF entregue já está pronto. Para regenerá-lo, instale Python 3 e as dependências de `requirements-docs.txt`. No Windows: `py -m pip install -r requirements-docs.txt` e `py scripts/build-manual.py`. Em Linux/macOS: `python3 -m pip install -r requirements-docs.txt` e `python3 scripts/build-manual.py`. Recomenda-se ambiente virtual.

O gerador usa as capturas em `docs/assets/` e a medição versionada em `docs/coverage-summary.json`. Depois de mudar o software, atualize a medição e o conteúdo antes de regenerar. Para conferir a diagramação, renderize as páginas com Poppler e revise as imagens, não apenas a extração de texto.
