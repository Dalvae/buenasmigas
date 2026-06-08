# 📋 Documento de Requisitos — App "Buenas Migas"

> Sistema web para registro de producción por turno (Elaboración, Envasado, PNC),
> con cálculo automático de indicadores, consultas, gráficos y exportación a Excel.
> **Cliente/dominio:** productora de pan y pastelería "Buenas Migas".

- **Estado:** Borrador v1 — listo para iniciar desarrollo
- **Fecha:** 2026-06-08
- **Origen:** Wireframe manuscrito "Ingresar dato × turno" + entrevista de requisitos

---

## 1. Visión y Objetivo

Digitalizar el registro de producción que hoy se lleva en papel/planilla. Cada turno, un
operario ingresa los datos de las tres etapas (**Elaboración**, **Envasado**, **PNC** =
Producto No Conforme); el sistema calcula automáticamente los indicadores (% de
cumplimiento, totales, kilos), los almacena y permite **consultarlos, graficarlos y
exportarlos a Excel** por distintos períodos.

Foco transversal documentado en el wireframe: **Mejora de Práctica (MP)** — optimización de
movimientos, tiempos y ergonomía del proceso de registro.

---

## 2. Alcance

### Dentro de alcance (v1)

- Autenticación segura y autorización por roles.
- Captura de datos por turno en 3 módulos (Elaboración, Envasado, PNC).
- Cálculos automáticos de indicadores (fórmulas parametrizables).
- Persistencia en base de datos.
- Consultas y visualización (3 gráficos) filtrables por período.
- Exportación a Excel.
- Administración de listas (operarios, tipos de envasado) y parámetros de fórmulas.

### Fuera de alcance (v1)

- App móvil nativa (la web responsive cubre celular/tablet).
- Integraciones con ERP/sistemas externos.
- Multi-planta / multi-empresa.
- Reportería avanzada / BI (más allá de los 3 gráficos y el export).

---

## 3. Stack Tecnológico (decisiones cerradas)

