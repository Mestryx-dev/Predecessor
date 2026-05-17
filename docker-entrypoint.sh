#!/bin/sh
set -e

PRISMA_CLI="./node_modules/prisma/build/index.js"

if [ -n "${DATABASE_URL:-}" ] && [ -f "$PRISMA_CLI" ]; then
  if [ -d prisma/migrations ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    node "$PRISMA_CLI" migrate deploy
  else
    node "$PRISMA_CLI" db push --skip-generate
  fi
fi

exec "$@"
