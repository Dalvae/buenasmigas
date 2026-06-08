import { env } from "@buenasmigas/env/web";
import { Button } from "@buenasmigas/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@buenasmigas/ui/components/card";
import { Label } from "@buenasmigas/ui/components/label";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { toast } from "sonner";

import { getToken } from "@/lib/token";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/consultas")({
	component: RouteComponent,
});

const selectClass =
	"h-8 w-full min-w-0 rounded-none border border-input bg-transparent px-2.5 py-1 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

const inputClass =
	"h-8 w-full min-w-0 rounded-none border border-input bg-transparent px-2.5 py-1 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

function primerDiaMes(): string {
	const d = new Date();
	return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString("en-CA");
}
function ultimoDiaMes(): string {
	const d = new Date();
	return new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString(
		"en-CA",
	);
}

function RouteComponent() {
	const [desde, setDesde] = useState(primerDiaMes());
	const [hasta, setHasta] = useState(ultimoDiaMes());
	const [turno, setTurno] = useState("");
	const [operarioId, setOperarioId] = useState("");
	const [exportando, setExportando] = useState(false);

	const opciones = useQuery(orpc.registros.opciones.queryOptions());
	const operarios = opciones.data?.operarios ?? [];

	const registros = useQuery(
		orpc.registros.listar.queryOptions({
			input: {
				desde,
				hasta,
				turno: turno ? (turno as "1" | "2" | "3") : undefined,
				operarioId: operarioId ? Number(operarioId) : undefined,
			},
		}),
	);

	const filas = registros.data ?? [];
	const chartData = filas.map((r) => ({
		fecha: r.fecha,
		elaboracionPct: r.elaboracionPct,
		envasadoPct: r.envasadoPct,
		pncTotalKg: r.pncTotalKg,
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
						<select
							id="turno"
							className={selectClass}
							value={turno}
							onChange={(e) => setTurno(e.target.value)}
						>
							<option value="">Todos</option>
							<option value="1">Turno 1</option>
							<option value="2">Turno 2</option>
							<option value="3">Turno 3</option>
						</select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="operario">Operario</Label>
						<select
							id="operario"
							className={selectClass}
							value={operarioId}
							onChange={(e) => setOperarioId(e.target.value)}
						>
							<option value="">Todos</option>
							{operarios.map((o) => (
								<option key={o.id} value={o.id}>
									{o.nombre}
								</option>
							))}
						</select>
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
												{r.elaboracionPct}%
											</td>
											<td className="px-2 py-2 text-right">{r.envasadoPct}%</td>
											<td className="px-2 py-2 text-right">{r.pncTotalKg}</td>
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
						<CardTitle>% Elaboración</CardTitle>
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
						<CardTitle>% Envasado</CardTitle>
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
						<CardTitle>kg PNC</CardTitle>
					</CardHeader>
					<CardContent>
						<ResponsiveContainer width="100%" height={240}>
							<BarChart data={chartData}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="fecha" />
								<YAxis />
								<Tooltip />
								<Bar dataKey="pncTotalKg" fill="#d97706" name="kg PNC" />
							</BarChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
