import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-pill px-3 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-brand-500 text-ink-inverse",
        secondary: "bg-tinted text-ink-secondary",
        outline: "border border-ink-primary/15 text-ink-primary",
        success: "bg-[color:var(--success)]/15 text-[color:var(--success)]",
        warning: "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
        danger: "bg-[color:var(--danger)]/15 text-[color:var(--danger)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
