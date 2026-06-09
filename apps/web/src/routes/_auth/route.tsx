import { Button } from "@buenasmigas/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@buenasmigas/ui/components/dropdown-menu";
import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { LogOut, Menu } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { clearToken } from "@/lib/token";

export const Route = createFileRoute("/_auth")({
	component: AuthLayout,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			throw redirect({
				to: "/login",
			});
		}
		return { session };
	},
});

const linkClass =
	"rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-primary [&.active]:bg-secondary [&.active]:font-medium [&.active]:text-primary";

function AuthLayout() {
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();
	const role = session?.user?.role;

	const links = [
		{ to: "/dashboard", label: "Inicio" },
		{ to: "/consultas", label: "Consultas" },
	] as const;

	async function handleLogout() {
		await authClient.signOut();
		clearToken();
		navigate({ to: "/login" });
	}

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<header className="flex items-center justify-between gap-4 border-b bg-background px-4 py-3">
				<div className="flex items-center gap-6">
					<Link
						to="/dashboard"
						className="font-bold font-display text-lg text-primary tracking-tight sm:text-xl"
					>
						Buenas Migas
					</Link>
					<nav className="hidden items-center gap-1 text-sm sm:flex">
						{links.map(({ to, label }) => (
							<Link key={to} to={to} className={linkClass}>
								{label}
							</Link>
						))}
						{role === "admin" ? (
							<Link to="/admin" className={linkClass}>
								Admin
							</Link>
						) : null}
					</nav>
				</div>

				{/* Acciones de escritorio */}
				<div className="hidden items-center gap-3 sm:flex">
					<div className="flex items-center gap-2.5">
						<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-display font-semibold text-primary-foreground text-sm">
							{session?.user?.name?.charAt(0).toUpperCase() ?? "?"}
						</span>
						<div className="flex flex-col leading-tight">
							<span className="font-medium text-foreground text-sm">
								{session?.user?.name}
							</span>
							<span className="text-muted-foreground text-xs">
								{role === "admin" ? "Administrador" : "Operario"}
							</span>
						</div>
					</div>
					<Button
						variant="outline"
						size="sm"
						className="gap-1.5 rounded-md"
						onClick={handleLogout}
					>
						<LogOut className="size-4" />
						Salir
					</Button>
				</div>

				{/* Menú móvil */}
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								variant="outline"
								size="icon"
								aria-label="Abrir menú"
								className="rounded-md sm:hidden"
							>
								<Menu className="size-5" />
							</Button>
						}
					/>
					<DropdownMenuContent align="end" className="w-48 rounded-md">
						{session?.user?.name ? (
							<DropdownMenuGroup>
								<DropdownMenuLabel className="font-medium text-foreground text-sm">
									{session.user.name}
								</DropdownMenuLabel>
							</DropdownMenuGroup>
						) : null}
						<DropdownMenuSeparator />
						{links.map(({ to, label }) => (
							<DropdownMenuItem
								key={to}
								className="text-sm"
								onClick={() => navigate({ to })}
							>
								{label}
							</DropdownMenuItem>
						))}
						{role === "admin" ? (
							<DropdownMenuItem
								className="text-sm"
								onClick={() => navigate({ to: "/admin" })}
							>
								Admin
							</DropdownMenuItem>
						) : null}
						<DropdownMenuSeparator />
						<DropdownMenuItem
							variant="destructive"
							className="text-sm"
							onClick={handleLogout}
						>
							<LogOut className="size-4" />
							Salir
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</header>
			<main className="flex-1 overflow-auto">
				<Outlet />
			</main>
		</div>
	);
}
