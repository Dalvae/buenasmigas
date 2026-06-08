import { env } from "@buenasmigas/env/server";
import { drizzle } from "drizzle-orm/bun-sql";

import * as schema from "./schema";

// Driver nativo de Bun (Bun.sql), no node-postgres. Corre bajo Bun.
export function createDb() {
  return drizzle(env.DATABASE_URL, { schema });
}

export const db = createDb();

export * from "./schema";
