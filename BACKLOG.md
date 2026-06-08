# 📋 Backlog — Buenas Migas

Mejoras pendientes detectadas durante pruebas/uso. Prioridad sugerida arriba.

## UI / Marca
- [ ] **Login más logrado** (hoy "penca"): fondo con foto de pan/panadería (estilo
      buenasmigas.cl), formulario dentro de una card elevada con sombra, wordmark más
      grande y fiel a la fuente del logo. *(En progreso — finding & fix desde pruebas.)*
- [ ] Revisar que la **fuente del wordmark** (Zilla Slab) se acerque al logo real de
      buenasmigas.cl; si no, probar otra serif slab más fiel.
- [ ] Foto de marca real (licenciada por el cliente) para el fondo del login y/o un
      hero, en `apps/web/public/`.

## Funcional
- [ ] **Admin: editar/borrar registros desde Consultas** (RF-ADM-04) — el backend ya
      tiene `actualizar`/`eliminar`, falta la UI.
- [ ] **Umbrales del semáforo configurables** (hoy fijos 95/80) — moverlos a
      `config_formula` editable por admin.
- [ ] Confirmar **semáforo en Envasado** (además de Elaboración).
- [ ] Exportar a Excel: verificar la descarga end-to-end desde la UI (no solo el 401).

## Técnico / limpieza
- [ ] Quitar el endpoint/forma `crear` (combinado) legacy: lo reemplazaron los
      `upsert*` por módulo del wireframe.
- [ ] Borrar componentes muertos del scaffold si quedaron (`header`, `mode-toggle`,
      `user-menu`).
- [ ] **Tests e2e en CI**: correr Playwright en GitHub Actions con un servicio Postgres
      + build, no solo localmente.
- [ ] **Backups de Postgres** (RNF-06): definir frecuencia/retención en el VPS.

## Cliente (no es código)
- [ ] **Fórmulas reales** (RF-CALC), **nombres** de operarios y **tipos de envasado**
      definitivos — hoy placeholders configurables.
