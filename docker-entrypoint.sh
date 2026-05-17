#!/bin/sh
set -e

# Fresh Docker volumes are often root:root; Prisma runs as nextjs (uid 1001).
if [ -d /data ]; then
  chown -R nextjs:nodejs /data
fi

PRISMA_CLI="./node_modules/prisma/build/index.js"

if [ -n "${DATABASE_URL:-}" ] && [ -f "$PRISMA_CLI" ]; then
  if [ -d prisma/migrations ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    su-exec nextjs node "$PRISMA_CLI" migrate deploy
  else
    su-exec nextjs node "$PRISMA_CLI" db push --skip-generate
  fi
fi

exec su-exec nextjs "$@"
