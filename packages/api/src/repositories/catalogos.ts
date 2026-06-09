// Repositorio de catálogos: acceso a las listas administrables (operarios,
// tipos de envasado) y a los parámetros de fórmula. Única capa que conoce el
// schema de Drizzle para estos dominios.

import { configFormula, db, operario, tipoEnvasado } from "@buenasmigas/db";
import { asc, eq } from "drizzle-orm";

// --- Operarios ---
export function listOperarios(opts?: { soloActivos?: boolean }) {
	if (opts?.soloActivos) {
		return db
			.select()
			.from(operario)
			.where(eq(operario.activo, true))
			.orderBy(asc(operario.nombre));
	}
	return db.select().from(operario).orderBy(asc(operario.nombre));
}

export async function createOperario(nombre: string) {
	const [row] = await db.insert(operario).values({ nombre }).returning();
	return row;
}

export async function updateOperario(
	id: number,
	patch: { nombre?: string; activo?: boolean },
) {
	const [row] = await db
		.update(operario)
		.set(patch)
		.where(eq(operario.id, id))
		.returning();
	return row;
}

// --- Tipos de envasado ---
export function listTipos(opts?: { soloActivos?: boolean }) {
	if (opts?.soloActivos) {
		return db
			.select()
			.from(tipoEnvasado)
			.where(eq(tipoEnvasado.activo, true))
			.orderBy(asc(tipoEnvasado.nombre));
	}
	return db.select().from(tipoEnvasado).orderBy(asc(tipoEnvasado.nombre));
}

export async function createTipo(nombre: string) {
	const [row] = await db.insert(tipoEnvasado).values({ nombre }).returning();
	return row;
}

export async function updateTipo(
	id: number,
	patch: { nombre?: string; activo?: boolean },
) {
	const [row] = await db
		.update(tipoEnvasado)
		.set(patch)
		.where(eq(tipoEnvasado.id, id))
		.returning();
	return row;
}

// --- Parámetros de fórmula ---
export function listConfig() {
	return db.select().from(configFormula).orderBy(asc(configFormula.clave));
}

export async function getConfigMap(): Promise<Record<string, number>> {
	const rows = await db.select().from(configFormula);
	const map: Record<string, number> = {};
	for (const r of rows) map[r.clave] = r.valor;
	return map;
}

export async function updateConfig(clave: string, valor: number) {
	const [row] = await db
		.update(configFormula)
		.set({ valor })
		.where(eq(configFormula.clave, clave))
		.returning();
	return row;
}
