import { createFileRoute, redirect } from "@tanstack/react-router";

import SignInForm from "@/components/sign-in-form";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (session.data) {
			// Ya autenticado → "/" decide por rol (operario → menú, admin → resultados).
			throw redirect({ to: "/" });
		}
	},
});

function RouteComponent() {
	return (
		// Fondo cálido de marca. El cliente puede soltar una foto de panadería
		// licenciada en apps/web/public/login-bg.jpg (ver BACKLOG.md) para reemplazarlo.
		<div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-secondary via-background to-accent p-4">
			<div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-xl">
				<SignInForm />
			</div>
		</div>
	);
}
