import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

// Turno del registro (RF-CAP-01)
export const turnoEnum = pgEnum("turno", ["1", "2", "3"]);
// Acción registrada en auditoría (RNF-10)
export const accionEnum = pgEnum("accion_auditoria", ["crear", "editar", "borrar"]);

// --- Listas administrables (RF-ADM-01 / RF-ADM-02) ---

export const operario = pgTable("operario", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tipoEnvasado = pgTable("tipo_envasado", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Parámetros de fórmula editables por admin (RF-CALC-04)
export const configFormula = pgTable("config_formula", {
  clave: text("clave").primaryKey(),
  valor: doublePrecision("valor").notNull(),
  descripcion: text("descripcion"),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// --- Registro por turno (RF-CAP-02: único por fecha+turno) ---

export const registro = pgTable(
  "registro",
  {
    id: serial("id").primaryKey(),
    fecha: date("fecha").notNull(),
    turno: turnoEnum("turno").notNull(),
    operarioId: integer("operario_id")
      .notNull()
      .references(() => operario.id),
    // Elaboración (1:1 inline) — RF-CAP-03 / RF-CALC-01
    batchReal: integer("batch_real").notNull().default(0),
    batchProg: integer("batch_prog").notNull().default(0),
    elaboracionPct: doublePrecision("elaboracion_pct").notNull().default(0),
    // Totales calculados — RF-CALC-02 / RF-CALC-03
    envasadoPct: doublePrecision("envasado_pct").notNull().default(0),
    pncTotalKg: doublePrecision("pnc_total_kg").notNull().default(0),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("registro_fecha_turno_idx").on(t.fecha, t.turno),
    index("registro_fecha_idx").on(t.fecha),
  ],
);

// Envasado (1:N) — RF-CAP-04
export const envasadoItem = pgTable(
  "envasado_item",
  {
    id: serial("id").primaryKey(),
    registroId: integer("registro_id")
      .notNull()
      .references(() => registro.id, { onDelete: "cascade" }),
    tipoEnvasadoId: integer("tipo_envasado_id")
      .notNull()
      .references(() => tipoEnvasado.id),
    pedido: integer("pedido").notNull().default(0),
    real: integer("real").notNull().default(0),
  },
  (t) => [index("envasado_item_registro_idx").on(t.registroId)],
);

// PNC — Producto No Conforme (1:N, admiten 1 decimal) — RF-CAP-05
export const pncItem = pgTable(
  "pnc_item",
  {
    id: serial("id").primaryKey(),
    registroId: integer("registro_id")
      .notNull()
      .references(() => registro.id, { onDelete: "cascade" }),
    descripcion: text("descripcion"),
    unidades: doublePrecision("unidades").notNull().default(0),
    kilos: doublePrecision("kilos").notNull().default(0),
    bandejas: doublePrecision("bandejas").notNull().default(0),
  },
  (t) => [index("pnc_item_registro_idx").on(t.registroId)],
);

// Auditoría de cambios (RNF-10)
export const auditoria = pgTable("auditoria", {
  id: serial("id").primaryKey(),
  registroId: integer("registro_id"),
  accion: accionEnum("accion").notNull(),
  usuarioId: text("usuario_id").references(() => user.id, {
    onDelete: "set null",
  }),
  detalle: text("detalle"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Relations ---

export const operarioRelations = relations(operario, ({ many }) => ({
  registros: many(registro),
}));

export const registroRelations = relations(registro, ({ one, many }) => ({
  operario: one(operario, {
    fields: [registro.operarioId],
    references: [operario.id],
  }),
  envasadoItems: many(envasadoItem),
  pncItems: many(pncItem),
}));

export const envasadoItemRelations = relations(envasadoItem, ({ one }) => ({
  registro: one(registro, {
    fields: [envasadoItem.registroId],
    references: [registro.id],
  }),
  tipo: one(tipoEnvasado, {
    fields: [envasadoItem.tipoEnvasadoId],
    references: [tipoEnvasado.id],
  }),
}));

export const pncItemRelations = relations(pncItem, ({ one }) => ({
  registro: one(registro, {
    fields: [pncItem.registroId],
    references: [registro.id],
  }),
}));
