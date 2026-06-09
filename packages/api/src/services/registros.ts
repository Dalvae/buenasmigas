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
	const elaboracionPct = calcElaboracionPct(
		input.batchReal,
		input.batchProg,
		cfg.decimales_pct ?? 1,
	);
	const id = await registros.upsertElaboracion({
		...input,
		elaboracionPct,
		userId,
	});
	return { id, elaboracionPct };
}

export async function upsertEnvasado(
	input: UpsertEnvasadoDto,
	userId: string | null,
) {
	const cfg = await catalogos.getConfigMap();
	const envasadoPct = calcEnvasadoPct(input.envasado, cfg.decimales_pct ?? 1);
	const id = await registros.upsertEnvasado({ ...input, envasadoPct, userId });
	return { id, envasadoPct };
}

export async function upsertPnc(input: UpsertPncDto, userId: string | null) {
	const cfg = await catalogos.getConfigMap();
	const pncTotalKg = calcPncTotalKg(input.pnc, cfg);
	const id = await registros.upsertPnc({ ...input, pncTotalKg, userId });
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
	const calc = calcular(input, cfg);
	const id = await registros.crearRegistro({
		fecha: input.fecha,
		turno: input.turno,
		operarioId: input.operarioId,
		batchReal: input.batchReal,
		batchProg: input.batchProg,
		...calc,
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
	// % PNC = kg PNC ÷ (batch producido × PNC_KG_POR_BATCH) × 100 (RF-CALC).
	// El coeficiente vive en código (lib/formulas), no en la DB: es fórmula, no dato.
	const decimals = cfg.decimales_pct ?? 1;
	return rows.map((r) => ({
		...r,
		pncPct: calcPncPct(r.pncTotalKg, r.batchReal, PNC_KG_POR_BATCH, decimals),
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
		...calc,
		envasado: input.envasado,
		pnc: input.pnc,
		userId,
	});
	return { id: input.id, ...calc };
}

export function eliminar(id: number, userId: string | null) {
	return registros.eliminarRegistro({ id, userId });
}
