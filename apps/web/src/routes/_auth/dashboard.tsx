import { Button } from "@buenasmigas/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@buenasmigas/ui/components/card";
import { Input } from "@buenasmigas/ui/components/input";
import { Label } from "@buenasmigas/ui/components/label";
import { ORPCError } from "@orpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/dashboard")({
  component: RouteComponent,
});

const selectClass =
  "h-8 w-full min-w-0 rounded-none border border-input bg-transparent px-2.5 py-1 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * f) / f;
}

type EnvasadoFila = { tipoEnvasadoId: string; pedido: string; real: string };
type PncFila = {
  descripcion: string;
  unidades: string;
  kilos: string;
  bandejas: string;
};

const envasadoVacio: EnvasadoFila = { tipoEnvasadoId: "", pedido: "", real: "" };
const pncVacio: PncFila = {
  descripcion: "",
  unidades: "",
  kilos: "",
  bandejas: "",
};

function RouteComponent() {
  const opciones = useQuery(orpc.registros.opciones.queryOptions());
  const operarios = opciones.data?.operarios ?? [];
  const tipos = opciones.data?.tipos ?? [];
  const config = opciones.data?.config ?? {};

  const [operarioId, setOperarioId] = useState("");
  const [turno, setTurno] = useState<"1" | "2" | "3">("1");
  const [fecha, setFecha] = useState(hoy());
  const [batchReal, setBatchReal] = useState("");
  const [batchProg, setBatchProg] = useState("");
  const [envasado, setEnvasado] = useState<EnvasadoFila[]>([{ ...envasadoVacio }]);
  const [pnc, setPnc] = useState<PncFila[]>([{ ...pncVacio }]);

  const crear = useMutation(
    orpc.registros.crear.mutationOptions({
      onSuccess: () => {
        toast.success("Registro guardado");
        queryClient.invalidateQueries();
        resetForm();
      },
      onError: (error) => {
        if (error instanceof ORPCError && error.code === "CONFLICT") {
          toast.error(error.message || "Ya existe un registro para esa fecha y turno.");
        } else {
          toast.error(error.message || "No se pudo guardar el registro");
        }
      },
    }),
  );

  function resetForm() {
    setOperarioId("");
    setTurno("1");
    setFecha(hoy());
    setBatchReal("");
    setBatchProg("");
    setEnvasado([{ ...envasadoVacio }]);
    setPnc([{ ...pncVacio }]);
  }

  const batchRealN = Number(batchReal) || 0;
  const batchProgN = Number(batchProg) || 0;
  const elaboracionPct = batchProgN > 0 ? round((batchRealN / batchProgN) * 100, 1) : 0;

  const sumPedido = envasado.reduce((a, f) => a + (Number(f.pedido) || 0), 0);
  const sumReal = envasado.reduce((a, f) => a + (Number(f.real) || 0), 0);
  const envasadoPct = sumPedido > 0 ? round((sumReal / sumPedido) * 100, 1) : 0;

  const pesoUnit = config.pnc_peso_unitario_kg ?? 0;
  const pesoBandeja = config.pnc_peso_bandeja_kg ?? 0;
  const pncTotalKg = round(
    pnc.reduce(
      (a, f) =>
        a +
        (Number(f.kilos) || 0) +
        (Number(f.unidades) || 0) * pesoUnit +
        (Number(f.bandejas) || 0) * pesoBandeja,
      0,
    ),
    2,
  );

  function updateEnvasado(i: number, patch: Partial<EnvasadoFila>) {
    setEnvasado((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function updatePnc(i: number, patch: Partial<PncFila>) {
    setPnc((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!operarioId) {
      toast.error("Selecciona un operario");
      return;
    }
    crear.mutate({
      fecha,
      turno,
      operarioId: Number(operarioId),
      batchReal: batchRealN,
      batchProg: batchProgN,
      envasado: envasado
        .filter((f) => f.tipoEnvasadoId)
        .map((f) => ({
          tipoEnvasadoId: Number(f.tipoEnvasadoId),
          pedido: Number(f.pedido) || 0,
          real: Number(f.real) || 0,
        })),
      pnc: pnc
        .filter(
          (f) =>
            f.descripcion.trim() !== "" ||
            f.unidades !== "" ||
            f.kilos !== "" ||
            f.bandejas !== "",
        )
        .map((f) => ({
          descripcion: f.descripcion.trim() || undefined,
          unidades: Number(f.unidades) || 0,
          kilos: Number(f.kilos) || 0,
          bandejas: Number(f.bandejas) || 0,
        })),
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Captura de turno</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Datos del turno</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="operario">Operario</Label>
              <select
                id="operario"
                className={selectClass}
                value={operarioId}
                onChange={(e) => setOperarioId(e.target.value)}
              >
                <option value="">Selecciona…</option>
                {operarios.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="turno">Turno</Label>
              <select
                id="turno"
                className={selectClass}
                value={turno}
                onChange={(e) => setTurno(e.target.value as "1" | "2" | "3")}
              >
                <option value="1">Turno 1</option>
                <option value="2">Turno 2</option>
                <option value="3">Turno 3</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Elaboración</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="batchReal">Batch real</Label>
              <Input
                id="batchReal"
                type="number"
                min={0}
                step={1}
                value={batchReal}
                onChange={(e) => setBatchReal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batchProg">Batch programado</Label>
              <Input
                id="batchProg"
                type="number"
                min={0}
                step={1}
                value={batchProg}
                onChange={(e) => setBatchProg(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>% Cumplimiento</Label>
              <div className="flex h-8 items-center text-sm font-medium">
                {elaboracionPct}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Envasado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {envasado.map((fila, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2">
                  <div className="space-y-1">
                    {i === 0 ? <Label className="text-xs">Tipo</Label> : null}
                    <select
                      className={selectClass}
                      value={fila.tipoEnvasadoId}
                      onChange={(e) => updateEnvasado(i, { tipoEnvasadoId: e.target.value })}
                    >
                      <option value="">Selecciona…</option>
                      {tipos.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    {i === 0 ? <Label className="text-xs">Pedido</Label> : null}
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      className="w-24"
                      value={fila.pedido}
                      onChange={(e) => updateEnvasado(i, { pedido: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    {i === 0 ? <Label className="text-xs">Real</Label> : null}
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      className="w-24"
                      value={fila.real}
                      onChange={(e) => updateEnvasado(i, { real: e.target.value })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEnvasado((rows) => rows.filter((_, idx) => idx !== i))}
                  >
                    Quitar
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEnvasado((rows) => [...rows, { ...envasadoVacio }])}
              >
                Agregar
              </Button>
              <span className="text-sm font-medium">Total %: {envasadoPct}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Producto No Conforme (PNC)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {pnc.map((fila, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] items-end gap-2"
                >
                  <div className="space-y-1">
                    {i === 0 ? <Label className="text-xs">Descripción</Label> : null}
                    <Input
                      type="text"
                      value={fila.descripcion}
                      onChange={(e) => updatePnc(i, { descripcion: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    {i === 0 ? <Label className="text-xs">Unidades</Label> : null}
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      className="w-20"
                      value={fila.unidades}
                      onChange={(e) => updatePnc(i, { unidades: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    {i === 0 ? <Label className="text-xs">Kilos</Label> : null}
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      className="w-20"
                      value={fila.kilos}
                      onChange={(e) => updatePnc(i, { kilos: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    {i === 0 ? <Label className="text-xs">Bandejas</Label> : null}
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      className="w-20"
                      value={fila.bandejas}
                      onChange={(e) => updatePnc(i, { bandejas: e.target.value })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPnc((rows) => rows.filter((_, idx) => idx !== i))}
                  >
                    Quitar
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPnc((rows) => [...rows, { ...pncVacio }])}
              >
                Agregar
              </Button>
              <span className="text-sm font-medium">Total kg: {pncTotalKg}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={crear.isPending}>
            {crear.isPending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
