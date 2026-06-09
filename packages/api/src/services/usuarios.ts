// Servicio de usuarios: reglas de negocio de la gestión de cuentas (RF-ADM-05).
// El proveedor de identidad (Better Auth) y la tabla `user` quedan ocultos tras
// el repositorio; aquí vive la lógica (crear-y-elevar-rol, reset, etc.).

import type { CrearUsuarioDto, Rol } from "../dto/admin";
import * as usuarios from "../repositories/usuarios";

export function listUsuarios() {
	return usuarios.listUsuarios();
}

export async function crearUsuario(input: CrearUsuarioDto) {
	// Crea vía Better Auth (rol "operario" por defecto) y, si se pidió admin,
	// eleva el rol directo en la BD. Evita el typing de roles del plugin admin
	// (que asume "user"|"admin") y su validación en runtime.
	await usuarios.signUp({
		name: input.name,
		email: input.email,
		password: input.password,
	});
	if (input.role === "admin") {
		await usuarios.setRoleByEmail(input.email, "admin");
	}
	return { email: input.email, role: input.role };
}

export async function cambiarRol(userId: string, role: Rol) {
	await usuarios.setRole(userId, role);
	return { ok: true };
}

// El admin resetea la clave sin conocer la anterior (las claves son hash, no se
// pueden "desencriptar"). Le entrega la nueva al usuario.
export async function resetPassword(
	userId: string,
	newPassword: string,
	headers: Headers,
) {
	await usuarios.setPassword({ userId, newPassword }, headers);
	return { ok: true };
}

export async function eliminarUsuario(userId: string, headers: Headers) {
	await usuarios.remove(userId, headers);
	return { ok: true };
}
