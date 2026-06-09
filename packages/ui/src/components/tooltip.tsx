"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "@buenasmigas/ui/lib/utils";

function TooltipProvider({
	delay = 150,
	...props
}: TooltipPrimitive.Provider.Props) {
	return (
		<TooltipPrimitive.Provider
			data-slot="tooltip-provider"
			delay={delay}
			{...props}
		/>
	);
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
	return (
		<TooltipProvider>
			<TooltipPrimitive.Root data-slot="tooltip" {...props} />
		</TooltipProvider>
	);
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
	return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
	className,
	side = "top",
	sideOffset = 6,
	children,
	...props
}: TooltipPrimitive.Popup.Props & {
	side?: TooltipPrimitive.Positioner.Props["side"];
	sideOffset?: TooltipPrimitive.Positioner.Props["sideOffset"];
}) {
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Positioner
				className="z-50 outline-none"
				side={side}
				sideOffset={sideOffset}
			>
				<TooltipPrimitive.Popup
					data-slot="tooltip-content"
					className={cn(
						"z-50 max-w-xs text-balance rounded-none bg-popover px-3 py-2 text-popover-foreground text-xs leading-relaxed shadow-md ring-1 ring-foreground/10",
						className,
					)}
					{...props}
				>
					{children}
				</TooltipPrimitive.Popup>
			</TooltipPrimitive.Positioner>
		</TooltipPrimitive.Portal>
	);
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
