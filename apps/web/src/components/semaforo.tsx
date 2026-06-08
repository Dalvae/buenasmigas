import { cn } from "@buenasmigas/ui/lib/utils";

// Semáforo de cumplimiento (reutilizable en elaboración y envasado).
// pct >= 95 → verde, pct >= 80 → amarillo, pct < 80 → rojo.
// null / sin dato → todas apagadas (gris).
type Estado = "verde" | "amarillo" | "rojo" | null;

function estadoDePct(pct: number | null): Estado {
	if (pct === null) return null;
	if (pct >= 95) return "verde";
	if (pct >= 80) return "amarillo";
	return "rojo";
}

const LUCES = [
	{ color: "rojo", on: "bg-red-500", off: "bg-red-500/15" },
	{ color: "amarillo", on: "bg-yellow-400", off: "bg-yellow-400/15" },
	{ color: "verde", on: "bg-green-500", off: "bg-green-500/15" },
] as const;

export function Semaforo({ pct }: { pct: number | null }) {
	const estado = estadoDePct(pct);

	return (
		<div className="inline-flex flex-col items-center gap-1.5 rounded-md border bg-card p-2">
			{LUCES.map((luz) => (
				<span
					key={luz.color}
					className={cn(
						"h-5 w-5 rounded-full transition-colors",
						estado === luz.color ? luz.on : luz.off,
					)}
				/>
			))}
		</div>
	);
}
