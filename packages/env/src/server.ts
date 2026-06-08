import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    // Admin inicial creado por el seed (RF-AUTH-06)
    ADMIN_EMAIL: z.email().default("admin@buenasmigas.cl"),
    ADMIN_PASSWORD: z.string().min(8).default("buenasmigas2026"),
    ADMIN_NAME: z.string().default("Administrador"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
