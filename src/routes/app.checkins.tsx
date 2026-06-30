import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { GlassCard } from "@/components/hemo/GlassCard";
import { Empty } from "@/components/hemo/Empty";
import { Sun, Coffee, UtensilsCrossed, Cookie, Droplets, Dumbbell, BookOpen, Briefcase, Moon, Check } from "lucide-react";
import { startOfDay, formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/app/checkins")({
  head: () => ({ meta: [{ title: "Check-ins — HEMO" }] }),
  component: Page,
});

const ITEMS = [
  { key: "wake_up", label: "Wake up", icon: Sun, tint: "her" },
  { key: "breakfast", label: "Breakfast", icon: Coffee, tint: "her" },
  { key: "lunch", label: "Lunch", icon: UtensilsCrossed, tint: "her" },
  { key: "dinner", label: "Dinner", icon: UtensilsCrossed, tint: "him" },
  { key: "snack", label: "Snack", icon: Cookie, tint: "her" },
  { key: "water", label: "Water", icon: Droplets, tint: "him" },
  { key: "workout", label: "Workout", icon: Dumbbell, tint: "him" },
  { key: "study_start", label: "Study start", icon: BookOpen, tint: "her" },
  { key: "study_end", label: "Study end", icon: BookOpen, tint: "her" },
  { key: "work_start", label: "Work start", icon: Briefcase, tint: "him" },
  { key: "work_end", label: "Work end", icon: Briefcase, tint: "him" },
  { key: "sleep", label: "Sleep", icon: Moon, tint: "him" },
] as const;

function Page() {
  const { user, couple } = useAuth();
  const qc = useQueryClient();

  const today = startOfDay(new Date()).toISOString();
  const q = useQuery({
    queryKey: ["checkins-today", user!.id],
    queryFn: async () => {
      const { data } = await supabase.from("check_ins").select("*").eq("user_id", user!.id).gte("created_at", today).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const doneToday = new Set((q.data ?? []).map((c) => c.kind));

  async function tap(kind: string, label: string) {
    const { error } = await supabase.from("check_ins").insert({ user_id: user!.id, couple_id: couple?.id ?? null, kind });
    if (error) { toast.error(error.message); return; }
    toast.success(`${label} ✓`);
    void qc.invalidateQueries({ queryKey: ["checkins-today", user!.id] });
  }

  return (
    <div className="space-y-4 pb-4">
      <section className="px-1 pt-2 animate-fade-up">
        <p className="text-sm text-muted-foreground">One tap. Tiny love notes.</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight">Today's check-ins</h1>
      </section>

      <section className="grid grid-cols-3 gap-3 animate-fade-up">
        {ITEMS.map(({ key, label, icon: Icon, tint }) => {
          const done = doneToday.has(key);
          return (
            <button
              key={key} onClick={() => tap(key, label)}
              className={`glass relative flex flex-col items-center gap-2 rounded-2xl p-4 text-xs font-medium transition active:scale-[0.96] ${done ? "ring-2 ring-primary/40" : ""}`}
            >
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${tint === "her" ? "gradient-her" : "gradient-him text-white"}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span>{label}</span>
              {done && (
                <span className="absolute top-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full gradient-hemo">
                  <Check className="h-3 w-3 text-white" />
                </span>
              )}
            </button>
          );
        })}
      </section>

      <section className="animate-fade-up">
        <p className="px-1 pb-2 text-xs uppercase tracking-wider text-muted-foreground">Today's timeline</p>
        {!q.data?.length ? (
          <Empty icon={Sun} title="The day is yours" hint="Tap a moment above to start your timeline." />
        ) : (
          <div className="space-y-2">
            {q.data.map((c) => {
              const meta = ITEMS.find((i) => i.key === c.kind);
              const Icon = meta?.icon ?? Sun;
              return (
                <GlassCard key={c.id} className="flex items-center gap-3 p-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary/60"><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{meta?.label ?? c.kind}</p>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNowStrict(new Date(c.created_at))} ago</p>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
