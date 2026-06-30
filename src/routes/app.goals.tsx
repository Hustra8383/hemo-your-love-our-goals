import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { GlassCard } from "@/components/hemo/GlassCard";
import { Empty } from "@/components/hemo/Empty";
import { Target, Plus, Loader2, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/goals")({
  head: () => ({ meta: [{ title: "Goals — HEMO" }] }),
  component: Page,
});

type Scope = "today" | "weekly" | "monthly" | "dream";
const SCOPES: { key: Scope; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "weekly", label: "Week" },
  { key: "monthly", label: "Month" },
  { key: "dream", label: "Dreams" },
];

function Page() {
  const { user, couple } = useAuth();
  const qc = useQueryClient();
  const [scope, setScope] = useState<Scope>("today");
  const [title, setTitle] = useState("");
  const [shared, setShared] = useState(false);
  const [adding, setAdding] = useState(false);

  const q = useQuery({
    queryKey: ["goals", user!.id, scope],
    queryFn: async () => {
      const { data } = await supabase.from("goals").select("*")
        .or(`user_id.eq.${user!.id},and(shared.eq.true,couple_id.eq.${couple?.id ?? "00000000-0000-0000-0000-000000000000"})`)
        .eq("scope", scope).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function add() {
    if (!title.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("goals").insert({
      user_id: user!.id, couple_id: couple?.id ?? null,
      title: title.trim(), scope, shared,
    });
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    setTitle(""); setShared(false);
    void qc.invalidateQueries({ queryKey: ["goals", user!.id, scope] });
  }

  async function toggle(id: string, done: boolean) {
    const { error } = await supabase.from("goals").update({ done: !done }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    void qc.invalidateQueries({ queryKey: ["goals", user!.id, scope] });
    void qc.invalidateQueries({ queryKey: ["today-goals", user!.id] });
  }
  async function remove(id: string) {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    void qc.invalidateQueries({ queryKey: ["goals", user!.id, scope] });
  }

  return (
    <div className="space-y-4 pb-4">
      <section className="px-1 pt-2 animate-fade-up">
        <p className="text-sm text-muted-foreground">Small steps. Big dreams.</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight">Goals</h1>
      </section>

      <div className="glass flex gap-1 rounded-full p-1 animate-fade-up">
        {SCOPES.map((s) => (
          <button key={s.key} onClick={() => setScope(s.key)}
            className={`flex-1 rounded-full px-3 py-2 text-xs font-medium transition ${scope === s.key ? "gradient-hemo text-white" : "text-muted-foreground"}`}>
            {s.label}
          </button>
        ))}
      </div>

      <GlassCard className="animate-fade-up">
        <div className="flex gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder={scope === "dream" ? "A dream you're building…" : "Add a goal…"}
            className="flex-1 rounded-2xl border border-input bg-card/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={add} disabled={adding || !title.trim()} className="grid place-items-center rounded-2xl gradient-hemo px-4 text-white disabled:opacity-50">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="h-4 w-4 rounded" />
          Share with your person
        </label>
      </GlassCard>

      <section className="animate-fade-up space-y-2">
        {q.isLoading ? (
          <GlassCard className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></GlassCard>
        ) : !q.data?.length ? (
          <Empty icon={Target} title="No goals yet" hint="Add one above. Tiny wins add up." />
        ) : q.data.map((g) => (
          <GlassCard key={g.id} className="flex items-center gap-3 p-3">
            <button onClick={() => toggle(g.id, g.done)} className={`grid h-7 w-7 place-items-center rounded-full border-2 transition ${g.done ? "gradient-hemo border-transparent" : "border-muted-foreground/40"}`} aria-label="Toggle">
              {g.done && <Check className="h-4 w-4 text-white" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${g.done ? "line-through text-muted-foreground" : "font-medium"}`}>{g.title}</p>
              {g.shared && <p className="text-[10px] uppercase tracking-wider text-primary">shared</p>}
            </div>
            <button onClick={() => remove(g.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          </GlassCard>
        ))}
      </section>
    </div>
  );
}
