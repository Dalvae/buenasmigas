import { Button } from "@buenasmigas/ui/components/button";
import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useNavigate,
} from "@tanstack/react-router";

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
						className="font-bold font-display text-primary text-xl tracking-tight"
					>
						Buenas Migas
					</Link>
					<nav className="flex items-center gap-1 text-sm">
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
				<div className="flex items-center gap-3">
					<span className="text-muted-foreground text-sm">
						{session?.user?.name}
					</span>
					<Button
						variant="outline"
						size="sm"
						className="rounded-md"
						onClick={handleLogout}
					>
						Salir
					</Button>
				</div>
			</header>
			<main className="flex-1 overflow-auto">
				<Outlet />
			</main>
		</div>
	);
}
