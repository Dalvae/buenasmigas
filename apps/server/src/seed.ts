import { auth } from "@buenasmigas/auth";
import {
  configFormula,
  db,
  operario,
  tipoEnvasado,
  user,
} from "@buenasmigas/db";
import { env } from "@buenasmigas/env/server";
import { eq } from "drizzle-orm";

// Datos placeholder (configurables luego por el admin desde la app).
const OPERARIOS = ["Operario 1", "Operario 2", "Operario 3"];

const TIPOS_ENVASADO = [
  "Bolsa 500g",
  "Bolsa 1kg",
  "Bandeja 6 un",
  "Bandeja 12 un",
  "Caja 24 un",
  "Pack familiar",
  "Granel",
  "Marraqueta bolsa",
  "Hallulla bolsa",
  "Pastelería caja",
];

// Parámetros de fórmula (RF-CALC-04). Valores placeholder, editables por admin.
const CONFIG = [
  {
    clave: "pnc_peso_unitario_kg",
    valor: 0.05,
    descripcion: "Kg por unidad para el total PNC (RF-CALC-03)",
  },
  {
    clave: "pnc_peso_bandeja_kg",
    valor: 2.0,
    descripcion: "Kg por bandeja para el total PNC (RF-CALC-03)",
  },
  {
    clave: "decimales_pct",
    valor: 1,
    descripcion: "Decimales de redondeo en los porcentajes",
  },
];

async function main() {
  console.log("🌱 Seed: iniciando...");

  // Operarios
  const operariosExistentes = await db.select().from(operario);
  if (operariosExistentes.length === 0) {
    await db.insert(operario).values(OPERARIOS.map((nombre) => ({ nombre })));
    console.log(`  ✓ ${OPERARIOS.length} operarios`);
  }

  // Tipos de envasado
  const tiposExistentes = await db.select().from(tipoEnvasado);
  if (tiposExistentes.length === 0) {
    await db
      .insert(tipoEnvasado)
      .values(TIPOS_ENVASADO.map((nombre) => ({ nombre })));
    console.log(`  ✓ ${TIPOS_ENVASADO.length} tipos de envasado`);
  }

  // Parámetros de fórmula
  for (const c of CONFIG) {
    await db.insert(configFormula).values(c).onConflictDoNothing();
  }
  console.log(`  ✓ parámetros de fórmula`);

  // Usuario admin (RF-AUTH-06)
  const adminExistente = await db
    .select()
    .from(user)
    .where(eq(user.email, env.ADMIN_EMAIL));
  if (adminExistente.length === 0) {
    await auth.api.signUpEmail({
      body: {
        email: env.ADMIN_EMAIL,
        password: env.ADMIN_PASSWORD,
        name: env.ADMIN_NAME,
      },
    });
    await db
      .update(user)
      .set({ role: "admin" })
      .where(eq(user.email, env.ADMIN_EMAIL));
    console.log(`  ✓ admin: ${env.ADMIN_EMAIL}`);
  } else {
    console.log(`  · admin ya existe: ${env.ADMIN_EMAIL}`);
  }

  console.log("✅ Seed completo");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed falló:", err);
  process.exit(1);
});
