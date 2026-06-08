import { expect, test } from "@playwright/test";

// Sesión vía storageState (proyecto "authed").
test.describe.configure({ mode: "serial" });

test("admin: crear y eliminar un usuario (se limpia solo)", async ({
	page,
}) => {
	await page.goto("/admin");
	await expect(
		page.getByRole("heading", { name: "Administración" }),
	).toBeVisible();

	const email = `e2e${Date.now()}@buenasmigas.cl`;
	await page.locator("#u-name").fill("E2E Test");
	await page.locator("#u-email").fill(email);
	await page.locator("#u-pass").fill("e2etest1234");
	await page.getByRole("button", { name: "Crear" }).click();
	await expect(page.getByText("Usuario creado")).toBeVisible({
		timeout: 10000,
	});
	await expect(page.getByRole("cell", { name: email })).toBeVisible();

	// Eliminar (acepta el confirm) — verifica el delete y deja prod limpio.
	page.on("dialog", (d) => d.accept());
	await page
		.getByRole("row", { name: email })
		.getByRole("button", { name: "Eliminar" })
		.click();
	await expect(page.getByText("Usuario eliminado")).toBeVisible({
		timeout: 10000,
	});
	await expect(page.getByRole("cell", { name: email })).toHaveCount(0);
});

test("admin: editar un parámetro de fórmula", async ({ page }) => {
	await page.goto("/admin");
	const fila = page
		.getByRole("listitem")
		.filter({ hasText: "pnc_peso_unitario_kg" });
	await fila.getByRole("button", { name: "Guardar" }).click();
	await expect(page.getByText("Parámetro actualizado")).toBeVisible({
		timeout: 10000,
	});
});
