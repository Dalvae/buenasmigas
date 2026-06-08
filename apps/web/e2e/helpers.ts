import { expect, type Page } from "@playwright/test";

export const EMAIL = process.env.E2E_EMAIL ?? "admin@buenasmigas.cl";
export const PASSWORD = process.env.E2E_PASSWORD ?? "buenasmigas2026";

/** Fecha de hoy en formato YYYY-MM-DD (igual que la app). */
export function hoy(): string {
	return new Date().toLocaleDateString("en-CA");
}

/** Inicia sesión y espera a entrar a la app (menú o consultas). */
export async function login(page: Page): Promise<void> {
	await page.goto("/login");
	await page.getByLabel("Correo").fill(EMAIL);
	await page.getByLabel("Contraseña").fill(PASSWORD);
	await page.getByRole("button", { name: "Ingresar" }).click();
	await page.waitForURL(/\/(consultas|dashboard)/, { timeout: 15000 });
	await expect(page.getByRole("button", { name: "Salir" })).toBeVisible();
}
