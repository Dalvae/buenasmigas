import { useState } from "react";

// Fila editable con un id estable solo de cliente (para usar como `key` de React
// y filtrar al quitar). El id NO viaja al DTO/payload de la mutación.
export type Fila<T> = T & { id: string };

function nuevoId(): string {
	return crypto.randomUUID();
}

// Maneja una lista de filas editables (agregar / quitar / actualizar) con ids
// estables. `vacio` es la plantilla de una fila nueva; arranca con una sola fila
// vacía. Para precargar filas existentes, usa `setFilas` (p.ej. al montar).
export function useFilas<T>(vacio: T) {
	const [filas, setFilas] = useState<Fila<T>[]>(() => [
		{ ...vacio, id: nuevoId() },
	]);

	function agregar() {
		setFilas((rows) => [...rows, { ...vacio, id: nuevoId() }]);
	}

	function quitar(id: string) {
		setFilas((rows) => rows.filter((r) => r.id !== id));
	}

	function actualizar(id: string, patch: Partial<T>) {
		setFilas((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
	}

	return { filas, setFilas, agregar, quitar, actualizar };
}
