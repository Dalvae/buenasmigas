// Servicio de catálogos: reglas de negocio de las listas administrables y de
// los parámetros de fórmula. Hoy son CRUD sin reglas extra, pero esta capa es
// el lugar donde irían (validaciones de dominio, side-effects, etc.).

import * as catalogos from "../repositories/catalogos";

// --- Operarios ---
export function listOperarios() {
	return catalogos.listOperarios();
}
export function crearOperario(nombre: string, actorUserId: string | null) {
	return catalogos.createOperario(nombre, actorUserId);
}
export function actualizarOperario(
	id: number,
	patch: { nombre?: string; activo?: boolean },
	actorUserId: string | null,
) {
	return catalogos.updateOperario(id, patch, actorUserId);
}

// --- Tipos de envasado ---
export function listTipos() {
	return catalogos.listTipos();
}
export function crearTipo(nombre: string, actorUserId: string | null) {
	return catalogos.createTipo(nombre, actorUserId);
}
export function actualizarTipo(
	id: number,
	patch: { nombre?: string; activo?: boolean },
	actorUserId: string | null,
) {
	return catalogos.updateTipo(id, patch, actorUserId);
}

// --- Parámetros de fórmula ---
export function listConfig() {
	return catalogos.listConfig();
}
export function actualizarConfig(
	clave: string,
	valor: number,
	actorUserId: string | null,
) {
	return catalogos.updateConfig(clave, valor, actorUserId);
}
