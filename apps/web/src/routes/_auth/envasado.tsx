import { Button } from "@buenasmigas/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@buenasmigas/ui/components/card";
import { Input } from "@buenasmigas/ui/components/input";
import { Label } from "@buenasmigas/ui/components/label";
import { Select } from "@buenasmigas/ui/components/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { DatosTurno } from "@/components/datos-turno";
import { Semaforo } from "@/components/semaforo";
import { useFilas } from "@/hooks/use-filas";
import { type Turno, useRegistroTurno } from "@/hooks/use-registro-turno";
import { hoy } from "@/lib/fechas";
import { type ConfigMap, previewEnvasadoPct } from "@/lib/formulas";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/envasado")({
	component: RouteComponent,
});

type EnvasadoFila = { tipoEnvasadoId: string; pedido: string; real: string };

const envasadoVacio: EnvasadoFila = {
	tipoEnvasadoId: "",
	pedido: "",
	real: "",
};

function RouteComponent() {
	const opciones = useQuery(orpc.registros.opciones.queryOptions());
	const operarios = opciones.data?.operarios ?? [];
	const tipos = opciones.data?.tipos ?? [];
	const config = opciones.data?.config as ConfigMap | undefined;

	const [operarioId, setOperarioId] = useState("");
	const [turno, setTurno] = useState<Turno>("1");
	const [fecha, setFecha] = useState(hoy());

	return (
		<div className="mx-auto max-w-3xl px-4 py-6">
			<h1 className="mb-4 font-bold font-display text-2xl text-primary tracking-tight">
				Ingreso Producción Envasado
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
				<EnvasadoForm
					key={`${fecha}-${turno}`}
					fecha={fecha}
					turno={turno}
					operarioId={operarioId}
					onOperarioChange={setOperarioId}
					tipos={tipos}
					config={config}
				/>
			</div>
		</div>
	);
}

type EnvasadoFormProps = {
	fecha: string;
	turno: Turno;
	operarioId: string;
	onOperarioChange: (id: string) => void;
	tipos: { id: number; nombre: string }[];
	config: ConfigMap | undefined;
};

function EnvasadoForm({
	fecha,
	turno,
	operarioId,
	onOperarioChange,
	tipos,
	config,
}: EnvasadoFormProps) {
	const registro = useRegistroTurno(fecha, turno);
	const data = registro.data;

	const { filas, setFilas, agregar, quitar, actualizar } =
		useFilas<EnvasadoFila>(envasadoVacio);

	// Inicializa las filas (y el operario) una vez por montaje, cuando llega el
	// registro. El form se remonta al cambiar fecha/turno; refetch no pisa edición.
	const inicializado = useRef(false);
	// biome-ignore lint/correctness/useExhaustiveDependencies: init de montaje, una vez al llegar el registro.
	useEffect(() => {
		if (inicializado.current || !registro.isFetched) return;
		inicializado.current = true;
		if (data) {
			if (data.operarioId) onOperarioChange(String(data.operarioId));
			if (data.envasado.length) {
				setFilas(
					data.envasado.map((f) => ({
						id: crypto.randomUUID(),
						tipoEnvasadoId: String(f.tipoEnvasadoId),
						pedido: String(f.pedido),
						real: String(f.real),
					})),
				);
			}
		}
	}, [registro.isFetched]);

	const sumPedido = filas.reduce((a, f) => a + (Number(f.pedido) || 0), 0);
	const sumReal = filas.reduce((a, f) => a + (Number(f.real) || 0), 0);
	const envasadoPct = previewEnvasadoPct(sumPedido, sumReal, config);

	const guardar = useMutation(
		orpc.registros.upsertEnvasado.mutationOptions({
			onSuccess: () => {
				toast.success("Envasado guardado");
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
				toast.error(error.message || "No se pudo guardar el envasado");
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
			envasado: filas
				.filter((f) => f.tipoEnvasadoId)
				.map((f) => ({
					tipoEnvasadoId: Number(f.tipoEnvasadoId),
					pedido: Number(f.pedido) || 0,
					real: Number(f.real) || 0,
				})),
		});
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle className="font-display">Envasado</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-3 sm:space-y-2">
						{filas.map((fila, i) => (
							<div
								key={fila.id}
								className="grid grid-cols-2 items-end gap-x-2 gap-y-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[1fr_6rem_6rem_auto] sm:gap-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"
							>
								<div className="col-span-2 space-y-1 sm:col-span-1">
									<Label className={i === 0 ? "text-xs" : "text-xs sm:sr-only"}>
										Tipo
									</Label>
									<Select
										value={fila.tipoEnvasadoId}
										onChange={(e) =>
											actualizar(fila.id, { tipoEnvasadoId: e.target.value })
										}
									>
										<option value="">Selecciona…</option>
										{tipos.map((t) => (
											<option key={t.id} value={t.id}>
												{t.nombre}
											</option>
										))}
									</Select>
								</div>
								<div className="space-y-1">
									<Label className={i === 0 ? "text-xs" : "text-xs sm:sr-only"}>
										Pedido
									</Label>
									<Input
										type="number"
										min={0}
										step={1}
										className="w-full rounded-md"
										value={fila.pedido}
										onChange={(e) =>
											actualizar(fila.id, { pedido: e.target.value })
										}
									/>
								</div>
								<div className="space-y-1">
									<Label className={i === 0 ? "text-xs" : "text-xs sm:sr-only"}>
										Real
									</Label>
									<Input
										type="number"
										min={0}
										step={1}
										className="w-full rounded-md"
										value={fila.real}
										onChange={(e) =>
											actualizar(fila.id, { real: e.target.value })
										}
									/>
								</div>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => quitar(fila.id)}
									className="col-span-2 w-full sm:col-span-1 sm:w-auto"
								>
									Quitar
								</Button>
							</div>
						))}
					</div>
					<div className="flex items-center justify-between">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="rounded-md"
							onClick={agregar}
						>
							Agregar
						</Button>
						<div className="flex items-center gap-4">
							<span className="font-display font-semibold text-lg tabular-nums">
								Total %: {envasadoPct}%
							</span>
							<Semaforo pct={sumPedido > 0 ? envasadoPct : null} />
						</div>
					</div>
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
