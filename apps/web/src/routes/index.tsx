import { createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/")({
	beforeLoad: async () => {
		const s = await authClient.getSession();
		if (!s.data) {
			throw redirect({ to: "/login" });
		}
		if (s.data.user.role === "admin") {
			throw redirect({ to: "/consultas" });
		}
		throw redirect({ to: "/dashboard" });
	},
});
