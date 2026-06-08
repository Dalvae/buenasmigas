import { expect, test } from "@playwright/test";
import { hoy } from "./helpers";

// Comparten el registro del turno 3 de hoy (upsert idempotente) → en serie.
// Sesión vía storageState (proyecto "authed"); no hace falta loguear por test.
test.describe.configure({ mode: "serial" });

test("el menú muestra las 4 opciones", async ({ page }) => {
	await page.goto("/dashboard");
	await expect(page.getByText("Registro de Datos de Producción")).toBeVisible();
	for (const opt of [
		"Ingreso Producción Elaboración",
		"Ingreso Producción Envasado",
		"Ingreso Producto No Conforme",
		"Ver resultados de Producción",
	]) {
		await expect(page.getByText(opt)).toBeVisible();
	}
});

test("agregar Elaboración calcula el % y guarda", async ({ page }) => {
	await page.goto("/elaboracion");
	await expect(
		page.getByRole("heading", { name: "Ingreso Producción Elaboración" }),
	).toBeVisible();
	await page.locator("#operario").selectOption({ label: "Operario 1" });
	await page.locator("#turno").selectOption("3");
	await page.locator("#fecha").fill(hoy());
	// Espera a que el prefill (porFechaTurno) se asiente antes de sobrescribir.
	await page.waitForTimeout(1500);
	await page.locator("#batchProg").fill("8");
	await page.locator("#batchReal").fill("10");
	await expect(page.getByText("125%")).toBeVisible(); // 10/8*100
	await page.getByRole("button", { name: "Guardar" }).click();
	await expect(page.getByText("Elaboración guardada")).toBeVisible({
		timeout: 10000,
	});
});

test("editar Elaboración: re-guardar con otro valor", async ({ page }) => {
	await page.goto("/elaboracion");
	await page.locator("#operario").selectOption({ label: "Operario 1" });
	await page.locator("#turno").selectOption("3");
	await page.waitForTimeout(1500);
	await page.locator("#batchProg").fill("10");
	await page.locator("#batchReal").fill("9");
	await expect(page.getByText("90%")).toBeVisible();
	await page.getByRole("button", { name: "Guardar" }).click();
	await expect(page.getByText("Elaboración guardada")).toBeVisible({
		timeout: 10000,
	});
});

test("el registro aparece en Consultas", async ({ page }) => {
	await page.goto("/consultas");
	await page.locator("#desde").fill(hoy());
	await page.locator("#hasta").fill(hoy());
	await expect(
		page.getByRole("cell", { name: "Operario 1" }).first(),
	).toBeVisible({ timeout: 10000 });
});

test("exportar a Excel descarga un .xlsx", async ({ page }) => {
	await page.goto("/consultas");
	await page.locator("#desde").fill(hoy());
	await page.locator("#hasta").fill(hoy());
	const [download] = await Promise.all([
		page.waitForEvent("download", { timeout: 15000 }),
		page.getByRole("button", { name: "Exportar a Excel" }).click(),
	]);
	expect(download.suggestedFilename()).toContain(".xlsx");
});
