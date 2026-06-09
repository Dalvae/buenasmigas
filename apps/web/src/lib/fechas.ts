// Helpers de fecha en formato ISO local (en-CA → YYYY-MM-DD), sin desfase UTC.

export function hoy(): string {
	return new Date().toLocaleDateString("en-CA");
}

export function primerDiaMes(): string {
	const d = new Date();
	return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString("en-CA");
}

export function ultimoDiaMes(): string {
	const d = new Date();
	return new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString(
		"en-CA",
	);
}
