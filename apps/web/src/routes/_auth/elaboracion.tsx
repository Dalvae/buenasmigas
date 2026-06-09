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
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { DatosTurno } from "@/components/datos-turno";
import { Semaforo } from "@/components/semaforo";
import { type Turno, useRegistroTurno } from "@/hooks/use-registro-turno";
import { hoy } from "@/lib/fechas";
import { type ConfigMap, previewElaboracionPct } from "@/lib/formulas";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/elaboracion")({
	component: RouteComponent,
});

function RouteComponent() {
	const opciones = useQuery(orpc.registros.opciones.queryOptions());
	const operarios = opciones.data?.operarios ?? [];
	const config = opciones.data?.config as ConfigMap | undefined;

	const [operarioId, setOperarioId] = useState("");
	const [turno, setTurno] = useState<Turno>("1");
	const [fecha, setFecha] = useState(hoy());

	return (
		<div className="mx-auto max-w-3xl px-4 py-6">
			<h1 className="mb-4 font-bold font-display text-2xl text-primary tracking-tight">
				Ingreso Producción Elaboración
			</h1>

			<div className="space-y-4">
				<DatosTurno
					operarios={operarios}
					operarioId={operarioId}
					onOperarioChange={setOperarioId}
					turno={turno}
					onTurnoChange={setTurno}
					fecha={fecha}
					onFechaChange={setFecha}
				/>
				{/* key remonta el formulario al cambiar fecha/turno: estado limpio
				    inicializado desde el registro, sin pisar la edición en refetch. */}
				<ElaboracionForm
					key={`${fecha}-${turno}`}
					fecha={fecha}
					turno={turno}
					operarioId={operarioId}
					onOperarioChange={setOperarioId}
					config={config}
				/>
			</div>
		</div>
	);
}

type ElaboracionFormProps = {
	fecha: string;
	turno: Turno;
	operarioId: string;
	onOperarioChange: (id: string) => void;
	config: ConfigMap | undefined;
};

function ElaboracionForm({
	fecha,
	turno,
	operarioId,
	onOperarioChange,
	config,
}: ElaboracionFormProps) {
	const registro = useRegistroTurno(fecha, turno);
	const data = registro.data;

	// Estado inicializado una sola vez (al montar) desde el registro cargado.
	const [batchProg, setBatchProg] = useState(() =>
		String(data?.batchProg ?? ""),
	);
	const [batchReal, setBatchReal] = useState(() =>
		String(data?.batchReal ?? ""),
	);

	// El registro puede llegar después del montaje; en cuanto está, inicializa los
	// inputs y prellena el operario. Se ejecuta una vez por montaje (este form se
	// remonta al cambiar fecha/turno), así un refetch posterior no pisa lo escrito.
	const inicializado = useRef(false);
	// biome-ignore lint/correctness/useExhaustiveDependencies: init de montaje, una vez al llegar el registro.
	useEffect(() => {
		if (inicializado.current || !registro.isFetched) return;
		inicializado.current = true;
		if (data) {
			setBatchProg(String(data.batchProg ?? ""));
			setBatchReal(String(data.batchReal ?? ""));
			if (data.operarioId) onOperarioChange(String(data.operarioId));
		}
	}, [registro.isFetched]);

	const batchProgN = Number(batchProg) || 0;
	const batchRealN = Number(batchReal) || 0;
	const elaboracionPct = previewElaboracionPct(batchProgN, batchRealN, config);

	const guardar = useMutation(
		orpc.registros.upsertElaboracion.mutationOptions({
			onSuccess: () => {
				toast.success("Elaboración guardada");
				queryClient.invalidateQueries({
					queryKey: orpc.registros.porFechaTurno.key({
						input: { fecha, turno },
					}),
				});
				queryClient.invalidateQueries({
					queryKey: orpc.registros.listar.key(),
				});
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
		<form onSubmit={handleSubmit} className="space-y-4">
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
	);
}
