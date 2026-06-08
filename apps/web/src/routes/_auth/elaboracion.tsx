import { Button } from "@buenasmigas/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@buenasmigas/ui/components/card";
import { Input } from "@buenasmigas/ui/components/input";
import { Label } from "@buenasmigas/ui/components/label";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Semaforo } from "@/components/semaforo";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/elaboracion")({
	component: RouteComponent,
});

const selectClass =
	"h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

function hoy(): string {
	return new Date().toLocaleDateString("en-CA");
}

function round(n: number, decimals: number): number {
	const f = 10 ** decimals;
	return Math.round((n + Number.EPSILON) * f) / f;
}

function RouteComponent() {
	const opciones = useQuery(orpc.registros.opciones.queryOptions());
	const operarios = opciones.data?.operarios ?? [];

	const [operarioId, setOperarioId] = useState("");
	const [turno, setTurno] = useState<"1" | "2" | "3">("1");
	const [fecha, setFecha] = useState(hoy());
	const [batchProg, setBatchProg] = useState("");
	const [batchReal, setBatchReal] = useState("");

	const registro = useQuery(
		orpc.registros.porFechaTurno.queryOptions({
			input: { fecha, turno },
			enabled: Boolean(fecha) && Boolean(turno),
		}),
	);

	// Prellena batch programado / producido al cambiar fecha+turno.
	useEffect(() => {
		const data = registro.data;
		if (data) {
			setBatchProg(String(data.batchProg ?? ""));
			setBatchReal(String(data.batchReal ?? ""));
			if (data.operarioId) setOperarioId(String(data.operarioId));
		} else if (registro.isFetched) {
			setBatchProg("");
			setBatchReal("");
		}
	}, [registro.data, registro.isFetched]);

	const batchProgN = Number(batchProg) || 0;
	const batchRealN = Number(batchReal) || 0;
	const elaboracionPct =
		batchProgN > 0 ? round((batchRealN / batchProgN) * 100, 1) : 0;

	const guardar = useMutation(
		orpc.registros.upsertElaboracion.mutationOptions({
			onSuccess: () => {
				toast.success("Elaboración guardada");
				queryClient.invalidateQueries();
			},
			onError: (error) => {
				toast.error(error.message || "No se pudo guardar la elaboración");
			},
		}),
	);

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!operarioId) {
			toast.error("Selecciona un operario");
			return;
		}
		guardar.mutate({
			fecha,
			turno,
			operarioId: Number(operarioId),
			batchReal: batchRealN,
			batchProg: batchProgN,
		});
	}

	return (
		<div className="mx-auto max-w-3xl px-4 py-6">
			<h1 className="mb-4 font-bold font-display text-2xl text-primary tracking-tight">
				Ingreso Producción Elaboración
			</h1>

			<form onSubmit={handleSubmit} className="space-y-4">
				<Card>
					<CardHeader>
						<CardTitle className="font-display">Datos del turno</CardTitle>
					</CardHeader>
					<CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<div className="space-y-2">
							<Label htmlFor="operario">Nombre</Label>
							<select
								id="operario"
								className={selectClass}
								value={operarioId}
								onChange={(e) => setOperarioId(e.target.value)}
							>
								<option value="">Selecciona…</option>
								{operarios.map((o) => (
									<option key={o.id} value={o.id}>
										{o.nombre}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="turno">Turno</Label>
							<select
								id="turno"
								className={selectClass}
								value={turno}
								onChange={(e) => setTurno(e.target.value as "1" | "2" | "3")}
							>
								<option value="1">Turno 1</option>
								<option value="2">Turno 2</option>
								<option value="3">Turno 3</option>
							</select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="fecha">Fecha</Label>
							<Input
								id="fecha"
								type="date"
								className="rounded-md"
								value={fecha}
								onChange={(e) => setFecha(e.target.value)}
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="font-display">Elaboración</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-6 sm:flex-row sm:items-end">
						<div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
							<div className="space-y-2">
								<Label htmlFor="batchProg"># Batch Programado</Label>
								<Input
									id="batchProg"
									type="number"
									min={0}
									step={1}
									className="rounded-md"
									value={batchProg}
									onChange={(e) => setBatchProg(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="batchReal"># Batch Producido</Label>
								<Input
									id="batchReal"
									type="number"
									min={0}
									step={1}
									className="rounded-md"
									value={batchReal}
									onChange={(e) => setBatchReal(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label>% de cumplimiento</Label>
								<div className="flex h-9 items-center font-display font-semibold text-lg tabular-nums">
									{elaboracionPct}%
								</div>
							</div>
						</div>
						<Semaforo pct={batchProgN > 0 ? elaboracionPct : null} />
					</CardContent>
				</Card>

				<div className="flex justify-end">
					<Button
						type="submit"
						className="rounded-md"
						disabled={guardar.isPending}
					>
						{guardar.isPending ? "Guardando…" : "Guardar"}
					</Button>
				</div>
			</form>
		</div>
	);
}
