import { defineConfig, devices } from "@playwright/test";

// Tests e2e contra una instancia ya corriendo (local o prod).
// Local:  E2E_BASE_URL=http://localhost:3000
// Prod:   E2E_BASE_URL=https://buenasmigas.dalvae.cl  E2E_PASSWORD=...
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	workers: 1, // serial: evita logins en paralelo (rate-limit de Better Auth)
	forbidOnly: !!process.env.CI,
	retries: 1,
	reporter: "line",
	use: { baseURL, trace: "on-first-retry", screenshot: "only-on-failure" },
	projects: [
		// Login una sola vez y guarda la sesión (token Bearer en localStorage).
		{ name: "setup", testMatch: /auth\.setup\.ts/ },
		// Pruebas del flujo de login (contexto limpio, sin sesión).
		{
			name: "guest",
			testMatch: /auth\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		// Resto de pruebas: ya autenticadas vía storageState (sin re-login).
		{
			name: "authed",
			testIgnore: [/auth\.setup\.ts/, /auth\.spec\.ts/],
			dependencies: ["setup"],
			use: {
				...devices["Desktop Chrome"],
				storageState: "e2e/.auth/admin.json",
			},
		},
	],
});
