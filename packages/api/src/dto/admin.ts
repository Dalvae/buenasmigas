// DTOs del dominio de administración (catálogos + usuarios). Contrato de
// comunicación oRPC, escrito a mano y desacoplado del schema de la DB.

import { z } from "zod";

export const rolDto = z.enum(["operario", "admin"]);

// --- Operarios ---
export const crearOperarioDto = z.object({ nombre: z.string().min(1) });
export const actualizarOperarioDto = z.object({
	id: z.number().int(),
	nombre: z.string().min(1).optional(),
	activo: z.boolean().optional(),
});

// --- Tipos de envasado ---
export const crearTipoDto = z.object({ nombre: z.string().min(1) });
export const actualizarTipoDto = z.object({
	id: z.number().int(),
	nombre: z.string().min(1).optional(),
	activo: z.boolean().optional(),
});

// --- Parámetros de fórmula ---
export const actualizarConfigDto = z.object({
	clave: z.string(),
	valor: z.number(),
});

// --- Usuarios ---
export const crearUsuarioDto = z.object({
	name: z.string().min(1),
	email: z.email(),
	password: z.string().min(8),
	role: rolDto.default("operario"),
});
export const cambiarRolDto = z.object({ userId: z.string(), role: rolDto });
export const resetPasswordDto = z.object({
	userId: z.string(),
	newPassword: z.string().min(8),
});
export const eliminarUsuarioDto = z.object({ userId: z.string() });

export type Rol = z.infer<typeof rolDto>;
export type CrearUsuarioDto = z.infer<typeof crearUsuarioDto>;
