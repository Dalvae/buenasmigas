import { createDb } from "@buenasmigas/db";
import * as schema from "@buenasmigas/db/schema/auth";
import { env } from "@buenasmigas/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, bearer, jwt } from "better-auth/plugins";

export function createAuth() {
	const db = createDb();

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",

			schema: schema,
		}),
		trustedOrigins: [env.CORS_ORIGIN],
		emailAndPassword: {
			enabled: true,
		},
		user: {
			additionalFields: {
				// Rol de autorización (operario | admin). No editable en signup;
				// el admin lo asigna. Ver RF-AUTH-02 / matriz de capacidades.
				role: {
					type: "string",
					required: false,
					defaultValue: "operario",
					input: false,
				},
			},
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		// Mínima fricción ("llega y pum"): sesión de larga duración con auto-refresh.
		// Los operarios entran una vez y casi nunca se reautentican.
		session: {
			expiresIn: 60 * 60 * 24 * 90, // 90 días
			updateAge: 60 * 60 * 24, // se refresca con el uso (cada 1 día)
			cookieCache: { enabled: true, maxAge: 60 * 5 },
		},
		advanced: {
			defaultCookieAttributes: {
				sameSite: "none",
				secure: true,
				httpOnly: true,
			},
		},
		// Auth por token en header (JWT + Bearer) + gestión de usuarios por admin
		// (crear, cambiar rol, RESETEAR clave, eliminar). RF-ADM-05.
		plugins: [
			admin({ defaultRole: "operario", adminRoles: ["admin"] }),
			bearer(),
			jwt(),
		],
	});
}

export const auth = createAuth();
