# Imagen única: buildea el frontend estático y corre el server Fastify con Bun
# sirviendo UI + API en UN solo proceso. Postgres va aparte (docker-compose).

FROM node:22-slim AS base
WORKDIR /app
# pnpm (gestor del monorepo) + bun (runtime)
RUN corepack enable \
  && corepack prepare pnpm@10.14.0 --activate \
  && npm install -g bun@1.3.8

# --- Build: instala deps y compila el frontend ---
FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile
# La URL del API se hornea en el build del SPA (Vite). Por defecto el dominio prod.
ARG VITE_SERVER_URL=https://buenasmigas.dalvae.cl
ENV VITE_SERVER_URL=$VITE_SERVER_URL
RUN pnpm --filter web build

# --- Runner: reusa el build (tiene node_modules + fuente + web/dist) ---
FROM build AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV WEB_DIST=/app/apps/web/dist
EXPOSE 3000
# Aplica migraciones, asegura datos base (admin/operarios/tipos) y arranca el server.
CMD ["sh", "-c", "pnpm --filter @buenasmigas/db db:migrate && pnpm --filter server db:seed && cd apps/server && bun src/index.ts"]
