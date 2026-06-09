// Router de administración: capa de transporte (oRPC). DTO + tier admin +
// delega en los services. Convierte headers de Node a Web (adaptación de
// transporte) antes de pasarlos al service. No toca Drizzle ni Better Auth.

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
import { adminProcedure } from "../index";
import * as catalogos from "../services/catalogos";
import * as usuarios from "../services/usuarios";

export const adminRouter = {
	// --- Operarios (RF-ADM-01) ---
	operarios: adminProcedure.handler(() => catalogos.listOperarios()),
	crearOperario: adminProcedure
		.input(crearOperarioDto)
		.handler(({ input }) => catalogos.crearOperario(input.nombre)),
	actualizarOperario: adminProcedure
		.input(actualizarOperarioDto)
		.handler(({ input }) => {
			const { id, ...patch } = input;
			return catalogos.actualizarOperario(id, patch);
		}),

	// --- Tipos de envasado (RF-ADM-02) ---
	tipos: adminProcedure.handler(() => catalogos.listTipos()),
	crearTipo: adminProcedure
		.input(crearTipoDto)
		.handler(({ input }) => catalogos.crearTipo(input.nombre)),
	actualizarTipo: adminProcedure
		.input(actualizarTipoDto)
		.handler(({ input }) => {
			const { id, ...patch } = input;
			return catalogos.actualizarTipo(id, patch);
		}),

	// --- Parámetros de fórmula (RF-ADM-03 / RF-CALC-04) ---
	config: adminProcedure.handler(() => catalogos.listConfig()),
	actualizarConfig: adminProcedure
		.input(actualizarConfigDto)
		.handler(({ input }) =>
			catalogos.actualizarConfig(input.clave, input.valor),
		),

	// --- Usuarios (RF-ADM-05) ---
	usuarios: adminProcedure.handler(() => usuarios.listUsuarios()),
	crearUsuario: adminProcedure
		.input(crearUsuarioDto)
		.handler(({ input }) => usuarios.crearUsuario(input)),
	cambiarRol: adminProcedure
		.input(cambiarRolDto)
		.handler(({ input }) => usuarios.cambiarRol(input.userId, input.role)),
	resetPassword: adminProcedure
		.input(resetPasswordDto)
		.handler(({ input, context }) =>
			usuarios.resetPassword(
				input.userId,
				input.newPassword,
				fromNodeHeaders(context.headers),
			),
		),
	eliminarUsuario: adminProcedure
		.input(eliminarUsuarioDto)
		.handler(({ input, context }) =>
			usuarios.eliminarUsuario(input.userId, fromNodeHeaders(context.headers)),
		),
};
