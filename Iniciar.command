#!/bin/zsh
cd "$(dirname "$0")" || exit 1
if [[ -f .env.runtime ]]; then
  source .env.runtime
fi
export ALOCA_ENV_FILE="${ALOCA_ENV_FILE:-$PWD/.env.local}"
if [[ "$1" == "--snapshot" ]]; then
  export SQL_DUMP_PATH="$PWD/challenge/db/01-hackathon.sql"
else
  unset SQL_DUMP_PATH
  docker compose up -d || exit 1
fi
npm run dev
