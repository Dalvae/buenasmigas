import { crear } from "@buenasmigas/api/services/registros";
import { auth } from "@buenasmigas/auth";
import {
	configFormula,
	db,
	operario,
	registro,
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
		valor: 0.055,
		descripcion: "Kg por unidad para el total PNC (RF-CALC-03)",
	},
	{
		clave: "pnc_peso_bandeja_kg",
		valor: 1.925, // 35 unidades × 0,055
		descripcion:
			"Kg por bandeja (35 un × 0,055) para el total PNC (RF-CALC-03)",
	},
	{
		clave: "pnc_peso_carro_kg",
		valor: 36.575, // 665 unidades × 0,055
		descripcion: "Kg por carro (665 un × 0,055) para el total PNC (RF-CALC-03)",
	},
	{
		clave: "decimales_pct",
		valor: 1,
		descripcion: "Decimales de redondeo en los porcentajes",
	},
];

// Registros demo (solo si la tabla está vacía) — para ver gráficos/semáforo con
// forma. Los % y los kg de PNC los calcula el service `crear`, igual que la app.
type DemoReg = {
	day: number; // día del mes (mes actual)
	turno: "1" | "2" | "3";
	op: number; // índice de operario
	batchProg: number;
	batchReal: number;
	env: [number, number, number][]; // [índiceTipo, pedido, real]
	pnc: [string, number, number, number, number][]; // [desc, unidades, kilos, bandejas, carros]
};

const DEMO: DemoReg[] = [
	{
		day: 2,
		turno: "1",
		op: 0,
		batchProg: 8,
		batchReal: 8,
		env: [
			[0, 100, 99],
			[1, 80, 78],
		],
		pnc: [["Producto Quemado", 25, 0, 0, 0]],
	},
	{
		day: 2,
		turno: "2",
		op: 1,
		batchProg: 10,
		batchReal: 9,
		env: [
			[2, 120, 110],
			[3, 60, 55],
		],
		pnc: [["Producto deforme", 0, 8, 0, 0]],
	},
	{
		day: 3,
		turno: "1",
		op: 0,
		batchProg: 10,
		batchReal: 7,
		env: [[0, 90, 70]],
		pnc: [["Mal Etiquetado", 40, 0, 5, 0]],
	},
	{
		day: 4,
		turno: "1",
		op: 2,
		batchProg: 9,
		batchReal: 9,
		env: [
			[1, 100, 100],
			[4, 50, 48],
		],
		pnc: [],
	},
	{
		day: 5,
		turno: "2",
		op: 1,
		batchProg: 12,
		batchReal: 11,
		env: [[2, 140, 120]],
		pnc: [["Producto Quemado", 10, 0, 0, 1]],
	},
	{
		day: 6,
		turno: "1",
		op: 0,
		batchProg: 8,
		batchReal: 6,
		env: [
			[0, 80, 60],
			[1, 40, 38],
		],
		pnc: [["Producto deforme", 0, 15, 2, 0]],
	},
	{
		day: 7,
		turno: "3",
		op: 2,
		batchProg: 10,
		batchReal: 10,
		env: [[3, 110, 108]],
		pnc: [["Otros", 5, 2, 0, 0]],
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
	console.log("  ✓ parámetros de fórmula");

	// Usuario admin (RF-AUTH-06)
	const adminExistente = await db
		.select()
		.from(user)
		.where(eq(user.email, env.ADMIN_EMAIL));
	if (adminExistente.length === 0) {
		// Alta vía el plugin admin (crea + asigna rol en un paso). Es el camino
		// server-side que ignora `disableSignUp` (signup público cerrado); sin
		// headers corre con privilegio interno.
		await auth.api.createUser({
			body: {
				email: env.ADMIN_EMAIL,
				password: env.ADMIN_PASSWORD,
				name: env.ADMIN_NAME,
				role: "admin",
			},
		});
		console.log(`  ✓ admin: ${env.ADMIN_EMAIL}`);
	} else {
		console.log(`  · admin ya existe: ${env.ADMIN_EMAIL}`);
	}

	// Registros demo (idempotente: solo si no hay ninguno)
	const registrosExistentes = await db
		.select({ id: registro.id })
		.from(registro)
		.limit(1);
	if (registrosExistentes.length === 0) {
		const ops = await db.select().from(operario);
		const tps = await db.select().from(tipoEnvasado);
		const opAt = (i: number) => {
			const o = ops[i % ops.length];
			if (!o) throw new Error("no hay operarios para el seed demo");
			return o.id;
		};
		const tpAt = (i: number) => {
			const t = tps[i % tps.length];
			if (!t) throw new Error("no hay tipos para el seed demo");
			return t.id;
		};
		const now = new Date();
		const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
		for (const r of DEMO) {
			await crear(
				{
					fecha: `${ym}-${String(r.day).padStart(2, "0")}`,
					turno: r.turno,
					operarioId: opAt(r.op),
					batchReal: r.batchReal,
					batchProg: r.batchProg,
					envasado: r.env.map(([ti, pedido, real]) => ({
						tipoEnvasadoId: tpAt(ti),
						pedido,
						real,
					})),
					pnc: r.pnc.map(
						([descripcion, unidades, kilos, bandejas, carros]) => ({
							descripcion,
							unidades,
							kilos,
							bandejas,
							carros,
						}),
					),
				},
				null,
			);
		}
		console.log(`  ✓ ${DEMO.length} registros demo`);
	}

	console.log("✅ Seed completo");
	process.exit(0);
}

main().catch((err) => {
	console.error("❌ Seed falló:", err);
	process.exit(1);
});
