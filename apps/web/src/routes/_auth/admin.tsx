import { Button } from "@buenasmigas/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@buenasmigas/ui/components/card";
import { Input } from "@buenasmigas/ui/components/input";
import { Label } from "@buenasmigas/ui/components/label";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/admin")({
	component: RouteComponent,
});

const selectClass =
	"h-8 min-w-0 rounded-none border border-input bg-transparent px-2.5 py-1 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

function RouteComponent() {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();
	const role = session?.user?.role;

	useEffect(() => {
		if (!isPending && session && role !== "admin") {
			toast.error("No tienes permisos para ver Administración");
			navigate({ to: "/dashboard" });
		}
	}, [isPending, session, role, navigate]);

	if (isPending || role !== "admin") {
		return null;
	}

	return (
		<div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
			<h1 className="font-bold text-2xl">Administración</h1>
			<OperariosSection />
			<TiposSection />
			<ConfigSection />
			<UsuariosSection />
		</div>
	);
}

function OperariosSection() {
	const { data } = useQuery(orpc.admin.operarios.queryOptions());
	const [nombre, setNombre] = useState("");

	const crear = useMutation(
		orpc.admin.crearOperario.mutationOptions({
			onSuccess: () => {
				toast.success("Operario agregado");
				setNombre("");
				queryClient.invalidateQueries();
			},
			onError: (e) => toast.error(e.message || "No se pudo agregar"),
		}),
	);
	const actualizar = useMutation(
		orpc.admin.actualizarOperario.mutationOptions({
			onSuccess: () => {
				toast.success("Operario actualizado");
				queryClient.invalidateQueries();
			},
			onError: (e) => toast.error(e.message || "No se pudo actualizar"),
		}),
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Operarios</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<form
					className="flex items-end gap-2"
					onSubmit={(e) => {
						e.preventDefault();
						if (!nombre.trim()) return;
						crear.mutate({ nombre: nombre.trim() });
					}}
				>
					<div className="flex-1 space-y-1">
						<Label htmlFor="op-nombre">Nuevo operario</Label>
						<Input
							id="op-nombre"
							value={nombre}
							onChange={(e) => setNombre(e.target.value)}
							placeholder="Nombre"
						/>
					</div>
					<Button type="submit" disabled={crear.isPending}>
						Agregar
					</Button>
				</form>
				<ul className="divide-y">
					{(data ?? []).map((o) => (
						<li
							key={o.id}
							className="flex items-center justify-between py-2 text-sm"
						>
							<span
								className={o.activo ? "" : "text-muted-foreground line-through"}
							>
								{o.nombre}
							</span>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={actualizar.isPending}
								onClick={() =>
									actualizar.mutate({ id: o.id, activo: !o.activo })
								}
							>
								{o.activo ? "Desactivar" : "Activar"}
							</Button>
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}

function TiposSection() {
	const { data } = useQuery(orpc.admin.tipos.queryOptions());
	const [nombre, setNombre] = useState("");

	const crear = useMutation(
		orpc.admin.crearTipo.mutationOptions({
			onSuccess: () => {
				toast.success("Tipo agregado");
				setNombre("");
				queryClient.invalidateQueries();
			},
			onError: (e) => toast.error(e.message || "No se pudo agregar"),
		}),
	);
	const actualizar = useMutation(
		orpc.admin.actualizarTipo.mutationOptions({
			onSuccess: () => {
				toast.success("Tipo actualizado");
				queryClient.invalidateQueries();
			},
			onError: (e) => toast.error(e.message || "No se pudo actualizar"),
		}),
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Tipos de envasado</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<form
					className="flex items-end gap-2"
					onSubmit={(e) => {
						e.preventDefault();
						if (!nombre.trim()) return;
						crear.mutate({ nombre: nombre.trim() });
					}}
				>
					<div className="flex-1 space-y-1">
						<Label htmlFor="tipo-nombre">Nuevo tipo</Label>
						<Input
							id="tipo-nombre"
							value={nombre}
							onChange={(e) => setNombre(e.target.value)}
							placeholder="Nombre"
						/>
					</div>
					<Button type="submit" disabled={crear.isPending}>
						Agregar
					</Button>
				</form>
				<ul className="divide-y">
					{(data ?? []).map((t) => (
						<li
							key={t.id}
							className="flex items-center justify-between py-2 text-sm"
						>
							<span
								className={t.activo ? "" : "text-muted-foreground line-through"}
							>
								{t.nombre}
							</span>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={actualizar.isPending}
								onClick={() =>
									actualizar.mutate({ id: t.id, activo: !t.activo })
								}
							>
								{t.activo ? "Desactivar" : "Activar"}
							</Button>
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}

function ConfigSection() {
	const { data } = useQuery(orpc.admin.config.queryOptions());
	const [valores, setValores] = useState<Record<string, string>>({});

	const actualizar = useMutation(
		orpc.admin.actualizarConfig.mutationOptions({
			onSuccess: () => {
				toast.success("Parámetro actualizado");
				queryClient.invalidateQueries();
			},
			onError: (e) => toast.error(e.message || "No se pudo actualizar"),
		}),
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Parámetros de fórmula</CardTitle>
			</CardHeader>
			<CardContent>
				<ul className="divide-y">
					{(data ?? []).map((c) => {
						const valor = valores[c.clave] ?? String(c.valor);
						return (
							<li
								key={c.clave}
								className="flex items-center justify-between gap-2 py-2 text-sm"
							>
								<span className="font-mono">{c.clave}</span>
								<div className="flex items-center gap-2">
									<Input
										type="number"
										step="any"
										className="w-32"
										value={valor}
										onChange={(e) =>
											setValores((v) => ({ ...v, [c.clave]: e.target.value }))
										}
									/>
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={actualizar.isPending}
										onClick={() =>
											actualizar.mutate({
												clave: c.clave,
												valor: Number(valor) || 0,
											})
										}
									>
										Guardar
									</Button>
								</div>
							</li>
						);
					})}
				</ul>
			</CardContent>
		</Card>
	);
}

function UsuariosSection() {
	const { data } = useQuery(orpc.admin.usuarios.queryOptions());
	const [form, setForm] = useState({
		name: "",
		email: "",
		password: "",
		role: "operario" as "operario" | "admin",
	});
	const [resets, setResets] = useState<Record<string, string>>({});

	const crear = useMutation(
		orpc.admin.crearUsuario.mutationOptions({
			onSuccess: () => {
				toast.success("Usuario creado");
				setForm({ name: "", email: "", password: "", role: "operario" });
				queryClient.invalidateQueries();
			},
			onError: (e) => toast.error(e.message || "No se pudo crear el usuario"),
		}),
	);
	const cambiarRol = useMutation(
		orpc.admin.cambiarRol.mutationOptions({
			onSuccess: () => {
				toast.success("Rol actualizado");
				queryClient.invalidateQueries();
			},
			onError: (e) => toast.error(e.message || "No se pudo cambiar el rol"),
		}),
	);
	const resetPassword = useMutation(
		orpc.admin.resetPassword.mutationOptions({
			onSuccess: () => {
				toast.success("Clave reseteada");
				queryClient.invalidateQueries();
			},
			onError: (e) => toast.error(e.message || "No se pudo resetear la clave"),
		}),
	);
	const eliminar = useMutation(
		orpc.admin.eliminarUsuario.mutationOptions({
			onSuccess: () => {
				toast.success("Usuario eliminado");
				queryClient.invalidateQueries();
			},
			onError: (e) => toast.error(e.message || "No se pudo eliminar"),
		}),
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Usuarios</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<form
					className="grid grid-cols-1 items-end gap-2 sm:grid-cols-5"
					onSubmit={(e) => {
						e.preventDefault();
						crear.mutate(form);
					}}
				>
					<div className="space-y-1">
						<Label htmlFor="u-name">Nombre</Label>
						<Input
							id="u-name"
							value={form.name}
							onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="u-email">Correo</Label>
						<Input
							id="u-email"
							type="email"
							value={form.email}
							onChange={(e) =>
								setForm((f) => ({ ...f, email: e.target.value }))
							}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="u-pass">Clave</Label>
						<Input
							id="u-pass"
							type="password"
							value={form.password}
							onChange={(e) =>
								setForm((f) => ({ ...f, password: e.target.value }))
							}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="u-role">Rol</Label>
						<select
							id="u-role"
							className={`${selectClass} w-full`}
							value={form.role}
							onChange={(e) =>
								setForm((f) => ({
									...f,
									role: e.target.value as "operario" | "admin",
								}))
							}
						>
							<option value="operario">Operario</option>
							<option value="admin">Admin</option>
						</select>
					</div>
					<Button type="submit" disabled={crear.isPending}>
						Crear
					</Button>
				</form>

				<div className="overflow-x-auto">
					<table className="w-full border-collapse text-sm">
						<thead>
							<tr className="border-b text-left text-muted-foreground">
								<th className="px-2 py-2 font-medium">Nombre</th>
								<th className="px-2 py-2 font-medium">Correo</th>
								<th className="px-2 py-2 font-medium">Rol</th>
								<th className="px-2 py-2 font-medium">Resetear clave</th>
								<th className="px-2 py-2 font-medium" />
							</tr>
						</thead>
						<tbody>
							{(data ?? []).map((u) => (
								<tr key={u.id} className="border-b align-middle">
									<td className="px-2 py-2">{u.name}</td>
									<td className="px-2 py-2">{u.email}</td>
									<td className="px-2 py-2">
										<select
											className={selectClass}
											value={u.role ?? "operario"}
											onChange={(e) =>
												cambiarRol.mutate({
													userId: u.id,
													role: e.target.value as "operario" | "admin",
												})
											}
										>
											<option value="operario">Operario</option>
											<option value="admin">Admin</option>
										</select>
									</td>
									<td className="px-2 py-2">
										<div className="flex items-center gap-2">
											<Input
												type="password"
												className="w-32"
												placeholder="Nueva clave"
												value={resets[u.id] ?? ""}
												onChange={(e) =>
													setResets((r) => ({ ...r, [u.id]: e.target.value }))
												}
											/>
											<Button
												type="button"
												variant="outline"
												size="sm"
												disabled={resetPassword.isPending}
												onClick={() => {
													const newPassword = resets[u.id] ?? "";
													if (newPassword.length < 8) {
														toast.error(
															"La clave debe tener al menos 8 caracteres",
														);
														return;
													}
													resetPassword.mutate({ userId: u.id, newPassword });
													setResets((r) => ({ ...r, [u.id]: "" }));
												}}
											>
												Resetear
											</Button>
										</div>
									</td>
									<td className="px-2 py-2 text-right">
										<Button
											type="button"
											variant="destructive"
											size="sm"
											disabled={eliminar.isPending}
											onClick={() => {
												if (confirm(`¿Eliminar a ${u.email}?`)) {
													eliminar.mutate({ userId: u.id });
												}
											}}
										>
											Eliminar
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</CardContent>
		</Card>
	);
}
