// DTOs (Data Transfer Objects) del dominio de registros: el contrato de
// comunicación que cruza la frontera oRPC. Escritos a mano y desacoplados del
// schema de la DB a propósito (un DTO no deriva del modelo interno).

import { z } from "zod";

export const turnoDto = z.enum(["1", "2", "3"]);

export const envasadoItemDto = z.object({
	tipoEnvasadoId: z.number().int().positive(),
	pedido: z.number().int().min(0),
	real: z.number().int().min(0),
});

export const pncItemDto = z
	.object({
		descripcion: z.string().optional(),
		unidades: z.number().min(0),
		kilos: z.number().min(0),
		bandejas: z.number().min(0),
		carros: z.number().min(0).default(0),
	})
	// Una fila PNC totalmente vacía (todo en 0 y sin descripción) no aporta nada y
	// no debe persistirse vía API directa (el front ya las filtra). Exige al menos
	// un valor > 0 o una descripción no vacía.
	.refine(
		(i) =>
			i.unidades > 0 ||
			i.kilos > 0 ||
			i.bandejas > 0 ||
			i.carros > 0 ||
			(i.descripcion?.trim().length ?? 0) > 0,
		{ message: "La fila PNC no puede estar vacía." },
	);

export const fechaTurnoDto = z.object({ fecha: z.string(), turno: turnoDto });

export const idDto = z.object({ id: z.number().int() });

export const upsertElaboracionDto = z.object({
	fecha: z.string(),
	turno: turnoDto,
	operarioId: z.number().int().positive(),
	batchReal: z.number().int().min(0),
	batchProg: z.number().int().min(0),
});

export const upsertEnvasadoDto = z.object({
	fecha: z.string(),
	turno: turnoDto,
	operarioId: z.number().int().positive(),
	envasado: z.array(envasadoItemDto).default([]),
});

export const upsertPncDto = z.object({
	fecha: z.string(),
	turno: turnoDto,
	operarioId: z.number().int().positive(),
	pnc: z.array(pncItemDto).default([]),
});

// Registro completo (crear): campos de elaboración + ítems de envasado y PNC.
// Los indicadores (`*_pct`, `*_total_kg`) NO son input: los computa el service.
export const registroDto = z.object({
	fecha: z.string(),
	turno: turnoDto,
	operarioId: z.number().int().positive(),
	batchReal: z.number().int().min(0),
	batchProg: z.number().int().min(0),
	envasado: z.array(envasadoItemDto).default([]),
	pnc: z.array(pncItemDto).default([]),
});

export const actualizarRegistroDto = registroDto.extend({
	id: z.number().int(),
});

export const filtroDto = z.object({
	desde: z.string(),
	hasta: z.string(),
	turno: turnoDto.optional(),
	operarioId: z.number().int().positive().optional(),
});

// Filtro del export Excel. Llega como query string (no JSON), así que valida
// formato de fecha y coacciona `operarioId`. El endpoint lo usa para rechazar
// con 400 antes de tocar la DB y para construir el filename de forma segura.
const fechaIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const exportQueryDto = z.object({
	desde: fechaIso,
	hasta: fechaIso,
	turno: turnoDto.optional(),
	operarioId: z.coerce.number().int().positive().optional(),
});

// Tipos del contrato, reusados por los services (única fuente de verdad de la
// forma del input, vía z.infer; nunca se reescriben a mano).
export type Turno = z.infer<typeof turnoDto>;
export type EnvasadoItemDto = z.infer<typeof envasadoItemDto>;
export type PncItemDto = z.infer<typeof pncItemDto>;
export type UpsertElaboracionDto = z.infer<typeof upsertElaboracionDto>;
export type UpsertEnvasadoDto = z.infer<typeof upsertEnvasadoDto>;
export type UpsertPncDto = z.infer<typeof upsertPncDto>;
export type RegistroDto = z.infer<typeof registroDto>;
export type ActualizarRegistroDto = z.infer<typeof actualizarRegistroDto>;
export type FiltroDto = z.infer<typeof filtroDto>;
export type ExportQueryDto = z.infer<typeof exportQueryDto>;
