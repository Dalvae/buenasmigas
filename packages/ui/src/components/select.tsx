import { cn } from "@buenasmigas/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

const selectVariants = cva(
	"w-full min-w-0 border border-input bg-transparent outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
	{
		variants: {
			size: {
				default: "h-9 rounded-md px-3 py-1 text-sm",
				compact: "h-8 rounded-none px-2.5 py-1 text-xs",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

function Select({
	className,
	size,
	...props
}: Omit<React.ComponentProps<"select">, "size"> &
	VariantProps<typeof selectVariants>) {
	return (
		<select
			data-slot="select"
			className={cn(selectVariants({ size, className }))}
			{...props}
		/>
	);
}

export { Select, selectVariants };
