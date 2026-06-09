import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		CORS_ORIGIN: z.url(),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
		// Admin inicial creado por el seed (RF-AUTH-06)
		ADMIN_EMAIL: z.email().default("admin@buenasmigas.cl"),
		// Sin default: si no se setea explícitamente, el arranque falla en vez de
		// quedar con una credencial conocida. min(12) para forzar una clave decente.
		ADMIN_PASSWORD: z.string().min(12),
		ADMIN_NAME: z.string().default("Administrador"),
		PORT: z.coerce.number().default(3000),
		// Ruta del build estático del frontend a servir (Docker). En dev se omite.
		WEB_DIST: z.string().optional(),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
