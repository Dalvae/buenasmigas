import {
	auditoria,
	configFormula,
	db,
	envasadoItem,
	operario,
	pncItem,
	registro,
	tipoEnvasado,
} from "@buenasmigas/db";
import { ORPCError } from "@orpc/server";
import { and, asc, between, eq } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, protectedProcedure } from "../index";
import {
	calcElaboracionPct,
	calcEnvasadoPct,
	calcPncTotalKg,
} from "../lib/formulas";

const turnoSchema = z.enum(["1", "2", "3"]);

const envasadoItemSchema = z.object({
	tipoEnvasadoId: z.number().int().positive(),
	pedido: z.number().int().min(0),
	real: z.number().int().min(0),
});

const pncItemSchema = z.object({
	descripcion: z.string().optional(),
	unidades: z.number().min(0),
	kilos: z.number().min(0),
	bandejas: z.number().min(0),
});

const registroInput = z.object({
	fecha: z.string(), // YYYY-MM-DD
	turno: turnoSchema,
	operarioId: z.number().int().positive(),
	batchReal: z.number().int().min(0),
	batchProg: z.number().int().min(0),
	envasado: z.array(envasadoItemSchema).default([]),
	pnc: z.array(pncItemSchema).default([]),
});

const filtroInput = z.object({
	desde: z.string(),
	hasta: z.string(),
	turno: turnoSchema.optional(),
	operarioId: z.number().int().positive().optional(),
});

async function getConfig(): Promise<Record<string, number>> {
	const rows = await db.select().from(configFormula);
	const map: Record<string, number> = {};
	for (const r of rows) map[r.clave] = r.valor;
	return map;
}

function calcular(
	input: z.infer<typeof registroInput>,
	cfg: Record<string, number>,
) {
	const decimals = cfg.decimales_pct ?? 1;
	return {
		elaboracionPct: calcElaboracionPct(
			input.batchReal,
			input.batchProg,
			decimals,
		),
		envasadoPct: calcEnvasadoPct(input.envasado, decimals),
		pncTotalKg: calcPncTotalKg(input.pnc, cfg),
	};
}

