import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#0f2544] text-white",
        secondary: "border-slate-300 bg-slate-100 text-slate-700",
        success: "border-transparent bg-[#3E6B52] text-white",
        warning: "border-transparent bg-[#9A6B2F] text-white",
        destructive: "border-transparent bg-[#8B3A3A] text-white",
        outline: "border-slate-300 bg-white text-slate-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
