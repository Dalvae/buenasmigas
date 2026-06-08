import { auth } from "@buenasmigas/auth";
import {
	configFormula,
	db,
	operario,
	tipoEnvasado,
	user,
} from "@buenasmigas/db";
import { fromNodeHeaders } from "better-auth/node";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure } from "../index";

const rolSchema = z.enum(["operario", "admin"]);

export const adminRouter = {
	// --- Operarios (RF-ADM-01) ---
	operarios: adminProcedure.handler(() =>
		db.select().from(operario).orderBy(asc(operario.nombre)),
	),
	crearOperario: adminProcedure
		.input(z.object({ nombre: z.string().min(1) }))
		.handler(async ({ input }) => {
			const [row] = await db
				.insert(operario)
				.values({ nombre: input.nombre })
				.returning();
			return row;
		}),
	actualizarOperario: adminProcedure
		.input(
			z.object({
				id: z.number().int(),
				nombre: z.string().min(1).optional(),
				activo: z.boolean().optional(),
			}),
		)
		.handler(async ({ input }) => {
			const { id, ...rest } = input;
			const [row] = await db
				.update(operario)
				.set(rest)
				.where(eq(operario.id, id))
				.returning();
			return row;
		}),

	// --- Tipos de envasado (RF-ADM-02) ---
	tipos: adminProcedure.handler(() =>
		db.select().from(tipoEnvasado).orderBy(asc(tipoEnvasado.nombre)),
	),
	crearTipo: adminProcedure
		.input(z.object({ nombre: z.string().min(1) }))
		.handler(async ({ input }) => {
			const [row] = await db
				.insert(tipoEnvasado)
				.values({ nombre: input.nombre })
				.returning();
			return row;
		}),
	actualizarTipo: adminProcedure
		.input(
			z.object({
				id: z.number().int(),
				nombre: z.string().min(1).optional(),
				activo: z.boolean().optional(),
			}),
		)
		.handler(async ({ input }) => {
			const { id, ...rest } = input;
			const [row] = await db
				.update(tipoEnvasado)
				.set(rest)
				.where(eq(tipoEnvasado.id, id))
				.returning();
			return row;
		}),

	// --- Parámetros de fórmula (RF-ADM-03 / RF-CALC-04) ---
	config: adminProcedure.handler(() =>
		db.select().from(configFormula).orderBy(asc(configFormula.clave)),
	),
	actualizarConfig: adminProcedure
		.input(z.object({ clave: z.string(), valor: z.number() }))
		.handler(async ({ input }) => {
			const [row] = await db
				.update(configFormula)
				.set({ valor: input.valor })
				.where(eq(configFormula.clave, input.clave))
				.returning();
			return row;
		}),

	// --- Usuarios (RF-ADM-05) ---
	usuarios: adminProcedure.handler(() =>
		db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				banned: user.banned,
				createdAt: user.createdAt,
			})
			.from(user)
			.orderBy(asc(user.email)),
	),
	crearUsuario: adminProcedure
		.input(
			z.object({
				name: z.string().min(1),
				email: z.email(),
				password: z.string().min(8),
				role: rolSchema.default("operario"),
			}),
		)
		.handler(async ({ input }) => {
			// Crea el usuario vía Better Auth (rol por defecto "operario") y, si se
			// pidió admin, eleva el rol directo en la BD. Evita el typing de roles del
			// plugin admin (que asume "user"|"admin") y su validación en runtime.
			await auth.api.signUpEmail({
				body: {
					name: input.name,
					email: input.email,
					password: input.password,
				},
			});
			if (input.role === "admin") {
				await db
					.update(user)
					.set({ role: "admin" })
					.where(eq(user.email, input.email));
			}
			return { email: input.email, role: input.role };
		}),
	cambiarRol: adminProcedure
		.input(z.object({ userId: z.string(), role: rolSchema }))
		.handler(async ({ input }) => {
			await db
				.update(user)
				.set({ role: input.role })
				.where(eq(user.id, input.userId));
			return { ok: true };
		}),
	// El admin resetea la clave sin conocer la anterior (las claves son hash,
	// no se pueden "desencriptar"). Le entrega la nueva al usuario.
	resetPassword: adminProcedure
		.input(z.object({ userId: z.string(), newPassword: z.string().min(8) }))
		.handler(async ({ input, context }) => {
			await auth.api.setUserPassword({
				body: { userId: input.userId, newPassword: input.newPassword },
				headers: fromNodeHeaders(context.headers),
			});
			return { ok: true };
		}),
	eliminarUsuario: adminProcedure
		.input(z.object({ userId: z.string() }))
		.handler(async ({ input, context }) => {
			await auth.api.removeUser({
				body: { userId: input.userId },
				headers: fromNodeHeaders(context.headers),
			});
			return { ok: true };
		}),
};
