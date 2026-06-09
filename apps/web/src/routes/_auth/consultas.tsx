import { env } from "@buenasmigas/env/web";
import { Button } from "@buenasmigas/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@buenasmigas/ui/components/card";
import { Label } from "@buenasmigas/ui/components/label";
import { Select } from "@buenasmigas/ui/components/select";
import {
	Tooltip as InfoTip,
	TooltipContent,
	TooltipTrigger,
} from "@buenasmigas/ui/components/tooltip";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { type ReactNode, useState } from "react";
import {
	Bar,
	CartesianGrid,
	ComposedChart,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { toast } from "sonner";

import { primerDiaMes, ultimoDiaMes } from "@/lib/fechas";
import { getToken } from "@/lib/token";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/consultas")({
	component: RouteComponent,
});

// Inputs nativos (date) en densidad compacta, alineada con el Select compacto.
const inputClass =
	"h-8 w-full min-w-0 rounded-none border border-input bg-transparent px-2.5 py-1 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

// Título de tarjeta con un ícono de ayuda que muestra la fórmula del indicador.
// La definición llega del backend (endpoint `opciones`), no se hardcodea acá.
function TituloFormula({
	titulo,
	formula,
}: {
	titulo: string;
	formula: ReactNode;
}) {
	return (
		<CardTitle className="flex items-center gap-1.5">
			{titulo}
			{formula ? (
				<InfoTip>
					<TooltipTrigger
						aria-label={`Fórmula de ${titulo}`}
						className="inline-flex cursor-help text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
					>
						<Info className="size-4" />
					</TooltipTrigger>
					<TooltipContent>{formula}</TooltipContent>
				</InfoTip>
			) : null}
		</CardTitle>
	);
}

