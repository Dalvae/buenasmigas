import { test as setup } from "@playwright/test";
import { login } from "./helpers";

const authFile = "e2e/.auth/admin.json";

// Inicia sesión una vez y guarda la sesión (cookies + token Bearer en
// localStorage) para que el resto de pruebas no tengan que re-loguearse.
setup("authenticate", async ({ page }) => {
	await login(page);
	await page.context().storageState({ path: authFile });
});
