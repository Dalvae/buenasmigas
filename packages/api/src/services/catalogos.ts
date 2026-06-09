// Servicio de catálogos: reglas de negocio de las listas administrables y de
// los parámetros de fórmula. Hoy son CRUD sin reglas extra, pero esta capa es
// el lugar donde irían (validaciones de dominio, side-effects, etc.).

import * as catalogos from "../repositories/catalogos";

// --- Operarios ---
export function listOperarios() {
	return catalogos.listOperarios();
}
export function crearOperario(nombre: string) {
	return catalogos.createOperario(nombre);
}
export function actualizarOperario(
	id: number,
	patch: { nombre?: string; activo?: boolean },
) {
	return catalogos.updateOperario(id, patch);
}

// --- Tipos de envasado ---
export function listTipos() {
	return catalogos.listTipos();
}
export function crearTipo(nombre: string) {
	return catalogos.createTipo(nombre);
}
export function actualizarTipo(
	id: number,
	patch: { nombre?: string; activo?: boolean },
) {
	return catalogos.updateTipo(id, patch);
}

// --- Parámetros de fórmula ---
export function listConfig() {
	return catalogos.listConfig();
}
export function actualizarConfig(clave: string, valor: number) {
	return catalogos.updateConfig(clave, valor);
}
