import { db, operario, registro } from "@buenasmigas/db";
import { and, asc, between, eq } from "drizzle-orm";
import ExcelJS from "exceljs";

export interface ExportFiltro {
	desde: string;
	hasta: string;
	turno?: "1" | "2" | "3";
	operarioId?: number;
}

// RF-EXP: genera un .xlsx con los registros del período/filtros.
export async function generarExcel(filtro: ExportFiltro): Promise<Buffer> {
	const conds = [between(registro.fecha, filtro.desde, filtro.hasta)];
	if (filtro.turno) conds.push(eq(registro.turno, filtro.turno));
	if (filtro.operarioId) conds.push(eq(registro.operarioId, filtro.operarioId));

	const rows = await db
		.select({
			fecha: registro.fecha,
			turno: registro.turno,
			operario: operario.nombre,
			batchReal: registro.batchReal,
			batchProg: registro.batchProg,
			elaboracionPct: registro.elaboracionPct,
			envasadoPct: registro.envasadoPct,
			pncTotalKg: registro.pncTotalKg,
		})
		.from(registro)
		.innerJoin(operario, eq(registro.operarioId, operario.id))
		.where(and(...conds))
		.orderBy(asc(registro.fecha), asc(registro.turno));

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
	];
	ws.getRow(1).font = { bold: true };
	for (const r of rows) ws.addRow(r);

	const buf = await wb.xlsx.writeBuffer();
	return Buffer.from(buf);
}
