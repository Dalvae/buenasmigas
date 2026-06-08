# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Web app for **Buenas Migas** (bakery): per-shift production logging (Elaboración, Envasado, PNC),
automatic indicator calculation, queries with 3 charts, and Excel export. Full requirements live in
`REQUISITOS.md` (Spanish). UI and copy are in Spanish (es-CL).

## Runtime vs package manager (important, easy to confuse)

- **Runtime is Bun.** The server runs TypeScript directly: `bun src/index.ts` — no build/transpile step.
- **Package manager is pnpm** (workspaces + `catalog:` + Turborepo). Use `pnpm`, not `bun install`.
- The DB client uses `drizzle-orm/bun-sql` (Bun-native `Bun.sql`), so `packages/db` only runs under Bun.
  `drizzle-kit` (migrations) is separate and uses its own pg connection from `packages/db/drizzle.config.ts`
  (which loads `apps/server/.env`).

## Commands

```bash
pnpm install                 # install (pnpm, never bun install)
pnpm dev                     # turbo dev: web on :3001, server on :3000
pnpm dev:server              # server only (Bun)   |   pnpm dev:web   # web only (Vite)

# Database (local Postgres via docker compose in packages/db)
pnpm db:start                # start Postgres container (up -d)
pnpm db:reset-init           # ⚠ delete migrations + regenerate a single 0000_init (see policy below)
pnpm db:migrate              # apply migrations
pnpm db:seed                 # seed admin + operarios + tipos + formula params (idempotent)
pnpm db:studio               # Drizzle Studio
pnpm db:push                 # push schema without migration files (quick dev iteration)

# Quality
pnpm check                   # Biome check + autofix (CI uses: pnpm exec biome check .)
pnpm check-types             # turbo check-types (tsc + vite build of web)
pnpm --filter web build      # build the static SPA into apps/web/dist
pnpm --filter server start   # run the production server with Bun
```

There is **no test suite** yet; do not invent test commands.

Default local credentials after `db:seed`: `admin@buenasmigas.cl` / `buenasmigas2026` (override via
`ADMIN_*` env). Local server `.env` lives at `apps/server/.env` and is git-ignored.

## Architecture

Monorepo: `apps/{web,server}` are the only things that **run**; `packages/*` are shared libraries
compiled into them. Dependency direction is strict: **apps depend on packages, never the reverse**, and
`packages/db` is a leaf (schema + client) imported by `auth`, `api`, and `server`.

- **One process in production.** `apps/server/src/index.ts` (Fastify on Bun) serves everything:
  oRPC at `/rpc/*`, Better Auth at `/api/auth/*`, Excel at `/export/excel`, and the static SPA from
  `WEB_DIST` (`apps/web/dist`) with an SPA fallback — only when that dir exists (so dev skips it). The
  web's `VITE_SERVER_URL` is baked at build time.

- **Type-safe API via oRPC.** Procedures are defined in `packages/api/src/routers/*` and the web imports
  the `AppRouter` *type* (`packages/api/src/routers/index.ts`) for end-to-end types. Three procedure tiers
  in `packages/api/src/index.ts`: `publicProcedure`, `protectedProcedure`, `adminProcedure`
  (RBAC on `context.session.user.role`). `context` (`packages/api/src/context.ts`) also exposes raw
  `headers` so admin user-management endpoints can be forwarded to Better Auth server-side.

- **Auth = Better Auth, Bearer-based.** Plugins: `admin` (create user / set role / **reset password** /
  delete), `bearer`, `jwt`. Sessions last 90 days with refresh (low friction — "llega y pum"). The web
  stores the token from the `set-auth-token` response header in `localStorage` (`apps/web/src/lib/token.ts`)
  and sends `Authorization: Bearer` on both oRPC (`apps/web/src/utils/orpc.ts`) and the Excel fetch. There
  is **no public signup** — admin creates accounts (`RF-AUTH-07`). Roles: `operario` (capture + read-only
  queries/export) and `admin` (everything).

- **Parametrized formulas.** `packages/api/src/lib/formulas.ts` computes the indicators; the weights/decimals
  come from the `config_formula` table (editable by admin), not hardcoded. The handwritten formulas are
  placeholders until the client confirms them.

- **Data model.** `packages/db/src/schema/app.ts`: one `registro` per `(fecha, turno)` (unique), with
  inline Elaboración fields + 1:N `envasado_item` / `pnc_item`, plus `operario`, `tipo_envasado`,
  `config_formula`, `auditoria`. Better Auth tables live in `schema/auth.ts`.

## Project-specific gotchas

- **Migration policy (pre-production): a single clean `init`.** When the schema changes, run
  `pnpm db:reset-init` (wipes `packages/db/src/migrations` and regenerates `0000_init`), then recreate the
  DB (`docker compose -f packages/db/docker-compose.yml down -v && ... up -d --wait`), `pnpm db:migrate`,
  `pnpm db:seed`. Switch to additive migrations once there is real data.
- **Adding a Better Auth plugin usually means new columns** in `packages/db/src/schema/auth.ts` (the schema
  is hand-maintained, not generated): `admin` needs `user.banned/banReason/banExpires` + `session.impersonatedBy`;
  `jwt` needs the `jwks` table. Regenerate the init migration afterward.
- **pnpm is strict:** a package must declare every dependency it imports in its own `package.json`
  (e.g., `drizzle-orm` had to be added to `packages/api`).
- `package.json` `packageManager` must be an exact version (`pnpm@10.14.0`) or Turbo/Docker break.
- Running the server from the wrong cwd fails env validation — `.env` lives in `apps/server`, so start via
  `pnpm --filter server start`/`dev:server`.

## Deploy

Single Docker image (`Dockerfile`): builds the web and runs the server with Bun (one process).
`docker-compose.yml` (app + Postgres) targets **Dokploy**; migrate + seed run on container start. Required
env is documented in `.env.example` (`APP_URL`, `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET`, `ADMIN_*`).