function RouteComponent() {
	const [desde, setDesde] = useState(primerDiaMes());
	const [hasta, setHasta] = useState(ultimoDiaMes());
	const [turno, setTurno] = useState<"" | "1" | "2" | "3">("");
	const [operarioId, setOperarioId] = useState("");
	const [exportando, setExportando] = useState(false);

	const opciones = useQuery(orpc.registros.opciones.queryOptions());
	const operarios = opciones.data?.operarios ?? [];
	const formulas = opciones.data?.formulas;

	const registros = useQuery(
		orpc.registros.listar.queryOptions({
			input: {
				desde,
				hasta,
				turno: turno || undefined,
				operarioId: operarioId ? Number(operarioId) : undefined,
			},
		}),
	);

	const filas = registros.data ?? [];
	// Un módulo no ingresado vale 0 en la BD; lo mostramos como null para que el
	// gráfico deje un hueco en vez de dibujar un cero engañoso.
	const chartData = filas.map((r) => ({
		fecha: r.fecha,
		elaboracionPct: r.batchProg > 0 ? r.elaboracionPct : null,
		envasadoPct: r.envasadoPedido > 0 ? r.envasadoPct : null,
		pncTotalKg: r.pncCount > 0 ? r.pncTotalKg : null,
		// El % necesita producción base (batch producido); si no hay, deja hueco.
		pncPct: r.pncCount > 0 && r.batchReal > 0 ? r.pncPct : null,
	}));

	async function exportarExcel() {
		setExportando(true);
		try {
			const params = new URLSearchParams({ desde, hasta });
			if (turno) params.set("turno", turno);
			if (operarioId) params.set("operarioId", operarioId);
			const res = await fetch(
				`${env.VITE_SERVER_URL}/export/excel?${params.toString()}`,
				{
					headers: { Authorization: `Bearer ${getToken()}` },
				},
			);
			if (!res.ok) {
				throw new Error("No se pudo generar el Excel");
			}
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `buenasmigas_${desde}_${hasta}.xlsx`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Error al exportar");
		} finally {
			setExportando(false);
		}
	}

	return (
		<div className="mx-auto max-w-5xl px-4 py-6">
			<h1 className="mb-4 font-bold text-2xl">Consultas</h1>

			<Card className="mb-6">
				<CardHeader>
					<CardTitle>Filtros</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
					<div className="space-y-2">
						<Label htmlFor="desde">Desde</Label>
						<input
							id="desde"
							type="date"
							className={inputClass}
							value={desde}
							onChange={(e) => setDesde(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="hasta">Hasta</Label>
						<input
							id="hasta"
							type="date"
							className={inputClass}
							value={hasta}
							onChange={(e) => setHasta(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="turno">Turno</Label>
						<Select
							id="turno"
							size="compact"
							value={turno}
							onChange={(e) => setTurno(e.target.value as "" | "1" | "2" | "3")}
						>
							<option value="">Todos</option>
							<option value="1">Turno 1</option>
							<option value="2">Turno 2</option>
							<option value="3">Turno 3</option>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="operario">Operario</Label>
						<Select
							id="operario"
							size="compact"
							value={operarioId}
							onChange={(e) => setOperarioId(e.target.value)}
						>
							<option value="">Todos</option>
							{operarios.map((o) => (
								<option key={o.id} value={o.id}>
									{o.nombre}
								</option>
							))}
						</Select>
					</div>
					<div className="flex items-end">
						<Button
							type="button"
							variant="outline"
							className="w-full"
							onClick={exportarExcel}
							disabled={exportando}
						>
							{exportando ? "Exportando…" : "Exportar a Excel"}
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card className="mb-6">
				<CardHeader>
					<CardTitle>Registros</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<table className="w-full border-collapse text-sm">
							<thead>
								<tr className="border-b text-left text-muted-foreground">
									<th className="px-2 py-2 font-medium">Fecha</th>
									<th className="px-2 py-2 font-medium">Turno</th>
									<th className="px-2 py-2 font-medium">Operario</th>
									<th className="px-2 py-2 text-right font-medium">% Elab.</th>
									<th className="px-2 py-2 text-right font-medium">
										% Envasado
									</th>
									<th className="px-2 py-2 text-right font-medium">kg PNC</th>
								</tr>
							</thead>
							<tbody>
								{registros.isLoading ? (
									<tr>
										<td className="px-2 py-3 text-muted-foreground" colSpan={6}>
											Cargando…
										</td>
									</tr>
								) : filas.length === 0 ? (
									<tr>
										<td className="px-2 py-3 text-muted-foreground" colSpan={6}>
											Sin registros en el período.
										</td>
									</tr>
								) : (
									filas.map((r) => (
										<tr key={r.id} className="border-b">
											<td className="px-2 py-2">{r.fecha}</td>
											<td className="px-2 py-2">{r.turno}</td>
											<td className="px-2 py-2">{r.operario}</td>
											<td className="px-2 py-2 text-right">
												{r.batchProg > 0 ? `${r.elaboracionPct}%` : "—"}
											</td>
											<td className="px-2 py-2 text-right">
												{r.envasadoPedido > 0 ? `${r.envasadoPct}%` : "—"}
											</td>
											<td className="px-2 py-2 text-right">
												{r.pncCount > 0 ? r.pncTotalKg : "—"}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<TituloFormula
							titulo="% Elaboración"
							formula={formulas?.elaboracion}
						/>
					</CardHeader>
					<CardContent>
						<ResponsiveContainer width="100%" height={240}>
							<LineChart data={chartData}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="fecha" />
								<YAxis />
								<Tooltip />
								<Line
									type="monotone"
									dataKey="elaboracionPct"
									stroke="#2563eb"
									name="% Elab."
								/>
							</LineChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<TituloFormula titulo="% Envasado" formula={formulas?.envasado} />
					</CardHeader>
					<CardContent>
						<ResponsiveContainer width="100%" height={240}>
							<LineChart data={chartData}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="fecha" />
								<YAxis />
								<Tooltip />
								<Line
									type="monotone"
									dataKey="envasadoPct"
									stroke="#16a34a"
									name="% Envasado"
								/>
							</LineChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>

				<Card className="lg:col-span-2">
					<CardHeader>
						<TituloFormula
							titulo="PNC (kg y %)"
							formula={
								formulas ? (
									<>
										<p>{formulas.pncKg}</p>
										<p className="mt-1.5">{formulas.pncPct}</p>
									</>
								) : null
							}
						/>
					</CardHeader>
					<CardContent>
						<ResponsiveContainer width="100%" height={240}>
							<ComposedChart data={chartData}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="fecha" />
								<YAxis
									yAxisId="kg"
									orientation="left"
									tickFormatter={(v) => `${v} kg`}
								/>
								<YAxis
									yAxisId="pct"
									orientation="right"
									tickFormatter={(v) => `${v}%`}
								/>
								<Tooltip />
								<Legend />
								<Bar
									yAxisId="kg"
									dataKey="pncTotalKg"
									fill="#d97706"
									name="kg PNC"
									unit=" kg"
								/>
								<Line
									yAxisId="pct"
									type="monotone"
									dataKey="pncPct"
									stroke="#dc2626"
									name="% PNC"
									unit="%"
								/>
							</ComposedChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
