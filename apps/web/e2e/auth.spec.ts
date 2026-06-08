import { expect, test } from "@playwright/test";
import { EMAIL, login } from "./helpers";

test("sin sesión redirige a /login", async ({ page }) => {
	await page.goto("/");
	await expect(page).toHaveURL(/\/login/);
	await expect(
		page.getByRole("heading", { name: "Buenas Migas" }),
	).toBeVisible();
});

test("login válido entra a la app", async ({ page }) => {
	await login(page);
});

test("login inválido se queda en /login", async ({ page }) => {
	await page.goto("/login");
	await page.getByLabel("Correo").fill(EMAIL);
	await page.getByLabel("Contraseña").fill("claveincorrecta999");
	await page.getByRole("button", { name: "Ingresar" }).click();
	await expect(page).toHaveURL(/\/login/);
	await expect(page.getByRole("button", { name: "Ingresar" })).toBeVisible();
});
