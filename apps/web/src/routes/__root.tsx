import type { AppRouterClient } from "@buenasmigas/api/routers/index";
import { Toaster } from "@buenasmigas/ui/components/sonner";
import { createORPCClient } from "@orpc/client";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useState } from "react";

import { ThemeProvider } from "@/components/theme-provider";
import { link, type orpc } from "@/utils/orpc";

import "../index.css";

export interface RouterAppContext {
	orpc: typeof orpc;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	head: () => ({
		meta: [
			{
				title: "buenasmigas",
			},
			{
				name: "description",
				content: "buenasmigas is a web application",
			},
		],
		links: [
			{
				rel: "icon",
				href: "/favicon.ico",
			},
		],
	}),
});

function RootComponent() {
	const [client] = useState<AppRouterClient>(() => createORPCClient(link));
	const [_orpcUtils] = useState(() => createTanstackQueryUtils(client));

	return (
		<>
			<HeadContent />
			<ThemeProvider
				attribute="class"
				defaultTheme="light"
				disableTransitionOnChange
				enableSystem={false}
				forcedTheme="light"
				storageKey="vite-ui-theme"
			>
				<div className="h-svh">
					<Outlet />
				</div>
				<Toaster richColors />
			</ThemeProvider>
			<TanStackRouterDevtools position="bottom-left" />
			<ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
		</>
	);
}
