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

export const Route = createFileRoute("/_auth/envasado")({
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

	const [operarioId, setOperarioId] = useState("");
	const [turno, setTurno] = useState<"1" | "2" | "3">("1");
	const [fecha, setFecha] = useState(hoy());
	const [filas, setFilas] = useState<EnvasadoFila[]>([{ ...envasadoVacio }]);

	const registro = useQuery(
		orpc.registros.porFechaTurno.queryOptions({
			input: { fecha, turno },
			enabled: Boolean(fecha) && Boolean(turno),
		}),
	);

	// Prellena las filas de envasado al cambiar fecha+turno.
	useEffect(() => {
		const data = registro.data;
		if (data) {
			if (data.operarioId) setOperarioId(String(data.operarioId));
			setFilas(
				data.envasado.length
					? data.envasado.map((f) => ({
							tipoEnvasadoId: String(f.tipoEnvasadoId),
							pedido: String(f.pedido),
							real: String(f.real),
						}))
					: [{ ...envasadoVacio }],
			);
		} else if (registro.isFetched) {
			setFilas([{ ...envasadoVacio }]);
		}
	}, [registro.data, registro.isFetched]);

	const sumPedido = filas.reduce((a, f) => a + (Number(f.pedido) || 0), 0);
	const sumReal = filas.reduce((a, f) => a + (Number(f.real) || 0), 0);
	const envasadoPct = sumPedido > 0 ? round((sumReal / sumPedido) * 100, 1) : 0;

	function updateFila(i: number, patch: Partial<EnvasadoFila>) {
		setFilas((rows) =>
			rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
		);
	}

	const guardar = useMutation(
		orpc.registros.upsertEnvasado.mutationOptions({
			onSuccess: () => {
				toast.success("Envasado guardado");
				queryClient.invalidateQueries();
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
		<div className="mx-auto max-w-3xl px-4 py-6">
			<h1 className="mb-4 font-bold font-display text-2xl text-primary tracking-tight">
				Ingreso Producción Envasado
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
						<CardTitle className="font-display">Envasado</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-3 sm:space-y-2">
							{filas.map((fila, i) => (
								<div
									key={i}
									className="grid grid-cols-2 items-end gap-x-2 gap-y-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[1fr_6rem_6rem_auto] sm:gap-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"
								>
									<div className="col-span-2 space-y-1 sm:col-span-1">
										<Label
											className={i === 0 ? "text-xs" : "text-xs sm:sr-only"}
										>
											Tipo
										</Label>
										<select
											className={selectClass}
											value={fila.tipoEnvasadoId}
											onChange={(e) =>
												updateFila(i, { tipoEnvasadoId: e.target.value })
											}
										>
											<option value="">Selecciona…</option>
											{tipos.map((t) => (
												<option key={t.id} value={t.id}>
													{t.nombre}
												</option>
											))}
										</select>
									</div>
									<div className="space-y-1">
										<Label
											className={i === 0 ? "text-xs" : "text-xs sm:sr-only"}
										>
											Pedido
										</Label>
										<Input
											type="number"
											min={0}
											step={1}
											className="w-full rounded-md"
											value={fila.pedido}
											onChange={(e) =>
												updateFila(i, { pedido: e.target.value })
											}
										/>
									</div>
									<div className="space-y-1">
										<Label
											className={i === 0 ? "text-xs" : "text-xs sm:sr-only"}
										>
											Real
										</Label>
										<Input
											type="number"
											min={0}
											step={1}
											className="w-full rounded-md"
											value={fila.real}
											onChange={(e) => updateFila(i, { real: e.target.value })}
										/>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() =>
											setFilas((rows) => rows.filter((_, idx) => idx !== i))
										}
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
								onClick={() =>
									setFilas((rows) => [...rows, { ...envasadoVacio }])
								}
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
		</div>
	);
}
