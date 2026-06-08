# ---- Build: node + pnpm. Instala el workspace, compila el SPA y poda devDeps ----
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile
# La URL del API se hornea en el build del SPA (Vite). Por defecto el dominio prod.
ARG VITE_SERVER_URL=https://buenasmigas.dalvae.cl
ENV VITE_SERVER_URL=$VITE_SERVER_URL
RUN pnpm --filter web build
# Deja solo dependencias de producción (saca vite, typescript, drizzle-kit, etc.).
RUN pnpm prune --prod

# ---- Runtime: solo Bun (slim). Migra + seed + server en UN proceso ----
FROM oven/bun:1.3.8-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV WEB_DIST=/app/apps/web/dist
COPY --from=build /app /app
EXPOSE 3000
# Migra (migrador nativo de Bun), asegura datos base y arranca el server.
CMD ["sh", "-c", "cd apps/server && bun src/migrate.ts && bun src/seed.ts && bun src/index.ts"]
