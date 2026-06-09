// Repositorio de registros: ÚNICA capa que conoce el schema de Drizzle para el
// dominio de producción (registro + envasado_item + pnc_item + auditoría).
// Las transacciones viven aquí porque la atomicidad es una garantía de
// persistencia. Recibe valores ya computados por el service.

import {
	auditoria,
	db,
	envasadoItem,
	operario,
	pncItem,
	registro,
	tipoEnvasado,
} from "@buenasmigas/db";
import { and, asc, between, count, eq, sum } from "drizzle-orm";

import type { EnvasadoItemDto, PncItemDto, Turno } from "../dto/registros";
import { ConflictError } from "../errors";

// Tipo del `tx` que entrega db.transaction (evita duplicar el find-or-create).
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type RegistroBase = {
	fecha: string;
	turno: Turno;
	operarioId: number;
	userId: string | null;
};

async function findOrCreateRegistroId(
	tx: Tx,
	args: RegistroBase,
): Promise<number> {
	const [existing] = await tx
		.select({ id: registro.id })
		.from(registro)
		.where(and(eq(registro.fecha, args.fecha), eq(registro.turno, args.turno)));
	if (existing) return existing.id;
	// Carrera find-then-insert: si otro upsert concurrente insertó el mismo
	// (fecha,turno) entre el SELECT y el INSERT, `onConflictDoNothing` evita el
	// 500 por unique violation y devuelve vacío → re-SELECT para tomar el id ajeno.
	const [created] = await tx
		.insert(registro)
		.values({
			fecha: args.fecha,
			turno: args.turno,
			operarioId: args.operarioId,
			createdBy: args.userId,
		})
		.onConflictDoNothing({ target: [registro.fecha, registro.turno] })
		.returning({ id: registro.id });
	if (created) return created.id;
	const [racedRow] = await tx
		.select({ id: registro.id })
		.from(registro)
		.where(and(eq(registro.fecha, args.fecha), eq(registro.turno, args.turno)));
	if (!racedRow) throw new Error("No se pudo crear el registro");
	return racedRow.id;
}

function isUniqueViolation(e: unknown): boolean {
	const msg = String((e as { message?: string })?.message ?? e);
	return msg.includes("registro_fecha_turno_idx") || msg.includes("23505");
}

export async function findByFechaTurno(fecha: string, turno: Turno) {
	const [reg] = await db
		.select()
		.from(registro)
		.where(and(eq(registro.fecha, fecha), eq(registro.turno, turno)));
	return reg ?? null;
}

export async function getById(id: number) {
	const [reg] = await db.select().from(registro).where(eq(registro.id, id));
	return reg ?? null;
}

export function getEnvasadoItems(registroId: number) {
	return db
		.select({
			id: envasadoItem.id,
			tipoEnvasadoId: envasadoItem.tipoEnvasadoId,
			tipo: tipoEnvasado.nombre,
			pedido: envasadoItem.pedido,
			real: envasadoItem.real,
		})
		.from(envasadoItem)
		.innerJoin(tipoEnvasado, eq(envasadoItem.tipoEnvasadoId, tipoEnvasado.id))
		.where(eq(envasadoItem.registroId, registroId));
}

export function getPncItems(registroId: number) {
	return db.select().from(pncItem).where(eq(pncItem.registroId, registroId));
}

