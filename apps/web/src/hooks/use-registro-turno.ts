import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/utils/orpc";

export type Turno = "1" | "2" | "3";

// Encapsula la query `porFechaTurno` por fecha+turno. Solo consulta cuando hay
// ambos valores. Devuelve el resultado de useQuery sin alterarlo.
export function useRegistroTurno(fecha: string, turno: Turno) {
	return useQuery(
		orpc.registros.porFechaTurno.queryOptions({
			input: { fecha, turno },
			enabled: Boolean(fecha) && Boolean(turno),
		}),
	);
}
