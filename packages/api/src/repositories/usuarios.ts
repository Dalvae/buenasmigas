// Repositorio de usuarios: gateway hacia la persistencia (tabla `user`) y hacia
// el proveedor de identidad (Better Auth). El service no conoce ni Drizzle ni
// Better Auth; sólo llama a estas funciones.

import { auth } from "@buenasmigas/auth";
import { db, user } from "@buenasmigas/db";
import { asc, eq } from "drizzle-orm";

import type { Rol } from "../dto/admin";

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

export async function signUp(input: {
	name: string;
	email: string;
	password: string;
}) {
	await auth.api.signUpEmail({ body: input });
}

export async function setRole(userId: string, role: Rol) {
	await db.update(user).set({ role }).where(eq(user.id, userId));
}

export async function setRoleByEmail(email: string, role: Rol) {
	await db.update(user).set({ role }).where(eq(user.email, email));
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