| Capa             | Tecnología                                              | Motivo                                                     |
| ---------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| **Frontend**     | React + Vite + **TanStack Router** + **TanStack Query** | Build **estático**, máximo soporte IA, rápido a producción |
| **Estilos**      | **Tailwind CSS**                                        | Productividad, consistencia, responsive                    |
| **Gráficos**     | **Recharts** (alt. Tremor, nativo Tailwind)             | Simple, gran soporte IA; 3 gráficos                        |
| **Backend**      | **Fastify** (Node + TypeScript)                         | API liviana, rápida, gran ecosistema                       |
| **ORM / BD**     | **Drizzle ORM** → **PostgreSQL**                        | Type-safe, modelos desde schema (`drizzle-kit`)            |
| **Auth**         | **Better Auth**                                         | Auth segura, integra con Drizzle, RBAC                     |
| **Export Excel** | **ExcelJS** (en el backend)                             | Genera `.xlsx` desde la BD, con formato                    |
| **Contenedores** | **Docker** + **docker-compose**                         | Despliegue reproducible                                    |
| **Despliegue**   | **Dokploy** (self-hosted)                               | PaaS del cliente                                           |
| **Scaffolder**   | [`create-better-t-stack`](https://better-t-stack.dev)   | Genera TanStack+Fastify+Drizzle+Better Auth+Tailwind       |

**Lenguaje único:** TypeScript de punta a punta (frontend + backend).

---

## 4. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                         Dokploy (VPS)                        │
│                                                              │
│   docker-compose                                             │
│   ┌──────────────┐   ┌──────────────┐   ┌────────────────┐   │
│   │   web        │   │    api       │   │   postgres     │   │
│   │ React/Vite   │──▶│  Fastify     │──▶│  PostgreSQL    │   │
│   │ (estático,   │   │  Drizzle     │   │  (volumen)     │   │
│   │  Nginx)      │   │  Better Auth │   │                │   │
│   └──────────────┘   │  ExcelJS     │   └────────────────┘   │
│                      └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
        │  HTTPS (reverse proxy de Dokploy / Traefik)
        ▼
   Navegador (PC / tablet / celular del operario)
```

**Runtime/proceso:** Bun. **Un solo proceso de app**: Fastify (sobre Bun) sirve la API
(oRPC) **y** el frontend estático (`apps/web/dist`), `/api/auth/*` y el export Excel.
Monorepo orquestado con **Turborepo**.

- **app** (1 contenedor): Fastify+Bun sirve UI estática + API + auth + Excel; persiste vía
  Drizzle; valida y calcula los indicadores.
- **postgres**: base de datos en contenedor, con datos en un **volumen persistente**.
- En runtime corren **2 contenedores** (app + postgres) y **1 solo proceso de app**.

---

## 5. Requisitos Funcionales (RF)

### 5.1 Autenticación y Autorización

| ID             | Requisito                                                                                                                                                                                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RF-AUTH-01** | El sistema debe requerir **autenticación segura** mediante **email + contraseña** (Better Auth, contraseña con hash) para acceder a la aplicación. **NO** se usa login con Google/OAuth en v1 (queda como opción futura: solo activar un plugin de Better Auth). |
| **RF-AUTH-07** | El `admin` crea las cuentas de los operarios (no hay auto-registro abierto). Cada usuario entra con su correo y clave.                                                                                                                                           |
| **RF-AUTH-02** | Debe manejar **roles (RBAC)**: `operario` y `admin`.                                                                                                                                                                                                             |
| **RF-AUTH-03** | El rol `operario` puede **capturar datos** por turno y **ver las consultas, los 3 gráficos y exportar a Excel (solo lectura)**. NO puede editar/borrar registros, administrar listas, parámetros ni usuarios.                                                    |
| **RF-AUTH-04** | El rol `admin` tiene acceso total: todo lo del operario + **editar/borrar registros**, administrar listas, parámetros de fórmula y gestión de usuarios/roles.                                                                                                    |

**Matriz de capacidades (definitiva):**

| Capacidad                             |                                   `operario`                                   | `admin` |
| ------------------------------------- | :----------------------------------------------------------------------------: | :-----: |
| Capturar datos por turno              |                                       ✅                                       |   ✅    |
| Ver consultas + 3 gráficos            |                                       ✅                                       |   ✅    |
| Exportar a Excel                      |                                       ✅                                       |   ✅    |
| Editar/corregir registros             |                                       ❌                                       |   ✅    |
| Borrar registros                      |                                       ❌                                       |   ✅    |
| Administrar listas (operarios, tipos) |                                       ❌                                       |   ✅    |
| Editar parámetros de fórmulas         |                                       ❌                                       |   ✅    |
| Gestionar usuarios/roles              |                                       ❌                                       |   ✅    |
| **RF-AUTH-05**                        | Las sesiones deben expirar por inactividad y permitir cierre de sesión manual. |
| **RF-AUTH-06**                        |     Debe existir un usuario `admin` inicial (seed) para el primer acceso.      |

### 5.2 Captura de datos por turno

| ID            | Requisito                                                                                                                                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RF-CAP-01** | Pantalla "Ingresar dato × turno" con encabezado: **Operario** (selección de lista) y **Turno** (Turno 1 / Turno 2 / Turno 3) + **Fecha** (por defecto hoy).                                                                         |
| **RF-CAP-02** | **Un registro por (Fecha + Turno)**, que agrupa los 3 módulos (Elaboración, Envasado, PNC). No se permiten duplicados de la misma Fecha+Turno.                                                                                      |
| **RF-CAP-03** | **Módulo Elaboración:** ingresar `# Batch real` (entero ≥ 0) y `# Batch programado` (entero ≥ 0). El `% Cumplimiento` se calcula automáticamente (ver RF-CALC-01).                                                                  |
| **RF-CAP-04** | **Módulo Envasado:** seleccionar tipos de una lista (~10 posibles, configurable); por cada tipo elegido ingresar `Pedido` (entero) y `Real` (entero). Se llenan ~5 por turno. El `Total %` se calcula automáticamente (RF-CALC-02). |
| **RF-CAP-05** | **Módulo PNC:** por cada ítem ingresar `Unidades`, `Kilos`, `Bandejas` (admiten **1 decimal**). El `Total en kilos` se calcula automáticamente (RF-CALC-03).                                                                        |
| **RF-CAP-06** | Validación de campos: numéricos, no negativos, decimales según corresponda; mensajes de error claros en español.                                                                                                                    |
| **RF-CAP-07** | Al guardar, persistir el registro completo y mostrar confirmación + los indicadores calculados.                                                                                                                                     |

### 5.3 Cálculos automáticos (fórmulas parametrizables)

> ⚠️ **Las fórmulas son PLACEHOLDER y deben ser parametrizables** (editables por `admin` sin
> tocar código). Valores/pesos definitivos pendientes de confirmación del cliente.

| ID             | Requisito                                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RF-CALC-01** | **% Cumplimiento Elaboración** = `round( batch_real / batch_programado × 100, 1 )` (si programado = 0 ⇒ 0 / "N/A").                                           |
| **RF-CALC-02** | **Total % Envasado** = `round( Σ real / Σ pedido × 100, 1 )` sobre los tipos ingresados.                                                                      |
| **RF-CALC-03** | **Total kg PNC** = `Σ kilos + (Σ unidades × peso_unitario) + (Σ bandejas × peso_bandeja)`. `peso_unitario` y `peso_bandeja` son **parámetros configurables**. |
| **RF-CALC-04** | Los parámetros de fórmula (pesos, redondeos) se guardan en una tabla de configuración editable por `admin`.                                                   |

### 5.4 Consultas y Visualización

| ID             | Requisito                                                                                                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RF-CONS-01** | Visualizar registros con **filtro por período**: **día, semana, mes y rango personalizado** (todas las opciones), además de filtro por **turno** y por **operario**.                    |
| **RF-CONS-02** | Listado/tabla de registros del período seleccionado, con sus indicadores.                                                                                                               |
| **RF-CONS-03** | **3 gráficos** (Recharts), filtrados por el período seleccionado: <br>① **% Cumplimiento Elaboración** en el tiempo <br>② **% Envasado** en el tiempo <br>③ **Kilos PNC** en el tiempo. |
| **RF-CONS-04** | Los gráficos deben ser responsive y mostrar tooltips con el detalle del punto.                                                                                                          |

### 5.5 Exportación a Excel

| ID            | Requisito                                                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **RF-EXP-01** | Exportar a **Excel (.xlsx)** los registros del período/filtros seleccionados (generado en el backend con ExcelJS).            |
| **RF-EXP-02** | El Excel debe incluir encabezado (operario, turno, fecha) y los indicadores calculados de los 3 módulos, con formato legible. |
| **RF-EXP-03** | La descarga debe respetar los mismos filtros activos en la consulta (día/semana/mes/rango).                                   |

### 5.6 Administración

| ID            | Requisito                                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| **RF-ADM-01** | Gestionar la **lista de operarios** (alta/baja/edición). Seed inicial con 3 nombres (placeholder, configurables). |
| **RF-ADM-02** | Gestionar la **lista de tipos de envasado** (~10, configurable).                                                  |
| **RF-ADM-03** | Editar los **parámetros de las fórmulas** (RF-CALC-04).                                                           |
| **RF-ADM-04** | **Editar/corregir o eliminar** un registro ya guardado (solo `admin`), con registro de auditoría (quién/cuándo).  |
| **RF-ADM-05** | Gestionar usuarios y roles del sistema.                                                                           |

---

## 6. Requisitos No Funcionales (RNF)

| ID         | Categoría                | Requisito                                                                                                                                                            |
| ---------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RNF-01** | **Usabilidad**           | UI responsive (Tailwind) funcional en PC, tablet y celular. Idioma **español**. Flujo de captura optimizado (mínimos clics/movimientos — alineado con el foco "MP"). |
| **RNF-02** | **Seguridad**            | Auth con Better Auth: contraseñas con hash seguro, sesiones protegidas, protección CSRF, rate-limiting en login. Autorización RBAC en cada endpoint.                 |
| **RNF-03** | **Seguridad**            | Comunicación sobre **HTTPS** (reverse proxy de Dokploy). Sin secretos en el repo: usar variables de entorno (`.env`).                                                |
| **RNF-04** | **Rendimiento**          | Respuesta de la API < 300 ms en operaciones típicas. Carga inicial del SPA estático < 2 s en red normal.                                                             |
| **RNF-05** | **Recursos**             | Footprint moderado de RAM (stack Node liviano). No es el driver principal, pero evitar dependencias innecesarias.                                                    |
| **RNF-06** | **Disponibilidad**       | Datos en **volumen persistente** de Postgres. Estrategia de **backup** de la BD documentada.                                                                         |
| **RNF-07** | **Mantenibilidad**       | TypeScript end-to-end, tipado estricto, modelos generados con Drizzle. Código formateado (Prettier/Biome) y linteado.                                                |
| **RNF-08** | **Portabilidad**         | Todo containerizado (Docker). Levantar el entorno completo con `docker compose up`. Reproducible en Dokploy.                                                         |
| **RNF-09** | **Integridad**           | Restricción de unicidad (Fecha+Turno). Validación tanto en frontend como en backend. Transacciones al guardar un registro completo.                                  |
| **RNF-10** | **Auditoría**            | Registrar creación/edición/borrado de registros (usuario + timestamp).                                                                                               |
| **RNF-11** | **Internacionalización** | Formato de fecha/número local (es-CL).                                                                                                                               |

---

## 7. Modelo de Datos (preliminar — Drizzle)

> Esquema definido en TypeScript (Drizzle) → `drizzle-kit generate` crea las migraciones y la BD.

```
users            (id, email, password_hash, role['operario'|'admin'], created_at)  ← Better Auth
operarios        (id, nombre, activo)
tipos_envasado   (id, nombre, activo)
config_formula   (id, clave, valor)                       -- pesos, redondeos (RF-CALC-04)

registros        (id, fecha, turno['1'|'2'|'3'], operario_id, created_by, created_at, updated_at)
                  UNIQUE(fecha, turno)                     -- RF-CAP-02 / RNF-09

  elaboracion    (id, registro_id, batch_real, batch_prog, pct_cumplimiento)        -- 1:1
  envasado_items (id, registro_id, tipo_envasado_id, pedido, real)                  -- 1:N
  pnc_items      (id, registro_id, unidades, kilos, bandejas)                       -- 1:N

auditoria        (id, registro_id, accion, usuario_id, timestamp, detalle)
```

`% Total Envasado` y `Total kg PNC` se calculan en el backend al guardar y se pueden
persistir como columnas derivadas o recalcular en consulta (decisión de implementación).

---

## 8. Despliegue — Docker / docker-compose

Servicios del `docker-compose.yml`:

```
services:
  web        # Imagen multi-stage: build de Vite → Nginx sirve el estático
  api        # Imagen Node (Fastify + Drizzle + Better Auth + ExcelJS)
  postgres   # PostgreSQL oficial, con volumen persistente
```

- **Variables de entorno** (`.env`, NO commiteado): `DATABASE_URL`, `BETTER_AUTH_SECRET`,
  `BETTER_AUTH_URL`, credenciales de Postgres, parámetros de fórmula iniciales.
- **Migraciones**: ejecutar `drizzle-kit migrate` al desplegar (o en el arranque de `api`).
- **Seed**: usuario `admin` inicial + 3 operarios placeholder + tipos de envasado.
- **Volumen**: `postgres_data` para persistencia.
- **Dokploy**: importa este `docker-compose.yml`; el reverse proxy gestiona HTTPS y dominios.

---

## 9. Supuestos y Pendientes de confirmar

> El cliente indicó que las **fórmulas y el contenido de los gráficos son placeholder por
> ahora** ("da lo mismo") y se ajustarán luego. Por eso se diseñaron **parametrizables**.

- [ ] **Fórmulas reales** (RF-CALC-01/02/03) y pesos de PNC — pendientes del cliente.
- [ ] **Nombres reales** de los 3 operarios (hoy: placeholder, configurables).
- [ ] **Lista real** de los ~10 tipos de envasado.
- [ ] Confirmar contenido definitivo de los **3 gráficos**.
- [ ] Política de **backups** de Postgres (frecuencia/retención).
- [x] **Login: email + contraseña** (Better Auth). El admin crea las cuentas. Google/OAuth queda fuera de v1 (opción futura).

---

## 10. Próximos pasos

1. Scaffold con `create-better-t-stack` (TanStack Router + Fastify + Drizzle + Better Auth + Tailwind + Postgres).
2. Definir el schema Drizzle (sección 7) y generar migraciones.
3. Implementar auth + roles (sección 5.1).
4. Implementar captura por turno + cálculos parametrizables (5.2–5.3).
5. Consultas + 3 gráficos Recharts (5.4).
6. Export Excel con ExcelJS (5.5).
7. Administración (5.6).
8. `docker-compose.yml` + despliegue en Dokploy (sección 8).
