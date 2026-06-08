import { existsSync } from "node:fs";
import { join } from "node:path";

import { createContext } from "@buenasmigas/api/context";
import { appRouter } from "@buenasmigas/api/routers/index";
import { auth } from "@buenasmigas/auth";
import { env } from "@buenasmigas/env/server";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { OpenAPIHandler } from "@orpc/openapi/fastify";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fastify";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { fromNodeHeaders } from "better-auth/node";
import Fastify from "fastify";

import { generarExcel } from "./export-excel";

const baseCorsConfig = {
	origin: env.CORS_ORIGIN,
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
	exposedHeaders: ["set-auth-token"],
	credentials: true,
	maxAge: 86400,
};

const rpcHandler = new RPCHandler(appRouter, {
	interceptors: [
		onError((error) => {
			console.error(error);
		}),
	],
});

const apiHandler = new OpenAPIHandler(appRouter, {
	plugins: [
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
	],
	interceptors: [
		onError((error) => {
			console.error(error);
		}),
	],
});

const fastify = Fastify({
	logger: true,
});

// Seguridad (RNF-02). CSP off para no romper el SPA estático servido aquí.
fastify.register(fastifyHelmet, {
	contentSecurityPolicy: false,
	crossOriginEmbedderPolicy: false,
});
fastify.register(fastifyRateLimit, { max: 600, timeWindow: "1 minute" });
fastify.register(fastifyCors, baseCorsConfig);

fastify.register(async (rpcApp) => {
	// Fully utilize oRPC features by letting oRPC parse the request body.
	rpcApp.addContentTypeParser("*", (_, _payload, done) => {
		done(null, undefined);
	});

	rpcApp.all("/rpc/*", async (request, reply) => {
		const { matched } = await rpcHandler.handle(request, reply, {
			context: await createContext(request.headers),
			prefix: "/rpc",
		});

		if (!matched) {
			reply.status(404).send();
		}
	});

	rpcApp.all("/api-reference/*", async (request, reply) => {
		const { matched } = await apiHandler.handle(request, reply, {
			context: await createContext(request.headers),
			prefix: "/api-reference",
		});

		if (!matched) {
			reply.status(404).send();
		}
	});
});

fastify.route({
	method: ["GET", "POST"],
	url: "/api/auth/*",
	async handler(request, reply) {
		try {
			const url = new URL(request.url, `http://${request.headers.host}`);
			const headers = new Headers();
			Object.entries(request.headers).forEach(([key, value]) => {
				if (value) headers.append(key, value.toString());
			});
			const req = new Request(url.toString(), {
				method: request.method,
				headers,
				body: request.body ? JSON.stringify(request.body) : undefined,
			});
			const response = await auth.handler(req);
			reply.status(response.status);
			response.headers.forEach((value, key) => {
				reply.header(key, value);
			});
			reply.send(response.body ? await response.text() : null);
		} catch (error) {
			fastify.log.error({ err: error }, "Authentication Error:");
			reply.status(500).send({
				error: "Internal authentication error",
				code: "AUTH_FAILURE",
			});
		}
	},
});

// RF-EXP: exportar registros a Excel (requiere sesión)
fastify.get("/export/excel", async (request, reply) => {
	const session = await auth.api.getSession({
		headers: fromNodeHeaders(request.headers),
	});
	if (!session?.user) {
		return reply.code(401).send({ error: "No autorizado" });
	}
	const q = request.query as Record<string, string | undefined>;
	if (!q.desde || !q.hasta) {
		return reply.code(400).send({ error: "Faltan parámetros desde/hasta" });
	}
	const buf = await generarExcel({
		desde: q.desde,
		hasta: q.hasta,
		turno: q.turno as "1" | "2" | "3" | undefined,
		operarioId: q.operarioId ? Number(q.operarioId) : undefined,
	});
	reply.header(
		"Content-Type",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	);
	reply.header(
		"Content-Disposition",
		`attachment; filename="buenasmigas_${q.desde}_${q.hasta}.xlsx"`,
	);
	return reply.send(buf);
});

// Frontend estático servido por el mismo proceso (solo si existe el build).
const webDist = env.WEB_DIST ?? join(import.meta.dir, "../../web/dist");
if (existsSync(webDist)) {
	fastify.register(fastifyStatic, { root: webDist, wildcard: false });
	// SPA fallback: las rutas no-API devuelven index.html
	fastify.setNotFoundHandler((request, reply) => {
		const isApi =
			request.url.startsWith("/rpc") ||
			request.url.startsWith("/api") ||
			request.url.startsWith("/export");
		if (request.method === "GET" && !isApi) {
			return reply.sendFile("index.html");
		}
		reply.code(404).send({ error: "Not found" });
	});
} else {
	fastify.get(
		"/",
		async () =>
			"OK — API Buenas Migas (frontend estático no encontrado, modo dev)",
	);
}

fastify.listen({ port: env.PORT, host: "0.0.0.0" }, (err) => {
	if (err) {
		fastify.log.error(err);
		process.exit(1);
	}
	console.log(`Server running on port ${env.PORT}`);
});
