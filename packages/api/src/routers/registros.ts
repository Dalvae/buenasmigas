// Router de registros: capa de transporte (oRPC). Sólo declara el DTO de
// entrada, aplica el tier de auth, extrae lo que es del transporte (userId) y
// delega en el service. Traduce errores de dominio a ORPCError. No toca Drizzle.

import { ORPCError } from "@orpc/server";

import {
	actualizarRegistroDto,
	fechaTurnoDto,
	filtroDto,
	idDto,
	registroDto,
	upsertElaboracionDto,
	upsertEnvasadoDto,
	upsertPncDto,
} from "../dto/registros";
import { ConflictError, NotFoundError } from "../errors";
import { adminProcedure, protectedProcedure } from "../index";
import * as registros from "../services/registros";

function mapError(e: unknown): never {
	if (e instanceof ConflictError) {
		throw new ORPCError("CONFLICT", { message: e.message });
	}
	if (e instanceof NotFoundError) {
		throw new ORPCError("NOT_FOUND", { message: e.message });
	}
	throw e;
}

export const registrosRouter = {
	// Operarios + tipos + parámetros para el formulario de captura
	opciones: protectedProcedure.handler(() => registros.getOpciones()),

	// Lee el registro de un turno (fecha+turno) con sus ítems, o null si no existe.
	porFechaTurno: protectedProcedure
		.input(fechaTurnoDto)
		.handler(({ input }) => registros.getPorFechaTurno(input)),

	// Upsert Elaboración (wireframe: pantalla propia). Crea o actualiza el turno.
	upsertElaboracion: protectedProcedure
		.input(upsertElaboracionDto)
		.handler(({ input, context }) =>
			registros.upsertElaboracion(input, context.session?.user?.id ?? null),
		),

	// Upsert Envasado.
	upsertEnvasado: protectedProcedure
		.input(upsertEnvasadoDto)
		.handler(({ input, context }) =>
			registros.upsertEnvasado(input, context.session?.user?.id ?? null),
		),

	// Upsert PNC.
	upsertPnc: protectedProcedure
		.input(upsertPncDto)
		.handler(({ input, context }) =>
			registros.upsertPnc(input, context.session?.user?.id ?? null),
		),

	// RF-CAP: crear un registro por turno (único por fecha+turno)
	crear: protectedProcedure
		.input(registroDto)
		.handler(async ({ input, context }) => {
			try {
				return await registros.crear(input, context.session?.user?.id ?? null);
			} catch (e) {
				mapError(e);
			}
		}),

	// RF-CONS-01/02: listar registros por período (+ filtros)
	listar: protectedProcedure
		.input(filtroDto)
		.handler(({ input }) => registros.listar(input)),

	// Detalle de un registro con sus ítems
	obtener: protectedProcedure.input(idDto).handler(async ({ input }) => {
		try {
			return await registros.obtener(input.id);
		} catch (e) {
			mapError(e);
		}
	}),

	// RF-ADM-04: editar registro (solo admin)
	actualizar: adminProcedure
		.input(actualizarRegistroDto)
		.handler(async ({ input, context }) => {
			try {
				return await registros.actualizar(
					input,
					context.session?.user?.id ?? null,
				);
			} catch (e) {
				mapError(e);
			}
		}),

	// RF-ADM-04: eliminar registro (solo admin)
	eliminar: adminProcedure
		.input(idDto)
		.handler(({ input, context }) =>
			registros.eliminar(input.id, context.session?.user?.id ?? null),
		),
};
