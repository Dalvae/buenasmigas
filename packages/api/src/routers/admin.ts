// Router de administración: capa de transporte (oRPC). DTO + tier admin +
// delega en los services. Convierte headers de Node a Web (adaptación de
// transporte) antes de pasarlos al service. No toca Drizzle ni Better Auth.

import { ORPCError } from "@orpc/server";
import { fromNodeHeaders } from "better-auth/node";

import {
	actualizarConfigDto,
	actualizarOperarioDto,
	actualizarTipoDto,
	cambiarRolDto,
	crearOperarioDto,
	crearTipoDto,
	crearUsuarioDto,
	eliminarUsuarioDto,
	resetPasswordDto,
} from "../dto/admin";
import { ConflictError, NotFoundError } from "../errors";
import { adminProcedure } from "../index";
import * as catalogos from "../services/catalogos";
import * as usuarios from "../services/usuarios";

// Traduce errores de dominio y de Better Auth a ORPCError tipados con mensajes
// neutros en es-CL, sin filtrar detalles internos al cliente. Better Auth lanza
// APIError con `body.code`/`status`; los mapeamos a códigos oRPC estables.
function mapAdminError(e: unknown): never {
	if (e instanceof ConflictError) {
		throw new ORPCError("CONFLICT", { message: e.message });
	}
	if (e instanceof NotFoundError) {
		throw new ORPCError("NOT_FOUND", { message: e.message });
	}
	const err = e as {
		status?: number | string;
		body?: { code?: string; message?: string };
	};
	const code = err?.body?.code;
	if (code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
		throw new ORPCError("CONFLICT", { message: "Ese correo ya está en uso." });
	}
	if (
		err?.status === 401 ||
		err?.status === "UNAUTHORIZED" ||
		err?.status === 403 ||
		err?.status === "FORBIDDEN"
	) {
		throw new ORPCError("FORBIDDEN", {
			message: "No tienes permiso para esta operación.",
		});
	}
	if (err?.status === 404 || err?.status === "NOT_FOUND") {
		throw new ORPCError("NOT_FOUND", { message: "Usuario no encontrado." });
	}
	if (err?.status === 400 || err?.status === "BAD_REQUEST") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Solicitud inválida.",
		});
	}
	// Desconocido: error genérico, sin filtrar el mensaje interno.
	throw new ORPCError("INTERNAL_SERVER_ERROR", {
		message: "No se pudo completar la operación.",
	});
}

export const adminRouter = {
	// --- Operarios (RF-ADM-01) ---
	operarios: adminProcedure.handler(() => catalogos.listOperarios()),
	crearOperario: adminProcedure
		.input(crearOperarioDto)
		.handler(({ input, context }) =>
			catalogos.crearOperario(input.nombre, context.session?.user?.id ?? null),
		),
	actualizarOperario: adminProcedure
		.input(actualizarOperarioDto)
		.handler(({ input, context }) => {
			const { id, ...patch } = input;
			return catalogos.actualizarOperario(
				id,
				patch,
				context.session?.user?.id ?? null,
			);
		}),

	// --- Tipos de envasado (RF-ADM-02) ---
	tipos: adminProcedure.handler(() => catalogos.listTipos()),
	crearTipo: adminProcedure
		.input(crearTipoDto)
		.handler(({ input, context }) =>
			catalogos.crearTipo(input.nombre, context.session?.user?.id ?? null),
		),
	actualizarTipo: adminProcedure
		.input(actualizarTipoDto)
		.handler(({ input, context }) => {
			const { id, ...patch } = input;
			return catalogos.actualizarTipo(
				id,
				patch,
				context.session?.user?.id ?? null,
			);
		}),

	// --- Parámetros de fórmula (RF-ADM-03 / RF-CALC-04) ---
	config: adminProcedure.handler(() => catalogos.listConfig()),
	actualizarConfig: adminProcedure
		.input(actualizarConfigDto)
		.handler(({ input, context }) =>
			catalogos.actualizarConfig(
				input.clave,
				input.valor,
				context.session?.user?.id ?? null,
			),
		),

	// --- Usuarios (RF-ADM-05) ---
	usuarios: adminProcedure.handler(() => usuarios.listUsuarios()),
	crearUsuario: adminProcedure
		.input(crearUsuarioDto)
		.handler(async ({ input, context }) => {
			try {
				return await usuarios.crearUsuario(
					input,
					fromNodeHeaders(context.headers),
					context.session?.user?.id ?? null,
				);
			} catch (e) {
				mapAdminError(e);
			}
		}),
	cambiarRol: adminProcedure
		.input(cambiarRolDto)
		.handler(async ({ input, context }) => {
			try {
				return await usuarios.cambiarRol(
					input.userId,
					input.role,
					context.session?.user?.id ?? null,
				);
			} catch (e) {
				mapAdminError(e);
			}
		}),
	resetPassword: adminProcedure
		.input(resetPasswordDto)
		.handler(async ({ input, context }) => {
			try {
				return await usuarios.resetPassword(
					input.userId,
					input.newPassword,
					fromNodeHeaders(context.headers),
					context.session?.user?.id ?? null,
				);
			} catch (e) {
				mapAdminError(e);
			}
		}),
	eliminarUsuario: adminProcedure
		.input(eliminarUsuarioDto)
		.handler(async ({ input, context }) => {
			try {
				return await usuarios.eliminarUsuario(
					input.userId,
					fromNodeHeaders(context.headers),
					context.session?.user?.id ?? null,
				);
			} catch (e) {
				mapAdminError(e);
			}
		}),
};
