import ExcelJS from "exceljs";

// Formateador puro: recibe las filas YA resueltas por la capa service
// (services/registros.listar — misma query e indicadores derivados que la UI) y
// devuelve el Buffer .xlsx. No accede a la DB ni a Drizzle (sin fuga de capa).
export interface ExportRow {
	fecha: string;
	turno: string;
	operario: string;
	batchReal: number;
	batchProg: number;
	elaboracionPct: number;
	envasadoPct: number;
	pncTotalKg: number;
	pncPct: number;
}

// RF-EXP: genera un .xlsx con los registros del período/filtros.
export async function generarExcel(rows: ExportRow[]): Promise<Buffer> {
	const wb = new ExcelJS.Workbook();
	wb.creator = "Buenas Migas";
	const ws = wb.addWorksheet("Producción");
	ws.columns = [
		{ header: "Fecha", key: "fecha", width: 12 },
		{ header: "Turno", key: "turno", width: 8 },
		{ header: "Operario", key: "operario", width: 22 },
		{ header: "Batch real", key: "batchReal", width: 12 },
		{ header: "Batch prog.", key: "batchProg", width: 12 },
		{ header: "% Cumpl. Elab.", key: "elaboracionPct", width: 15 },
		{ header: "% Envasado", key: "envasadoPct", width: 13 },
		{ header: "PNC (kg)", key: "pncTotalKg", width: 12 },
		{ header: "% PNC", key: "pncPct", width: 10 },
	];
	ws.getRow(1).font = { bold: true };
	for (const r of rows) ws.addRow(r);

	const buf = await wb.xlsx.writeBuffer();
	return Buffer.from(buf);
}
