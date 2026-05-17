# ---- Base image ------------------------------------------------------------
FROM node:20-alpine AS builder

# Install pnpm (ou npm si tu préfères) – plus rapide et déterministe
# Si tu utilises npm, remplace les lignes pnpm par npm ci && npm run build
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ---- Dépendances -----------------------------------------------------------
# Copie seulement les fichiers de lock pour profiter du cache de Docker
COPY package.json package-lock.json ./
RUN npm ci   # (ou: RUN corepack enable && pnpm install --frozen-lockfile)

# Copie le reste du code
COPY . .

# ---- Build Next.js ---------------------------------------------------------
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build   # génère .next/

# ---- Production image ------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

# Seulement ce qui est nécessaire en prod
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copie le build depuis l’étape builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Expose le port que Next.js écoute par défaut
EXPOSE 3000

# Lancement
CMD ["npm", "start"]