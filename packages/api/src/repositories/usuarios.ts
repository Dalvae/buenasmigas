// Repositorio de usuarios: gateway hacia la persistencia (tabla `user`) y hacia
// el proveedor de identidad (Better Auth). El service no conoce ni Drizzle ni
// Better Auth; sólo llama a estas funciones.

import { auth } from "@buenasmigas/auth";
import { auditoria, db, user } from "@buenasmigas/db";
import { asc, eq } from "drizzle-orm";

import type { Rol } from "../dto/admin";

// Traza de una mutación sobre la entidad `usuario`. Better Auth gestiona la
// tabla `user` (crear/borrar/reset), así que la auditoría se escribe aparte,
// tras confirmarse la operación (no hay transacción común con Better Auth).
export async function auditUsuario(args: {
	entidadId: string | null;
	accion: "crear" | "editar" | "borrar";
	usuarioId: string | null;
	detalle?: string;
}) {
	await db.insert(auditoria).values({
		entidad: "usuario",
		entidadId: args.entidadId,
		accion: args.accion,
		usuarioId: args.usuarioId,
		detalle: args.detalle,
	});
}

export function listUsuarios() {
	return db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			banned: user.banned,
			createdAt: user.createdAt,
		})
		.from(user)
		.orderBy(asc(user.email));
}

// Alta server-side vía el plugin admin de Better Auth. Es el único camino de
// creación de cuentas (el signup público está cerrado, RF-AUTH-07): `createUser`
// ignora `disableSignUp` y crea + asigna rol en una sola operación atómica.
// Sin headers de sesión (p.ej. el seed) corre con privilegio interno; con los
// headers del admin, Better Auth revalida el permiso de creación server-side.
export async function createUser(
	input: { name: string; email: string; password: string; role: Rol },
	headers?: Headers,
) {
	const res = await auth.api.createUser({
		body: {
			email: input.email,
			password: input.password,
			name: input.name,
			// El plugin admin tipa `role` como "user"|"admin", pero en runtime
			// acepta cualquier string (lo guarda tal cual). Nuestro rol de dominio
			// es "operario"|"admin": el cast salva el typing sin alterar el valor.
			role: input.role as "admin",
		},
		...(headers ? { headers } : {}),
	});
	return res.user;
}

export async function setRole(
	userId: string,
	role: Rol,
	actorUserId: string | null,
) {
	await db.transaction(async (tx) => {
		await tx.update(user).set({ role }).where(eq(user.id, userId));
		await tx.insert(auditoria).values({
			entidad: "usuario",
			entidadId: userId,
			accion: "editar",
			usuarioId: actorUserId,
			detalle: `rol → ${role}`,
		});
	});
}

export async function setPassword(
	input: { userId: string; newPassword: string },
	headers: Headers,
) {
	await auth.api.setUserPassword({ body: input, headers });
}

export async function remove(userId: string, headers: Headers) {
	await auth.api.removeUser({ body: { userId }, headers });
}
