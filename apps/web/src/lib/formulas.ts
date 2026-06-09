// Previews de indicadores para las pantallas de captura. Replican lo que el
// server calcula al guardar, para mostrar el valor antes de enviar. Los
// decimales NO se hardcodean: vienen de `config` (endpoint `opciones`).

// `config` es el mapa de parámetros de fórmula que viaja en `opciones.config`
// (Record<clave, número>). Tipado laxo a propósito: el contrato lo define el server.
export type ConfigMap = Record<string, number>;

export function round(n: number, decimals: number): number {
	const f = 10 ** decimals;
	return Math.round((n + Number.EPSILON) * f) / f;
}

function decimalesPct(config: ConfigMap | undefined): number {
	return config?.decimales_pct ?? 1;
}

// % de cumplimiento = (real / programado) * 100. Sin base programada → 0.
export function previewElaboracionPct(
	batchProg: number,
	batchReal: number,
	config: ConfigMap | undefined,
): number {
	if (batchProg <= 0) return 0;
	return round((batchReal / batchProg) * 100, decimalesPct(config));
}

// % de envasado = (suma real / suma pedido) * 100. Sin pedido → 0.
export function previewEnvasadoPct(
	sumPedido: number,
	sumReal: number,
	config: ConfigMap | undefined,
): number {
	if (sumPedido <= 0) return 0;
	return round((sumReal / sumPedido) * 100, decimalesPct(config));
}

export type PncFilaPeso = {
	unidades: number;
	kilos: number;
	bandejas: number;
	carros: number;
};

// Total kg PNC = kilos directos + unidades/bandejas/carros convertidos a kg con
// los pesos unitarios de la config. Siempre 2 decimales (kg, no porcentaje).
export function previewPncTotalKg(
	filas: PncFilaPeso[],
	config: ConfigMap | undefined,
): number {
	const pesoUnit = config?.pnc_peso_unitario_kg ?? 0;
	const pesoBandeja = config?.pnc_peso_bandeja_kg ?? 0;
	const pesoCarro = config?.pnc_peso_carro_kg ?? 0;
	return round(
		filas.reduce(
			(a, f) =>
				a +
				f.kilos +
				f.unidades * pesoUnit +
				f.bandejas * pesoBandeja +
				f.carros * pesoCarro,
			0,
		),
		2,
	);
}
