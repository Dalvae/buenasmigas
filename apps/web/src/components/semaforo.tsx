import { cn } from "@buenasmigas/ui/lib/utils";

// Semáforo de cumplimiento (reutilizable en elaboración y envasado).
// pct >= 95 → verde, pct >= 80 → amarillo, pct < 80 → rojo.
// null / sin dato → todas apagadas (gris).
export type Estado = "verde" | "amarillo" | "rojo" | null;

export function estadoDePct(pct: number | null): Estado {
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

const DOT_COLOR: Record<"verde" | "amarillo" | "rojo", string> = {
	verde: "bg-green-500",
	amarillo: "bg-yellow-400",
	rojo: "bg-red-500",
};

// Círculo compacto del semáforo, para listados/tablas (RF-CONS).
// estado null → gris (sin dato o indicador aún no definido).
export function SemaforoDot({ estado }: { estado: Estado }) {
	return (
		<span
			className={cn(
				"inline-block size-2.5 shrink-0 rounded-full",
				estado ? DOT_COLOR[estado] : "bg-muted-foreground/25",
			)}
		/>
	);
}

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
