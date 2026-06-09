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

export const pncItemDto = z.object({
	descripcion: z.string().optional(),
	unidades: z.number().min(0),
	kilos: z.number().min(0),
	bandejas: z.number().min(0),
	carros: z.number().min(0).default(0),
});

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
