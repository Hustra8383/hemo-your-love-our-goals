import type { LucideIcon } from "lucide-react";
import { GlassCard } from "./GlassCard";

export function Empty({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <GlassCard className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-secondary/60">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </span>
      <p className="font-serif text-lg">{title}</p>
      {hint && <p className="max-w-xs text-sm text-muted-foreground">{hint}</p>}
    </GlassCard>
  );
}
