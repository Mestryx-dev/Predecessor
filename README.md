# Predecessor DPS Calculator

Self-hosted Next.js app for Predecéssor hero stats and DPS (Pred.gg data).

## Local development

```bash
npm ci
cp .env.example .env
npx prisma migrate dev
npm run dev
```

Default dev server: `http://localhost:3000` (`PORT=3000` in `.env.example`).

Do **not** commit `.env` — production values belong in Dokploy only.

## Docker (local smoke test)

```bash
docker build -t predecessor-dps:local .
docker run --rm -p 3010:3010 \
  -v predecessor-data:/data \
  -e DATABASE_URL="file:/data/prod.db" \
  predecessor-dps:local
curl -fsS http://127.0.0.1:3010/api/heroes
```

The image listens on **3010** (same as Dokploy). Entrypoint runs as root briefly to `chown` `/data`, then serves as `nextjs` (uid 1001).

## Deploy on Dokploy

| Setting | Value |
|---------|--------|
| Provider | **Docker** — `ghcr.io/mestryx-dev/predecessor:<git-sha>` (prefer commit tag over `latest`; Swarm caches `latest`) |
| Container port | **3010** (`publishedPort` and `targetPort` = 3010) |
| Volume (required) | Mount **`/data`** (e.g. `predecessor-data`) |
| Environment | See below |

```env
NODE_ENV=production
PORT=3010
HOSTNAME=0.0.0.0
DATABASE_URL=file:/data/prod.db
```

After changing env or mounts: **saveEnvironment** (or UI Environment) then **reload** the application. Do not edit `.env` under `/etc/dokploy/applications/.../code/` manually — with `createEnvFile: true`, stale files can override the UI.

### GHCR

CI (`.github/workflows/docker-publish.yml`) builds and pushes on every push to `main`. Package must be **public** or Dokploy needs registry credentials (`read:packages` PAT).

See `hermes/skills/devops/predecessor-dps-calculator/references/dokploy-deployment.md`.
