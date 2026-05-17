# Predecessor DPS Calculator

Self-hosted Next.js app for Predecéssor hero stats and DPS (Pred.gg data).

## Local dev

```bash
npm ci
cp .env.example .env   # if present; else DATABASE_URL="file:./prisma/dev.db"
npx prisma migrate dev
npm run dev
```

## Docker

```bash
docker build -t predecessor-dps:local .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="file:/tmp/prod.db" \
  predecessor-dps:local
```

## Deploy (Dokploy)

1. Push to `Mestryx-dev/Predecessor` on `main`.
2. GitHub Actions publishes `ghcr.io/mestryx-dev/predecessor:latest`.
3. Dokploy: pull that image (recommended) or build Dockerfile on the host.
4. Mount volume `/data`, set `DATABASE_URL=file:/data/prod.db`.

See `hermes/skills/devops/predecessor-dps-calculator/references/dokploy-deployment.md`.
