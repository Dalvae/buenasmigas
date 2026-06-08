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

// RF-CALC-03: Total kg PNC = Σ kilos + Σ unidades * peso_unitario + Σ bandejas * peso_bandeja
export function calcPncTotalKg(
  items: { unidades: number; kilos: number; bandejas: number }[],
  config: ConfigMap,
  decimals = 2,
): number {
  const pesoUnit = config.pnc_peso_unitario_kg ?? 0;
  const pesoBandeja = config.pnc_peso_bandeja_kg ?? 0;
  const total = items.reduce(
    (a, i) =>
      a +
      (i.kilos || 0) +
      (i.unidades || 0) * pesoUnit +
      (i.bandejas || 0) * pesoBandeja,
    0,
  );
  return round(total, decimals);
}
