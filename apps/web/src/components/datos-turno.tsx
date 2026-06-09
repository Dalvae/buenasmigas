import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@buenasmigas/ui/components/card";
import { Input } from "@buenasmigas/ui/components/input";
import { Label } from "@buenasmigas/ui/components/label";
import { Select } from "@buenasmigas/ui/components/select";

import type { Turno } from "@/hooks/use-registro-turno";

type Operario = { id: number; nombre: string };

type DatosTurnoProps = {
	operarios: Operario[];
	operarioId: string;
	onOperarioChange: (id: string) => void;
	turno: Turno;
	onTurnoChange: (turno: Turno) => void;
	fecha: string;
	onFechaChange: (fecha: string) => void;
};

// Bloque "Datos del turno" (operario + turno + fecha) compartido por las tres
// pantallas de captura. Totalmente controlado por el componente padre.
export function DatosTurno({
	operarios,
	operarioId,
	onOperarioChange,
	turno,
	onTurnoChange,
	fecha,
	onFechaChange,
}: DatosTurnoProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-display">Datos del turno</CardTitle>
			</CardHeader>
			<CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div className="space-y-2">
					<Label htmlFor="operario">Nombre</Label>
					<Select
						id="operario"
						value={operarioId}
						onChange={(e) => onOperarioChange(e.target.value)}
					>
						<option value="">Selecciona…</option>
						{operarios.map((o) => (
							<option key={o.id} value={o.id}>
								{o.nombre}
							</option>
						))}
					</Select>
				</div>
				<div className="space-y-2">
					<Label htmlFor="turno">Turno</Label>
					<Select
						id="turno"
						value={turno}
						onChange={(e) => onTurnoChange(e.target.value as Turno)}
					>
						<option value="1">Turno 1</option>
						<option value="2">Turno 2</option>
						<option value="3">Turno 3</option>
					</Select>
				</div>
				<div className="space-y-2">
					<Label htmlFor="fecha">Fecha</Label>
					<Input
						id="fecha"
						type="date"
						className="rounded-md"
						value={fecha}
						onChange={(e) => onFechaChange(e.target.value)}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
