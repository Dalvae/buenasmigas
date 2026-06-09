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
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/pnc")({
	component: RouteComponent,
});

const selectClass =
	"h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

// Lista provisional de descripciones de PNC (RF-CAP-05). Se define luego con Calidad.
const PNC_DESCRIPCIONES = [
	"Producto Quemado",
	"Mal Etiquetado",
	"Producto deforme",
	"Otros",
];

function hoy(): string {
	return new Date().toLocaleDateString("en-CA");
}

function round(n: number, decimals: number): number {
	const f = 10 ** decimals;
	return Math.round((n + Number.EPSILON) * f) / f;
}

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
	const config = opciones.data?.config ?? {};

	const [operarioId, setOperarioId] = useState("");
	const [turno, setTurno] = useState<"1" | "2" | "3">("1");
	const [fecha, setFecha] = useState(hoy());
	const [filas, setFilas] = useState<PncFila[]>([{ ...pncVacio }]);

	const registro = useQuery(
		orpc.registros.porFechaTurno.queryOptions({
			input: { fecha, turno },
			enabled: Boolean(fecha) && Boolean(turno),
		}),
	);

	// Prellena las filas de PNC al cambiar fecha+turno.
	useEffect(() => {
		const data = registro.data;
		if (data) {
			if (data.operarioId) setOperarioId(String(data.operarioId));
			setFilas(
				data.pnc.length
					? data.pnc.map((f) => ({
							descripcion: f.descripcion ?? "",
							unidades: String(f.unidades),
							kilos: String(f.kilos),
							bandejas: String(f.bandejas),
							carros: String(f.carros),
						}))
					: [{ ...pncVacio }],
			);
		} else if (registro.isFetched) {
			setFilas([{ ...pncVacio }]);
		}
	}, [registro.data, registro.isFetched]);

	const pesoUnit = config.pnc_peso_unitario_kg ?? 0;
	const pesoBandeja = config.pnc_peso_bandeja_kg ?? 0;
	const pesoCarro = config.pnc_peso_carro_kg ?? 0;
	const pncTotalKg = round(
		filas.reduce(
			(a, f) =>
				a +
				(Number(f.kilos) || 0) +
				(Number(f.unidades) || 0) * pesoUnit +
				(Number(f.bandejas) || 0) * pesoBandeja +
				(Number(f.carros) || 0) * pesoCarro,
			0,
		),
		2,
	);

	function updateFila(i: number, patch: Partial<PncFila>) {
		setFilas((rows) =>
			rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
		);
	}

	const guardar = useMutation(
		orpc.registros.upsertPnc.mutationOptions({
			onSuccess: () => {
				toast.success("Producto no conforme guardado");
				queryClient.invalidateQueries();
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
				.filter(
					(f) =>
						f.descripcion.trim() !== "" ||
						f.unidades !== "" ||
						f.kilos !== "" ||
						f.bandejas !== "" ||
						f.carros !== "",
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
		<div className="mx-auto max-w-3xl px-4 py-6">
			<h1 className="mb-4 font-bold font-display text-2xl text-primary tracking-tight">
				Ingreso Producto No Conforme
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
						<CardTitle className="font-display">Producto No Conforme</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-3 sm:space-y-2">
							{filas.map((fila, i) => (
								<div
									key={i}
									className="grid grid-cols-2 items-end gap-x-2 gap-y-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[1fr_5rem_5rem_5rem_5rem_auto] sm:gap-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"
								>
									<div className="col-span-2 space-y-1 sm:col-span-1">
										<Label
											className={i === 0 ? "text-xs" : "text-xs sm:sr-only"}
										>
											Descripción
										</Label>
										<select
											className={selectClass}
											value={fila.descripcion}
											onChange={(e) =>
												updateFila(i, { descripcion: e.target.value })
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
										</select>
									</div>
									<div className="space-y-1">
										<Label
											className={i === 0 ? "text-xs" : "text-xs sm:sr-only"}
										>
											Unidades
										</Label>
										<Input
											type="number"
											min={0}
											step="any"
											className="w-full rounded-md"
											value={fila.unidades}
											onChange={(e) =>
												updateFila(i, { unidades: e.target.value })
											}
										/>
									</div>
									<div className="space-y-1">
										<Label
											className={i === 0 ? "text-xs" : "text-xs sm:sr-only"}
										>
											Kilos
										</Label>
										<Input
											type="number"
											min={0}
											step="any"
											className="w-full rounded-md"
											value={fila.kilos}
											onChange={(e) => updateFila(i, { kilos: e.target.value })}
										/>
									</div>
									<div className="space-y-1">
										<Label
											className={i === 0 ? "text-xs" : "text-xs sm:sr-only"}
										>
											Bandejas
										</Label>
										<Input
											type="number"
											min={0}
											step="any"
											className="w-full rounded-md"
											value={fila.bandejas}
											onChange={(e) =>
												updateFila(i, { bandejas: e.target.value })
											}
										/>
									</div>
									<div className="space-y-1">
										<Label
											className={i === 0 ? "text-xs" : "text-xs sm:sr-only"}
										>
											Carros
										</Label>
										<Input
											type="number"
											min={0}
											step="any"
											className="w-full rounded-md"
											value={fila.carros}
											onChange={(e) =>
												updateFila(i, { carros: e.target.value })
											}
										/>
									</div>
									<Button
										type="button"
										variant="ghost"
										aria-label="Quitar"
										title="Quitar"
										onClick={() =>
											setFilas((rows) => rows.filter((_, idx) => idx !== i))
										}
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
								onClick={() => setFilas((rows) => [...rows, { ...pncVacio }])}
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
		</div>
	);
}
