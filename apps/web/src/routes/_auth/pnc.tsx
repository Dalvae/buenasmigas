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
import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { DatosTurno } from "@/components/datos-turno";
import { useFilas } from "@/hooks/use-filas";
import { type Turno, useRegistroTurno } from "@/hooks/use-registro-turno";
import { hoy } from "@/lib/fechas";
import { type ConfigMap, previewPncTotalKg } from "@/lib/formulas";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/pnc")({
	component: RouteComponent,
});

// Lista provisional de descripciones de PNC (RF-CAP-05). Se define luego con Calidad.
const PNC_DESCRIPCIONES = [
	"Producto Quemado",
	"Mal Etiquetado",
	"Producto deforme",
	"Otros",
];

type PncFila = {
	descripcion: string;
	unidades: string;
	kilos: string;
	bandejas: string;
	carros: string;
};

const pncVacio: PncFila = {
	descripcion: "",
	unidades: "",
	kilos: "",
	bandejas: "",
	carros: "",
};

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
				Ingreso Producto No Conforme
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
				<PncForm
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

type PncFormProps = {
	fecha: string;
	turno: Turno;
	operarioId: string;
	onOperarioChange: (id: string) => void;
	config: ConfigMap | undefined;
};

function PncForm({
	fecha,
	turno,
	operarioId,
	onOperarioChange,
	config,
}: PncFormProps) {
	const registro = useRegistroTurno(fecha, turno);
	const data = registro.data;

	const { filas, setFilas, agregar, quitar, actualizar } =
		useFilas<PncFila>(pncVacio);

	// Inicializa las filas (y el operario) una vez por montaje, cuando llega el
	// registro. El form se remonta al cambiar fecha/turno; refetch no pisa edición.
	const inicializado = useRef(false);
	// biome-ignore lint/correctness/useExhaustiveDependencies: init de montaje, una vez al llegar el registro.
	useEffect(() => {
		if (inicializado.current || !registro.isFetched) return;
		inicializado.current = true;
		if (data) {
			if (data.operarioId) onOperarioChange(String(data.operarioId));
			if (data.pnc.length) {
				setFilas(
					data.pnc.map((f) => ({
						id: crypto.randomUUID(),
						descripcion: f.descripcion ?? "",
						unidades: String(f.unidades),
						kilos: String(f.kilos),
						bandejas: String(f.bandejas),
						carros: String(f.carros),
					})),
				);
			}
		}
	}, [registro.isFetched]);

	const pncTotalKg = previewPncTotalKg(
		filas.map((f) => ({
			unidades: Number(f.unidades) || 0,
			kilos: Number(f.kilos) || 0,
			bandejas: Number(f.bandejas) || 0,
			carros: Number(f.carros) || 0,
		})),
		config,
	);

	const guardar = useMutation(
		orpc.registros.upsertPnc.mutationOptions({
			onSuccess: () => {
				toast.success("Producto no conforme guardado");
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
				toast.error(
					error.message || "No se pudo guardar el producto no conforme",
				);
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
			pnc: filas
				// Mismo criterio que el refine de pncItemDto: al menos un valor > 0 o descripción
				.filter(
					(f) =>
						f.descripcion.trim() !== "" ||
						[f.unidades, f.kilos, f.bandejas, f.carros].some(
							(v) => (Number(v) || 0) > 0,
						),
				)
				.map((f) => ({
					descripcion: f.descripcion.trim() || undefined,
					unidades: Number(f.unidades) || 0,
					kilos: Number(f.kilos) || 0,
					bandejas: Number(f.bandejas) || 0,
					carros: Number(f.carros) || 0,
				})),
		});
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle className="font-display">Producto No Conforme</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-3 sm:space-y-2">
						{filas.map((fila, i) => (
							<div
								key={fila.id}
								className="grid grid-cols-2 items-end gap-x-2 gap-y-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[1fr_5rem_5rem_5rem_5rem_auto] sm:gap-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"
							>
								<div className="col-span-2 space-y-1 sm:col-span-1">
									<Label className={i === 0 ? "text-xs" : "text-xs sm:sr-only"}>
										Descripción
									</Label>
									<Select
										value={fila.descripcion}
										onChange={(e) =>
											actualizar(fila.id, { descripcion: e.target.value })
										}
									>
										<option value="">Selecciona…</option>
										{(fila.descripcion &&
										!PNC_DESCRIPCIONES.includes(fila.descripcion)
											? [...PNC_DESCRIPCIONES, fila.descripcion]
											: PNC_DESCRIPCIONES
										).map((d) => (
											<option key={d} value={d}>
												{d}
											</option>
										))}
									</Select>
								</div>
								<div className="space-y-1">
									<Label className={i === 0 ? "text-xs" : "text-xs sm:sr-only"}>
										Unidades
									</Label>
									<Input
										type="number"
										min={0}
										step="any"
										className="w-full rounded-md"
										value={fila.unidades}
										onChange={(e) =>
											actualizar(fila.id, { unidades: e.target.value })
										}
									/>
								</div>
								<div className="space-y-1">
									<Label className={i === 0 ? "text-xs" : "text-xs sm:sr-only"}>
										Kilos
									</Label>
									<Input
										type="number"
										min={0}
										step="any"
										className="w-full rounded-md"
										value={fila.kilos}
										onChange={(e) =>
											actualizar(fila.id, { kilos: e.target.value })
										}
									/>
								</div>
								<div className="space-y-1">
									<Label className={i === 0 ? "text-xs" : "text-xs sm:sr-only"}>
										Bandejas
									</Label>
									<Input
										type="number"
										min={0}
										step="any"
										className="w-full rounded-md"
										value={fila.bandejas}
										onChange={(e) =>
											actualizar(fila.id, { bandejas: e.target.value })
										}
									/>
								</div>
								<div className="space-y-1">
									<Label className={i === 0 ? "text-xs" : "text-xs sm:sr-only"}>
										Carros
									</Label>
									<Input
										type="number"
										min={0}
										step="any"
										className="w-full rounded-md"
										value={fila.carros}
										onChange={(e) =>
											actualizar(fila.id, { carros: e.target.value })
										}
									/>
								</div>
								<Button
									type="button"
									variant="ghost"
									aria-label="Quitar"
									title="Quitar"
									onClick={() => quitar(fila.id)}
									className="col-span-2 h-9 w-full justify-center gap-2 text-destructive sm:col-span-1 sm:size-9 sm:w-9 sm:p-0"
								>
									<Trash2 className="size-4" />
									<span className="sm:hidden">Quitar</span>
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
						<div className="rounded-md bg-secondary px-4 py-2 text-secondary-foreground">
							<span className="font-bold font-display text-xl tabular-nums">
								Total kg: {pncTotalKg}
							</span>
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
