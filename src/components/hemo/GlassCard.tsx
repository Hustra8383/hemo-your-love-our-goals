import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function GlassCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass rounded-3xl p-5 transition-all duration-500",
        "hover:shadow-[var(--shadow-soft)]",
        className,
      )}
      {...props}
    />
  );
}
