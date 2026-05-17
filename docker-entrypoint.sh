#!/bin/sh
set -e

if [ -d /data ]; then
  chown -R nextjs:nodejs /data
fi

PRISMA_CLI="./node_modules/prisma/build/index.js"

db_file_from_url() {
  echo "$1" | sed -n 's|^file:||p'
}

hero_table_exists() {
  DB_FILE="$1"
  [ -n "$DB_FILE" ] && [ -f "$DB_FILE" ] \
    && sqlite3 "$DB_FILE" 'SELECT 1 FROM "Hero" LIMIT 1;' >/dev/null 2>&1
}

if [ -n "${DATABASE_URL:-}" ] && [ -f "$PRISMA_CLI" ]; then
  echo "Prisma: applying migrations for ${DATABASE_URL}"

  if [ -d prisma/migrations ] && [ -n "$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d 2>/dev/null)" ]; then
    su-exec nextjs node "$PRISMA_CLI" migrate deploy
  else
    su-exec nextjs node "$PRISMA_CLI" db push --skip-generate
  fi

  DB_FILE=$(db_file_from_url "$DATABASE_URL")
  if [ -n "$DB_FILE" ] && ! hero_table_exists "$DB_FILE"; then
    echo "Prisma: Hero table missing in ${DB_FILE}, running db push"
    su-exec nextjs node "$PRISMA_CLI" db push --skip-generate
  fi

  if ! hero_table_exists "$DB_FILE"; then
    echo "Prisma: schema still missing after migrate/push" >&2
    exit 1
  fi

  echo "Prisma: schema ready"
fi

exec su-exec nextjs "$@"
