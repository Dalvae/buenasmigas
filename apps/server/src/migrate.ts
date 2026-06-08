import { join } from "node:path";
import { db } from "@buenasmigas/db";
import { migrate } from "drizzle-orm/bun-sql/migrator";

// Aplica migraciones con el migrador nativo de Bun (sin drizzle-kit en runtime).
// Usado en el arranque del contenedor antes del seed y del server.
migrate(db, {
	migrationsFolder: join(
		import.meta.dir,
		"../../../packages/db/src/migrations",
	),
})
	.then(() => {
		console.log("✅ Migraciones aplicadas");
		process.exit(0);
	})
	.catch((err) => {
		console.error("❌ Migración falló:", err);
		process.exit(1);
	});
