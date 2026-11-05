# Instalação em Windows, Linux e macOS

## Pré-requisitos

- Node.js 24 LTS, npm e Git. Node.js 22+ é o mínimo para a aplicação; a validação deste pacote usa Node.js 24.
- Docker Desktop aberto no Windows/macOS ou Docker Engine com Compose no Linux, para o modo PostgreSQL.
- Pacote oficial do desafio: `01-hackathon.sql` e `.env` com `POSTGRES_PASSWORD`.
- Chave Gemini para interpretação de texto. Os critérios manuais funcionam sem chave.

O código é comum aos três sistemas. Os iniciadores Node não dependem de `export`, `source` ou de atribuições de ambiente específicas do shell. O uso em Windows e Linux está documentado e previsto em CI; a execução local desta entrega foi validada em macOS, sem afirmar testes em máquinas Windows/Linux.

## 1. Obter o projeto

Nos três sistemas:

```text
git clone https://github.com/GuilhermeVidal25/Aloca.ai.git
cd Aloca.ai
npm ci
```

## 2. Configurar ambiente local

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
New-Item -ItemType Directory -Force challenge/db | Out-Null
notepad .env.local
```

Linux/macOS:

```sh
cp .env.example .env.local
mkdir -p challenge/db
```

Edite `.env.local` com seu editor. Configure as variáveis sem enviar os valores ao chat ou ao Git:

| Variável | Uso |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:SENHA@localhost:5432/hackathon` |
| `LLM_PROVIDER` | `gemini` para a demonstração |
| `GEMINI_API_KEY` | Chave do projeto Google AI Studio |
| `GEMINI_MODEL` | Padrão `gemini-2.5-flash` |
| `PORT` | Padrão 3000 |

Caracteres especiais da senha precisam ser codificados na URL. Não codifique a senha dentro do `.env` do Docker: codifique somente a parte da senha na `DATABASE_URL`. O usuário `postgres` corresponde ao `compose.yaml` deste projeto; é diferente do usuário do pacote original do desafio.

Extraia do pacote os arquivos para:

```text
challenge/
  .env                      # POSTGRES_PASSWORD
  db/
    01-hackathon.sql
```

Esses arquivos não acompanham o repositório. A senha de `challenge/.env` deve corresponder à `DATABASE_URL`. O Compose aplica o dump automaticamente somente quando o volume está vazio.

## 3. Iniciar

Comando recomendado, igual nos três sistemas:

```text
npm run start:local
```

Ele inicia o PostgreSQL com `docker compose up -d --wait` e depois o servidor. Abra `http://localhost:3000`. O rodapé deve mostrar **PostgreSQL conectado**.

Se o banco já está funcionando, use `npm run dev`. Para encerrar o servidor, pressione Ctrl+C. Para parar o banco preservando os dados, execute `docker compose stop`. Não é necessário apagar volumes para reiniciar a aplicação.

`Iniciar.command` é apenas um atalho opcional do macOS. Não é requisito para Windows ou Linux.

## 4. Credenciais fora do repositório

O iniciador aceita um arquivo `.env.runtime`, ignorado pelo Git, contendo:

```dotenv
ALOCA_ENV_FILE="C:/Users/SEU_USUARIO/config/aloca.env"
```

Em Linux/macOS, use um caminho absoluto, por exemplo `/home/seu_usuario/config/aloca.env`. O arquivo apontado contém `DATABASE_URL`, `GEMINI_API_KEY` e demais opções. Depois execute `npm run start:local` ou `npm start`. O comando direto `npm run dev` lê `.env.local` ou a variável de ambiente `ALOCA_ENV_FILE`; ele não carrega `.env.runtime` automaticamente.

Para definir a variável diretamente, Windows PowerShell:

```powershell
$env:ALOCA_ENV_FILE = "C:/Users/SEU_USUARIO/config/aloca.env"
npm run dev
```

Linux/macOS:

```sh
ALOCA_ENV_FILE='/home/seu_usuario/config/aloca.env' npm run dev
```

## 5. Modo snapshot e compilação

`npm run start:snapshot` lê o dump original, dispensa Docker e grava histórico local em arquivo. O rodapé mostra **Base do desafio · SQL**. Não reflete alterações em um banco ativo. A IA ainda depende de internet e de cota; a entrada manual não.

Para executar a compilação local: `npm run build` e depois `npm start`. O banco deve estar pronto; `npm start` não inicia Docker. Essa execução continua em loopback e não equivale a uma implantação corporativa.

## 6. Verificar

`npm test` e `npm run test:coverage` não exigem credenciais nem banco real. `npm run test:coverage:integration` exige PostgreSQL e dump. Para essa integração, defina `ALOCA_ENV_FILE` diretamente quando o arquivo estiver fora da raiz. Veja [testes](testes.md).
