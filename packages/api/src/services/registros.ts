// Servicio de registros: reglas de negocio del dominio de producción. Computa
// los indicadores con las fórmulas parametrizadas, decide la auditoría y
// orquesta los repositorios. No conoce el transporte (oRPC) ni el schema.

import type {
	ActualizarRegistroDto,
	FiltroDto,
	RegistroDto,
	Turno,
	UpsertElaboracionDto,
	UpsertEnvasadoDto,
	UpsertPncDto,
} from "../dto/registros";
import { NotFoundError } from "../errors";
import {
	calcElaboracionPct,
	calcEnvasadoPct,
	calcPncPct,
	calcPncTotalKg,
	calcPncTotalKgFromSums,
	describeFormulas,
	PNC_KG_POR_BATCH,
} from "../lib/formulas";
import * as catalogos from "../repositories/catalogos";
import * as registros from "../repositories/registros";

export async function getOpciones() {
	const [operarios, tipos, config] = await Promise.all([
		catalogos.listOperarios({ soloActivos: true }),
		catalogos.listTipos({ soloActivos: true }),
		catalogos.getConfigMap(),
	]);
	// Definiciones de fórmulas servidas desde acá (única fuente de verdad) para
	// que los tooltips del front reflejen el cálculo y los parámetros vigentes.
	return { operarios, tipos, config, formulas: describeFormulas(config) };
}

export async function getPorFechaTurno(input: { fecha: string; turno: Turno }) {
	const reg = await registros.findByFechaTurno(input.fecha, input.turno);
	if (!reg) return null;
	const [envasado, pnc] = await Promise.all([
		registros.getEnvasadoItems(reg.id),
		registros.getPncItems(reg.id),
	]);
	return { ...reg, envasado, pnc };
}

export async function upsertElaboracion(
	input: UpsertElaboracionDto,
	userId: string | null,
) {
	const cfg = await catalogos.getConfigMap();
	// El indicador se DERIVA en lectura; aquí sólo se calcula para la respuesta
	// inmediata (no se persiste).
	const elaboracionPct = calcElaboracionPct(
		input.batchReal,
		input.batchProg,
		cfg.decimales_pct ?? 1,
	);
	const id = await registros.upsertElaboracion({ ...input, userId });
	return { id, elaboracionPct };
}

export async function upsertEnvasado(
	input: UpsertEnvasadoDto,
	userId: string | null,
) {
	const cfg = await catalogos.getConfigMap();
	const envasadoPct = calcEnvasadoPct(input.envasado, cfg.decimales_pct ?? 1);
	const id = await registros.upsertEnvasado({ ...input, userId });
	return { id, envasadoPct };
}

export async function upsertPnc(input: UpsertPncDto, userId: string | null) {
	const cfg = await catalogos.getConfigMap();
	const pncTotalKg = calcPncTotalKg(input.pnc, cfg);
	const id = await registros.upsertPnc({ ...input, userId });
	return { id, pncTotalKg };
}

function calcular(input: RegistroDto, cfg: Record<string, number>) {
	const decimals = cfg.decimales_pct ?? 1;
	return {
		elaboracionPct: calcElaboracionPct(
			input.batchReal,
			input.batchProg,
			decimals,
		),
		envasadoPct: calcEnvasadoPct(input.envasado, decimals),
		pncTotalKg: calcPncTotalKg(input.pnc, cfg),
	};
}

export async function crear(input: RegistroDto, userId: string | null) {
	const cfg = await catalogos.getConfigMap();
	// `calc` es sólo para la respuesta inmediata; los indicadores no se persisten
	// (se derivan en `listar`/export con la config vigente).
	const calc = calcular(input, cfg);
	const id = await registros.crearRegistro({
		fecha: input.fecha,
		turno: input.turno,
		operarioId: input.operarioId,
		batchReal: input.batchReal,
		batchProg: input.batchProg,
		envasado: input.envasado,
		pnc: input.pnc,
		detalle: `Turno ${input.turno} · ${input.fecha}`,
		userId,
	});
	return { id, ...calc };
}

export async function listar(filtro: FiltroDto) {
	const [rows, cfg] = await Promise.all([
		registros.listRegistros(filtro),
		catalogos.getConfigMap(),
	]);
	// Política uniforme: los CUATRO indicadores se DERIVAN en lectura desde los
	// datos crudos con la config vigente, nunca se leen de columnas congeladas.
	// Así no divergen entre sí ni con el Excel cuando admin edita `config_formula`.
	// El coeficiente PNC_KG_POR_BATCH vive en código (es fórmula, no dato).
	const decimals = cfg.decimales_pct ?? 1;
	return rows.map((r) => {
		const elaboracionPct = calcElaboracionPct(
			r.batchReal,
			r.batchProg,
			decimals,
		);
		const envasadoPct = calcEnvasadoPct(
			[{ pedido: r.envasadoPedido, real: r.envasadoReal }],
			decimals,
		);
		const pncTotalKg = calcPncTotalKgFromSums(
			{
				unidades: r.pncUnidades,
				kilos: r.pncKilos,
				bandejas: r.pncBandejas,
				carros: r.pncCarros,
			},
			cfg,
		);
		const pncPct = calcPncPct(
			pncTotalKg,
			r.batchReal,
			PNC_KG_POR_BATCH,
			decimals,
		);
		return {
			id: r.id,
			fecha: r.fecha,
			turno: r.turno,
			operarioId: r.operarioId,
			operario: r.operario,
			batchReal: r.batchReal,
			batchProg: r.batchProg,
			envasadoPedido: r.envasadoPedido,
			pncCount: r.pncCount,
			createdAt: r.createdAt,
			elaboracionPct,
			envasadoPct,
			pncTotalKg,
			pncPct,
		};
	});
}

// RF-EXP: filas para el Excel. Reusa `listar` (misma query e indicadores
// derivados que la UI) y proyecta sólo las columnas del reporte; el formateo a
// .xlsx vive en apps/server (capa de transporte), no aquí.
export async function exportar(filtro: FiltroDto) {
	const rows = await listar(filtro);
	return rows.map((r) => ({
		fecha: r.fecha,
		turno: r.turno,
		operario: r.operario,
		batchReal: r.batchReal,
		batchProg: r.batchProg,
		elaboracionPct: r.elaboracionPct,
		envasadoPct: r.envasadoPct,
		pncTotalKg: r.pncTotalKg,
		pncPct: r.pncPct,
	}));
}

export async function obtener(id: number) {
	const reg = await registros.getById(id);
	if (!reg) throw new NotFoundError("Registro no encontrado");
	const [envasado, pnc] = await Promise.all([
		registros.getEnvasadoItems(id),
		registros.getPncItems(id),
	]);
	return { ...reg, envasado, pnc };
}

export async function actualizar(
	input: ActualizarRegistroDto,
	userId: string | null,
) {
	const cfg = await catalogos.getConfigMap();
	const calc = calcular(input, cfg);
	await registros.actualizarRegistro({
		id: input.id,
		fecha: input.fecha,
		turno: input.turno,
		operarioId: input.operarioId,
		batchReal: input.batchReal,
		batchProg: input.batchProg,
		envasado: input.envasado,
		pnc: input.pnc,
		userId,
	});
	return { id: input.id, ...calc };
}

export function eliminar(id: number, userId: string | null) {
	return registros.eliminarRegistro({ id, userId });
}
