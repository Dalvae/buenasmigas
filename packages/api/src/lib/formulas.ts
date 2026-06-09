// Cálculos de indicadores (RF-CALC). Las fórmulas son placeholder y se ajustan
// con los parámetros de `config_formula` (editables por admin, RF-CALC-04).

export type ConfigMap = Record<string, number>;

function round(n: number, decimals: number): number {
	const f = 10 ** decimals;
	return Math.round((n + Number.EPSILON) * f) / f;
}

// RF-CALC-01: % Cumplimiento Elaboración = batch_real / batch_prog * 100
export function calcElaboracionPct(
	batchReal: number,
	batchProg: number,
	decimals = 1,
): number {
	if (!batchProg) return 0;
	return round((batchReal / batchProg) * 100, decimals);
}

// RF-CALC-02: Total % Envasado = Σ real / Σ pedido * 100
export function calcEnvasadoPct(
	items: { pedido: number; real: number }[],
	decimals = 1,
): number {
	const pedido = items.reduce((a, i) => a + (i.pedido || 0), 0);
	const real = items.reduce((a, i) => a + (i.real || 0), 0);
	if (!pedido) return 0;
	return round((real / pedido) * 100, decimals);
}

// RF-CALC-03: Total kg PNC =
//   Σ kilos + Σ unidades * peso_unitario + Σ bandejas * peso_bandeja + Σ carros * peso_carro
export function calcPncTotalKg(
	items: {
		unidades: number;
		kilos: number;
		bandejas: number;
		carros: number;
	}[],
	config: ConfigMap,
	decimals = 2,
): number {
	const pesoUnit = config.pnc_peso_unitario_kg ?? 0;
	const pesoBandeja = config.pnc_peso_bandeja_kg ?? 0;
	const pesoCarro = config.pnc_peso_carro_kg ?? 0;
	const total = items.reduce(
		(a, i) =>
			a +
			(i.kilos || 0) +
			(i.unidades || 0) * pesoUnit +
			(i.bandejas || 0) * pesoBandeja +
			(i.carros || 0) * pesoCarro,
		0,
	);
	return round(total, decimals);
}

// Igual que calcPncTotalKg pero a partir de los Σ ya agregados (un solo ítem
// virtual). Lo usa la lectura (`listar`), que trae las sumas crudas desde la DB
// y deriva el total con la config vigente en vez de leer una columna congelada.
export function calcPncTotalKgFromSums(
	sums: {
		unidades: number;
		kilos: number;
		bandejas: number;
		carros: number;
	},
	config: ConfigMap,
	decimals = 2,
): number {
	return calcPncTotalKg([sums], config, decimals);
}

// Kg producidos por batch — base (denominador) del % PNC. Es un COEFICIENTE de la
// fórmula, NO un dato editable: vive en código, no en config_formula/DB.
// % PNC = kg PNC del turno ÷ (nº de batches producidos × 108). Valor de calidad.
export const PNC_KG_POR_BATCH = 108;

// % PNC = kg PNC / (batch producido × kg por batch) × 100.
// El denominador es la producción del turno en kg: el nº de batches producidos
// (batch_real) convertido a kilos con PNC_KG_POR_BATCH.
// Sin producción base (batchReal o kgPorBatch en 0) el % no es calculable → 0.
export function calcPncPct(
	pncTotalKg: number,
	batchReal: number,
	kgPorBatch: number = PNC_KG_POR_BATCH,
	decimals = 1,
): number {
	const producidoKg = batchReal * kgPorBatch;
	if (!producidoKg) return 0;
	return round((pncTotalKg / producidoKg) * 100, decimals);
}

// Descripciones legibles de cada indicador, con los parámetros vigentes
// interpolados. Viven JUNTO al cálculo a propósito: si mañana cambia una fórmula
// se edita acá mismo (un solo lugar) y la UI las consume vía el endpoint
// `opciones`, así nunca quedan desincronizadas con el cálculo real.
export function describeFormulas(config: ConfigMap) {
	const n = (clave: string) => config[clave] ?? 0;
	return {
		elaboracion: "% Elaboración = Batch producido ÷ Batch programado × 100",
		envasado:
			"% Envasado = Σ unidades reales ÷ Σ unidades pedidas × 100 (todos los tipos del turno)",
		pncKg: `kg PNC = Σ kilos + Σ unidades × ${n("pnc_peso_unitario_kg")} + Σ bandejas × ${n("pnc_peso_bandeja_kg")} + Σ carros × ${n("pnc_peso_carro_kg")}`,
		pncPct: `% PNC = kg PNC ÷ (Batch producido × ${PNC_KG_POR_BATCH} kg) × 100`,
	};
}
