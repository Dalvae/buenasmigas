import { Card } from "@buenasmigas/ui/components/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ChartColumn, Package, TriangleAlert, Wheat } from "lucide-react";

export const Route = createFileRoute("/_auth/dashboard")({
	component: RouteComponent,
});

type MenuItem = {
	to: "/elaboracion" | "/envasado" | "/pnc" | "/consultas";
	titulo: string;
	icono: LucideIcon;
};

const ITEMS: MenuItem[] = [
	{
		to: "/elaboracion",
		titulo: "Ingreso Producción Elaboración",
		icono: Wheat,
	},
	{
		to: "/envasado",
		titulo: "Ingreso Producción Envasado",
		icono: Package,
	},
	{
		to: "/pnc",
		titulo: "Ingreso Producto No Conforme",
		icono: TriangleAlert,
	},
	{
		to: "/consultas",
		titulo: "Ver resultados de Producción",
		icono: ChartColumn,
	},
];

function RouteComponent() {
	return (
		<div className="mx-auto max-w-4xl px-4 py-10">
			<h1 className="mb-8 text-center font-bold font-display text-3xl text-primary tracking-tight">
				Registro de Datos de Producción
			</h1>

			<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
				{ITEMS.map(({ to, titulo, icono: Icono }) => (
					<Link key={to} to={to} className="block focus-visible:outline-none">
						<Card className="flex h-44 flex-col items-center justify-center gap-4 rounded-md border bg-card p-6 text-center transition-colors hover:border-primary hover:bg-accent">
							<span className="flex h-16 w-16 items-center justify-center rounded-md bg-primary text-primary-foreground">
								<Icono className="size-8" />
							</span>
							<span className="font-display font-semibold text-foreground text-lg leading-tight">
								{titulo}
							</span>
						</Card>
					</Link>
				))}
			</div>
		</div>
	);
}
