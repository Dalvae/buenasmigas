// Servicio de usuarios: reglas de negocio de la gestión de cuentas (RF-ADM-05).
// El proveedor de identidad (Better Auth) y la tabla `user` quedan ocultos tras
// el repositorio; aquí vive la lógica (crear-y-elevar-rol, reset, etc.).

import type { CrearUsuarioDto, Rol } from "../dto/admin";
import * as usuarios from "../repositories/usuarios";

export function listUsuarios() {
	return usuarios.listUsuarios();
}

export async function crearUsuario(
	input: CrearUsuarioDto,
	headers: Headers,
	actorUserId: string | null,
) {
	// Alta atómica vía el plugin admin (crear + asignar rol en un paso). Esto
	// elimina de raíz el problema del flujo de dos pasos anterior (signUp + elevar
	// rol), que podía dejar un usuario operario + error si el segundo paso fallaba:
	// ahora no hay segundo paso que compensar. `headers` son los de la sesión admin
	// que llama, para que Better Auth revalide el permiso de creación server-side.
	const u = await usuarios.createUser(
		{
			name: input.name,
			email: input.email,
			password: input.password,
			role: input.role,
		},
		headers,
	);
	// Auditoría tras confirmarse el alta (fuera de la "transacción" de Better Auth):
	// si esto fallara el usuario ya existe, sólo se pierde la traza — preferible a
	// revertir un alta válida.
	await usuarios.auditUsuario({
		entidadId: u.id,
		accion: "crear",
		usuarioId: actorUserId,
		detalle: `${input.email} (${input.role})`,
	});
	return { id: u.id, email: input.email, role: input.role };
}

export async function cambiarRol(
	userId: string,
	role: Rol,
	actorUserId: string | null,
) {
	await usuarios.setRole(userId, role, actorUserId);
	return { ok: true };
}

// El admin resetea la clave sin conocer la anterior (las claves son hash, no se
// pueden "desencriptar"). Le entrega la nueva al usuario.
export async function resetPassword(
	userId: string,
	newPassword: string,
	headers: Headers,
	actorUserId: string | null,
) {
	await usuarios.setPassword({ userId, newPassword }, headers);
	await usuarios.auditUsuario({
		entidadId: userId,
		accion: "editar",
		usuarioId: actorUserId,
		detalle: "reset de contraseña",
	});
	return { ok: true };
}

export async function eliminarUsuario(
	userId: string,
	headers: Headers,
	actorUserId: string | null,
) {
	// Auditoría ANTES del borrado: tras `removeUser` el usuario ya no existe, pero
	// la traza (entidadId con el id borrado) debe sobrevivir.
	await usuarios.auditUsuario({
		entidadId: userId,
		accion: "borrar",
		usuarioId: actorUserId,
	});
	await usuarios.remove(userId, headers);
	return { ok: true };
}
