// Repositorio de catálogos: acceso a las listas administrables (operarios,
// tipos de envasado) y a los parámetros de fórmula. Única capa que conoce el
// schema de Drizzle para estos dominios.

import {
	auditoria,
	configFormula,
	db,
	operario,
	tipoEnvasado,
} from "@buenasmigas/db";
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

export function createOperario(nombre: string, actorUserId: string | null) {
	return db.transaction(async (tx) => {
		const [row] = await tx.insert(operario).values({ nombre }).returning();
		if (!row) throw new Error("No se pudo crear el operario");
		await tx.insert(auditoria).values({
			entidad: "operario",
			entidadId: String(row.id),
			accion: "crear",
			usuarioId: actorUserId,
			detalle: nombre,
		});
		return row;
	});
}

export function updateOperario(
	id: number,
	patch: { nombre?: string; activo?: boolean },
	actorUserId: string | null,
) {
	return db.transaction(async (tx) => {
		const [row] = await tx
			.update(operario)
			.set(patch)
			.where(eq(operario.id, id))
			.returning();
		await tx.insert(auditoria).values({
			entidad: "operario",
			entidadId: String(id),
			accion: "editar",
			usuarioId: actorUserId,
		});
		return row;
	});
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

export function createTipo(nombre: string, actorUserId: string | null) {
	return db.transaction(async (tx) => {
		const [row] = await tx.insert(tipoEnvasado).values({ nombre }).returning();
		if (!row) throw new Error("No se pudo crear el tipo de envasado");
		await tx.insert(auditoria).values({
			entidad: "tipo_envasado",
			entidadId: String(row.id),
			accion: "crear",
			usuarioId: actorUserId,
			detalle: nombre,
		});
		return row;
	});
}

export function updateTipo(
	id: number,
	patch: { nombre?: string; activo?: boolean },
	actorUserId: string | null,
) {
	return db.transaction(async (tx) => {
		const [row] = await tx
			.update(tipoEnvasado)
			.set(patch)
			.where(eq(tipoEnvasado.id, id))
			.returning();
		await tx.insert(auditoria).values({
			entidad: "tipo_envasado",
			entidadId: String(id),
			accion: "editar",
			usuarioId: actorUserId,
		});
		return row;
	});
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

export function updateConfig(
	clave: string,
	valor: number,
	actorUserId: string | null,
) {
	// Auditado: editar un parámetro de fórmula reinterpreta retroactivamente los
	// indicadores (que ahora se derivan en lectura), así que queda traza de quién
	// y qué cambió.
	return db.transaction(async (tx) => {
		const [row] = await tx
			.update(configFormula)
			.set({ valor })
			.where(eq(configFormula.clave, clave))
			.returning();
		await tx.insert(auditoria).values({
			entidad: "config_formula",
			entidadId: clave,
			accion: "editar",
			usuarioId: actorUserId,
			detalle: `${clave} = ${valor}`,
		});
		return row;
	});
}
