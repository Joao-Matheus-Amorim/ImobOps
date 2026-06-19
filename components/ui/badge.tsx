import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/35 bg-primary/15 text-primary shadow-glow-sm",
        secondary: "border-primary/15 bg-secondary text-secondary-foreground",
        success: "border-transparent bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]",
        warning: "border-transparent bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]",
        destructive: "border-transparent bg-destructive/15 text-destructive",
        gold: "border-transparent bg-gold/15 text-gold",
        outline: "border-primary/20 bg-card/35 text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