export async function listRegistros(filtro: {
	desde: string;
	hasta: string;
	turno?: Turno;
	operarioId?: number;
}) {
	const conds = [between(registro.fecha, filtro.desde, filtro.hasta)];
	if (filtro.turno) conds.push(eq(registro.turno, filtro.turno));
	if (filtro.operarioId) conds.push(eq(registro.operarioId, filtro.operarioId));

	// Sub-agregados por registro: evitan el producto cartesiano que daría unir
	// envasado_item y pnc_item a la vez (ambos 1:N) y corromper sumas/conteos.
	// Traemos los datos CRUDOS necesarios (Σ pedido/real de envasado; Σ de cada
	// componente de PNC); los indicadores se derivan en el service con la config
	// vigente, no se leen de columnas persistidas.
	const envasadoAgg = db
		.select({
			registroId: envasadoItem.registroId,
			pedido: sum(envasadoItem.pedido).as("pedido"),
			real: sum(envasadoItem.real).as("real"),
		})
		.from(envasadoItem)
		.groupBy(envasadoItem.registroId)
		.as("envasado_agg");
	const pncAgg = db
		.select({
			registroId: pncItem.registroId,
			items: count(pncItem.id).as("items"),
			unidades: sum(pncItem.unidades).as("unidades"),
			kilos: sum(pncItem.kilos).as("kilos"),
			bandejas: sum(pncItem.bandejas).as("bandejas"),
			carros: sum(pncItem.carros).as("carros"),
		})
		.from(pncItem)
		.groupBy(pncItem.registroId)
		.as("pnc_agg");

	const rows = await db
		.select({
			id: registro.id,
			fecha: registro.fecha,
			turno: registro.turno,
			operarioId: registro.operarioId,
			operario: operario.nombre,
			batchReal: registro.batchReal,
			batchProg: registro.batchProg,
			// Programado/real de envasado = Σ de los ítems del turno.
			envasadoPedido: envasadoAgg.pedido,
			envasadoReal: envasadoAgg.real,
			// Componentes crudos de PNC para derivar kg con la config vigente.
			pncUnidades: pncAgg.unidades,
			pncKilos: pncAgg.kilos,
			pncBandejas: pncAgg.bandejas,
			pncCarros: pncAgg.carros,
			// Nº de ítems PNC: distingue "0 kg ingresado" de "sin ingresar".
			pncCount: pncAgg.items,
			createdAt: registro.createdAt,
		})
		.from(registro)
		.innerJoin(operario, eq(registro.operarioId, operario.id))
		.leftJoin(envasadoAgg, eq(envasadoAgg.registroId, registro.id))
		.leftJoin(pncAgg, eq(pncAgg.registroId, registro.id))
		.where(and(...conds))
		.orderBy(asc(registro.fecha), asc(registro.turno));

	// Las agregaciones de Postgres llegan como string|null; normalizamos a number.
	return rows.map((r) => ({
		...r,
		envasadoPedido: Number(r.envasadoPedido ?? 0),
		envasadoReal: Number(r.envasadoReal ?? 0),
		pncUnidades: Number(r.pncUnidades ?? 0),
		pncKilos: Number(r.pncKilos ?? 0),
		pncBandejas: Number(r.pncBandejas ?? 0),
		pncCarros: Number(r.pncCarros ?? 0),
		pncCount: Number(r.pncCount ?? 0),
	}));
}

export function upsertElaboracion(
	data: RegistroBase & {
		batchReal: number;
		batchProg: number;
	},
) {
	return db.transaction(async (tx) => {
		const regId = await findOrCreateRegistroId(tx, data);
		await tx
			.update(registro)
			.set({
				operarioId: data.operarioId,
				batchReal: data.batchReal,
				batchProg: data.batchProg,
			})
			.where(eq(registro.id, regId));
		await tx.insert(auditoria).values({
			entidad: "registro",
			entidadId: String(regId),
			accion: "editar",
			usuarioId: data.userId,
			detalle: "Elaboración",
		});
		return regId;
	});
}

export function upsertEnvasado(
	data: RegistroBase & {
		envasado: EnvasadoItemDto[];
	},
) {
	return db.transaction(async (tx) => {
		const regId = await findOrCreateRegistroId(tx, data);
		await tx
			.update(registro)
			.set({ operarioId: data.operarioId })
			.where(eq(registro.id, regId));
		await tx.delete(envasadoItem).where(eq(envasadoItem.registroId, regId));
		if (data.envasado.length) {
			await tx
				.insert(envasadoItem)
				.values(data.envasado.map((i) => ({ ...i, registroId: regId })));
		}
		await tx.insert(auditoria).values({
			entidad: "registro",
			entidadId: String(regId),
			accion: "editar",
			usuarioId: data.userId,
			detalle: "Envasado",
		});
		return regId;
	});
}