export const registrosRouter = {
	// Operarios + tipos + parámetros para el formulario de captura
	opciones: protectedProcedure.handler(async () => {
		const operarios = await db
			.select()
			.from(operario)
			.where(eq(operario.activo, true))
			.orderBy(asc(operario.nombre));
		const tipos = await db
			.select()
			.from(tipoEnvasado)
			.where(eq(tipoEnvasado.activo, true))
			.orderBy(asc(tipoEnvasado.nombre));
		const config = await getConfig();
		return { operarios, tipos, config };
	}),

	// Lee el registro de un turno (fecha+turno) con sus ítems, o null si no existe.
	// Prellena las pantallas de cada módulo y permite mostrar el semáforo.
	porFechaTurno: protectedProcedure
		.input(z.object({ fecha: z.string(), turno: turnoSchema }))
		.handler(async ({ input }) => {
			const [reg] = await db
				.select()
				.from(registro)
				.where(
					and(eq(registro.fecha, input.fecha), eq(registro.turno, input.turno)),
				);
			if (!reg) return null;
			const envasado = await db
				.select({
					id: envasadoItem.id,
					tipoEnvasadoId: envasadoItem.tipoEnvasadoId,
					tipo: tipoEnvasado.nombre,
					pedido: envasadoItem.pedido,
					real: envasadoItem.real,
				})
				.from(envasadoItem)
				.innerJoin(
					tipoEnvasado,
					eq(envasadoItem.tipoEnvasadoId, tipoEnvasado.id),
				)
				.where(eq(envasadoItem.registroId, reg.id));
			const pnc = await db
				.select()
				.from(pncItem)
				.where(eq(pncItem.registroId, reg.id));
			return { ...reg, envasado, pnc };
		}),

	// Upsert Elaboración (wireframe: pantalla propia). Crea o actualiza el turno.
	upsertElaboracion: protectedProcedure
		.input(
			z.object({
				fecha: z.string(),
				turno: turnoSchema,
				operarioId: z.number().int().positive(),
				batchReal: z.number().int().min(0),
				batchProg: z.number().int().min(0),
			}),
		)
		.handler(async ({ input, context }) => {
			const cfg = await getConfig();
			const elaboracionPct = calcElaboracionPct(
				input.batchReal,
				input.batchProg,
				cfg.decimales_pct ?? 1,
			);
			const userId = context.session?.user?.id ?? null;
			const id = await db.transaction(async (tx) => {
				const [existing] = await tx
					.select({ id: registro.id })
					.from(registro)
					.where(
						and(
							eq(registro.fecha, input.fecha),
							eq(registro.turno, input.turno),
						),
					);
				let regId = existing?.id;
				if (!regId) {
					const [created] = await tx
						.insert(registro)
						.values({
							fecha: input.fecha,
							turno: input.turno,
							operarioId: input.operarioId,
							createdBy: userId,
						})
						.returning({ id: registro.id });
					if (!created) throw new Error("No se pudo crear el registro");
					regId = created.id;
				}
				await tx
					.update(registro)
					.set({
						operarioId: input.operarioId,
						batchReal: input.batchReal,
						batchProg: input.batchProg,
						elaboracionPct,
					})
					.where(eq(registro.id, regId));
				await tx.insert(auditoria).values({
					registroId: regId,
					accion: "editar",
					usuarioId: userId,
					detalle: "Elaboración",
				});
				return regId;
			});
			return { id, elaboracionPct };
		}),

	// Upsert Envasado.
	upsertEnvasado: protectedProcedure
		.input(
			z.object({
				fecha: z.string(),
				turno: turnoSchema,
				operarioId: z.number().int().positive(),
				envasado: z.array(envasadoItemSchema).default([]),
			}),
		)
		.handler(async ({ input, context }) => {
			const cfg = await getConfig();
			const envasadoPct = calcEnvasadoPct(
				input.envasado,
				cfg.decimales_pct ?? 1,
			);
			const userId = context.session?.user?.id ?? null;
			const id = await db.transaction(async (tx) => {
				const [existing] = await tx
					.select({ id: registro.id })
					.from(registro)
					.where(
						and(
							eq(registro.fecha, input.fecha),
							eq(registro.turno, input.turno),
						),
					);
				let regId = existing?.id;
				if (!regId) {
					const [created] = await tx
						.insert(registro)
						.values({
							fecha: input.fecha,
							turno: input.turno,
							operarioId: input.operarioId,
							createdBy: userId,
						})
						.returning({ id: registro.id });
					if (!created) throw new Error("No se pudo crear el registro");
					regId = created.id;
				}
				await tx
					.update(registro)
					.set({ operarioId: input.operarioId, envasadoPct })
					.where(eq(registro.id, regId));
				await tx.delete(envasadoItem).where(eq(envasadoItem.registroId, regId));
				if (input.envasado.length) {
					await tx
						.insert(envasadoItem)
						.values(input.envasado.map((i) => ({ ...i, registroId: regId })));
				}
				await tx.insert(auditoria).values({
					registroId: regId,
					accion: "editar",
					usuarioId: userId,
					detalle: "Envasado",
				});
				return regId;
			});
			return { id, envasadoPct };
		}),

	// Upsert PNC.
	upsertPnc: protectedProcedure
		.input(
			z.object({
				fecha: z.string(),
				turno: turnoSchema,
				operarioId: z.number().int().positive(),
				pnc: z.array(pncItemSchema).default([]),
			}),
		)
		.handler(async ({ input, context }) => {
			const cfg = await getConfig();
			const pncTotalKg = calcPncTotalKg(input.pnc, cfg);
			const userId = context.session?.user?.id ?? null;
			const id = await db.transaction(async (tx) => {
				const [existing] = await tx
					.select({ id: registro.id })
					.from(registro)
					.where(
						and(
							eq(registro.fecha, input.fecha),
							eq(registro.turno, input.turno),
						),
					);
				let regId = existing?.id;
				if (!regId) {
					const [created] = await tx
						.insert(registro)
						.values({
							fecha: input.fecha,
							turno: input.turno,
							operarioId: input.operarioId,
							createdBy: userId,
						})
						.returning({ id: registro.id });
					if (!created) throw new Error("No se pudo crear el registro");
					regId = created.id;
				}
				await tx
					.update(registro)
					.set({ operarioId: input.operarioId, pncTotalKg })
					.where(eq(registro.id, regId));
				await tx.delete(pncItem).where(eq(pncItem.registroId, regId));
				if (input.pnc.length) {
					await tx
						.insert(pncItem)
						.values(input.pnc.map((i) => ({ ...i, registroId: regId })));
				}
				await tx.insert(auditoria).values({
					registroId: regId,
					accion: "editar",
					usuarioId: userId,
					detalle: "PNC",
				});
				return regId;
			});
			return { id, pncTotalKg };
		}),

	// RF-CAP: crear un registro por turno (único por fecha+turno)
	crear: protectedProcedure
		.input(registroInput)
		.handler(async ({ input, context }) => {
			const cfg = await getConfig();
			const calc = calcular(input, cfg);
			const userId = context.session?.user?.id ?? null;
			try {
				const id = await db.transaction(async (tx) => {
					const [reg] = await tx
						.insert(registro)
						.values({
							fecha: input.fecha,
							turno: input.turno,
							operarioId: input.operarioId,
							batchReal: input.batchReal,
							batchProg: input.batchProg,
							elaboracionPct: calc.elaboracionPct,
							envasadoPct: calc.envasadoPct,
							pncTotalKg: calc.pncTotalKg,
							createdBy: userId,
						})
						.returning({ id: registro.id });
					if (!reg) throw new Error("No se pudo crear el registro");
					if (input.envasado.length) {
						await tx
							.insert(envasadoItem)
							.values(
								input.envasado.map((i) => ({ ...i, registroId: reg.id })),
							);
					}
					if (input.pnc.length) {
						await tx
							.insert(pncItem)
							.values(input.pnc.map((i) => ({ ...i, registroId: reg.id })));
					}
					await tx.insert(auditoria).values({
						registroId: reg.id,
						accion: "crear",
						usuarioId: userId,
						detalle: `Turno ${input.turno} · ${input.fecha}`,
					});
					return reg.id;
				});
				return { id, ...calc };
			} catch (e) {
				const msg = String((e as { message?: string })?.message ?? e);
				if (msg.includes("registro_fecha_turno_idx") || msg.includes("23505")) {
					throw new ORPCError("CONFLICT", {
						message: "Ya existe un registro para esa fecha y turno.",
					});
				}
				throw e;
			}
		}),

	// RF-CONS-01/02: listar registros por período (+ filtros)
	listar: protectedProcedure.input(filtroInput).handler(async ({ input }) => {
		const conds = [between(registro.fecha, input.desde, input.hasta)];
		if (input.turno) conds.push(eq(registro.turno, input.turno));
		if (input.operarioId) conds.push(eq(registro.operarioId, input.operarioId));
		return db
			.select({
				id: registro.id,
				fecha: registro.fecha,
				turno: registro.turno,
				operarioId: registro.operarioId,
				operario: operario.nombre,
				elaboracionPct: registro.elaboracionPct,
				envasadoPct: registro.envasadoPct,
				pncTotalKg: registro.pncTotalKg,
				createdAt: registro.createdAt,
			})
			.from(registro)
			.innerJoin(operario, eq(registro.operarioId, operario.id))
			.where(and(...conds))
			.orderBy(asc(registro.fecha), asc(registro.turno));
	}),

	// Detalle de un registro con sus ítems
	obtener: protectedProcedure
		.input(z.object({ id: z.number().int() }))
		.handler(async ({ input }) => {
			const [reg] = await db
				.select()
				.from(registro)
				.where(eq(registro.id, input.id));
			if (!reg) throw new ORPCError("NOT_FOUND");
			const envasado = await db
				.select({
					id: envasadoItem.id,
					tipoEnvasadoId: envasadoItem.tipoEnvasadoId,
					tipo: tipoEnvasado.nombre,
					pedido: envasadoItem.pedido,
					real: envasadoItem.real,
				})
				.from(envasadoItem)
				.innerJoin(
					tipoEnvasado,
					eq(envasadoItem.tipoEnvasadoId, tipoEnvasado.id),
				)
				.where(eq(envasadoItem.registroId, input.id));
			const pnc = await db
				.select()
				.from(pncItem)
				.where(eq(pncItem.registroId, input.id));
			return { ...reg, envasado, pnc };
		}),

	// RF-ADM-04: editar registro (solo admin)
	actualizar: adminProcedure
		.input(registroInput.extend({ id: z.number().int() }))
		.handler(async ({ input, context }) => {
			const cfg = await getConfig();
			const calc = calcular(input, cfg);
			const userId = context.session?.user?.id ?? null;
			await db.transaction(async (tx) => {
				await tx
					.update(registro)
					.set({
						fecha: input.fecha,
						turno: input.turno,
						operarioId: input.operarioId,
						batchReal: input.batchReal,
						batchProg: input.batchProg,
						elaboracionPct: calc.elaboracionPct,
						envasadoPct: calc.envasadoPct,
						pncTotalKg: calc.pncTotalKg,
					})
					.where(eq(registro.id, input.id));
				await tx
					.delete(envasadoItem)
					.where(eq(envasadoItem.registroId, input.id));
				await tx.delete(pncItem).where(eq(pncItem.registroId, input.id));
				if (input.envasado.length) {
					await tx
						.insert(envasadoItem)
						.values(
							input.envasado.map((i) => ({ ...i, registroId: input.id })),
						);
				}
				if (input.pnc.length) {
					await tx
						.insert(pncItem)
						.values(input.pnc.map((i) => ({ ...i, registroId: input.id })));
				}
				await tx.insert(auditoria).values({
					registroId: input.id,
					accion: "editar",
					usuarioId: userId,
				});
			});
			return { id: input.id, ...calc };
		}),

	// RF-ADM-04: eliminar registro (solo admin)
	eliminar: adminProcedure
		.input(z.object({ id: z.number().int() }))
		.handler(async ({ input, context }) => {
			const userId = context.session?.user?.id ?? null;
			await db.insert(auditoria).values({
				registroId: input.id,
				accion: "borrar",
				usuarioId: userId,
			});
			await db.delete(registro).where(eq(registro.id, input.id));
			return { ok: true };
		}),
};
