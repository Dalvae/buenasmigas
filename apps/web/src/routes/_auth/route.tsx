import { Button } from "@buenasmigas/ui/components/button";
import { Link, Outlet, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

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

function AuthLayout() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const role = session?.user?.role;

  const links = [
    { to: "/dashboard", label: "Captura" },
    { to: "/consultas", label: "Consultas" },
  ] as const;

  async function handleLogout() {
    await authClient.signOut();
    clearToken();
    navigate({ to: "/login" });
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-2">
        <nav className="flex items-center gap-2 text-sm">
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="rounded-none px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground [&.active]:bg-muted [&.active]:font-medium [&.active]:text-foreground"
            >
              {label}
            </Link>
          ))}
          {role === "admin" ? (
            <Link
              to="/admin"
              className="rounded-none px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground [&.active]:bg-muted [&.active]:font-medium [&.active]:text-foreground"
            >
              Admin
            </Link>
          ) : null}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{session?.user?.name}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
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