export function upsertPnc(
	data: RegistroBase & {
		pnc: PncItemDto[];
	},
) {
	return db.transaction(async (tx) => {
		const regId = await findOrCreateRegistroId(tx, data);
		await tx
			.update(registro)
			.set({ operarioId: data.operarioId })
			.where(eq(registro.id, regId));
		await tx.delete(pncItem).where(eq(pncItem.registroId, regId));
		if (data.pnc.length) {
			await tx
				.insert(pncItem)
				.values(data.pnc.map((i) => ({ ...i, registroId: regId })));
		}
		await tx.insert(auditoria).values({
			entidad: "registro",
			entidadId: String(regId),
			accion: "editar",
			usuarioId: data.userId,
			detalle: "PNC",
		});
		return regId;
	});
}

export async function crearRegistro(
	data: RegistroBase & {
		batchReal: number;
		batchProg: number;
		envasado: EnvasadoItemDto[];
		pnc: PncItemDto[];
		detalle: string;
	},
): Promise<number> {
	try {
		return await db.transaction(async (tx) => {
			const [reg] = await tx
				.insert(registro)
				.values({
					fecha: data.fecha,
					turno: data.turno,
					operarioId: data.operarioId,
					batchReal: data.batchReal,
					batchProg: data.batchProg,
					createdBy: data.userId,
				})
				.returning({ id: registro.id });
			if (!reg) throw new Error("No se pudo crear el registro");
			if (data.envasado.length) {
				await tx
					.insert(envasadoItem)
					.values(data.envasado.map((i) => ({ ...i, registroId: reg.id })));
			}
			if (data.pnc.length) {
				await tx
					.insert(pncItem)
					.values(data.pnc.map((i) => ({ ...i, registroId: reg.id })));
			}
			await tx.insert(auditoria).values({
				entidad: "registro",
				entidadId: String(reg.id),
				accion: "crear",
				usuarioId: data.userId,
				detalle: data.detalle,
			});
			return reg.id;
		});
	} catch (e) {
		if (isUniqueViolation(e)) {
			throw new ConflictError("Ya existe un registro para esa fecha y turno.");
		}
		throw e;
	}
}

export async function actualizarRegistro(data: {
	id: number;
	fecha: string;
	turno: Turno;
	operarioId: number;
	batchReal: number;
	batchProg: number;
	envasado: EnvasadoItemDto[];
	pnc: PncItemDto[];
	userId: string | null;
}) {
	try {
		return await db.transaction(async (tx) => {
			await tx
				.update(registro)
				.set({
					fecha: data.fecha,
					turno: data.turno,
					operarioId: data.operarioId,
					batchReal: data.batchReal,
					batchProg: data.batchProg,
				})
				.where(eq(registro.id, data.id));
			await tx.delete(envasadoItem).where(eq(envasadoItem.registroId, data.id));
			await tx.delete(pncItem).where(eq(pncItem.registroId, data.id));
			if (data.envasado.length) {
				await tx
					.insert(envasadoItem)
					.values(data.envasado.map((i) => ({ ...i, registroId: data.id })));
			}
			if (data.pnc.length) {
				await tx
					.insert(pncItem)
					.values(data.pnc.map((i) => ({ ...i, registroId: data.id })));
			}
			await tx.insert(auditoria).values({
				entidad: "registro",
				entidadId: String(data.id),
				accion: "editar",
				usuarioId: data.userId,
			});
		});
	} catch (e) {
		// Mismo manejo que crearRegistro: editar fecha/turno a una combinación ya
		// existente viola el unique (fecha,turno) → ConflictError (409), no 500.
		if (isUniqueViolation(e)) {
			throw new ConflictError("Ya existe un registro para esa fecha y turno.");
		}
		throw e;
	}
}

export async function eliminarRegistro(data: {
	id: number;
	userId: string | null;
}) {
	// Auditoría antes del delete: auditoria no tiene FK al registro, queda como traza.
	await db.insert(auditoria).values({
		entidad: "registro",
		entidadId: String(data.id),
		accion: "borrar",
		usuarioId: data.userId,
	});
	await db.delete(registro).where(eq(registro.id, data.id));
	return { ok: true };
}
