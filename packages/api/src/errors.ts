// Errores de dominio, neutrales a la capa de transporte. Los lanzan los
// repositorios/servicios; el router los traduce a ORPCError (HTTP/oRPC).

export class ConflictError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ConflictError";
	}
}

export class NotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "NotFoundError";
	}
}
