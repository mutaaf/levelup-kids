import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Primary variant uses --brand-500 (terracotta) per docs/DESIGN.md. There is
// NO blue default and NO purple gradient anywhere on this surface.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-pill text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-brand-500 text-ink-inverse shadow-[var(--shadow-sm)] hover:bg-brand-600 active:bg-brand-600",
        secondary:
          "bg-tinted text-ink-primary hover:bg-tinted/80",
        outline:
          "border border-ink-primary/15 bg-card text-ink-primary hover:bg-tinted",
        ghost: "text-ink-primary hover:bg-tinted",
        destructive:
          "bg-danger text-ink-inverse hover:bg-danger/90",
        link: "text-brand-600 underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-4",
        md: "h-11 px-5",
        lg: "h-12 px-6 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
