import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { GlassCard } from "@/components/hemo/GlassCard";
import { Moon, Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/app/night")({
  head: () => ({ meta: [{ title: "Night reflection — HEMO" }] }),
  component: Page,
});

const FIELDS = [
  { key: "best_moment", label: "Best moment", placeholder: "What made today shine?" },
  { key: "hardest_moment", label: "Hardest moment", placeholder: "What weighed on you?" },
  { key: "grateful_for", label: "Grateful for", placeholder: "Anything, big or small." },
  { key: "achievement", label: "Today's achievement", placeholder: "Even one small win counts." },
  { key: "improve", label: "One thing to improve", placeholder: "Soft and honest." },
  { key: "message", label: "Message before sleeping", placeholder: "For your person to read." },
] as const;

type Field = (typeof FIELDS)[number]["key"];

function Page() {
  const { user, couple } = useAuth();
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [values, setValues] = useState<Record<Field, string>>({ best_moment:"", hardest_moment:"", grateful_for:"", achievement:"", improve:"", message:"" });
  const [saving, setSaving] = useState(false);

  const q = useQuery({
    queryKey: ["reflection", user!.id, today],
    queryFn: async () => {
      const { data } = await supabase.from("reflections").select("*").eq("user_id", user!.id).eq("for_date", today).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (q.data) {
      setValues({
        best_moment: q.data.best_moment ?? "", hardest_moment: q.data.hardest_moment ?? "",
        grateful_for: q.data.grateful_for ?? "", achievement: q.data.achievement ?? "",
        improve: q.data.improve ?? "", message: q.data.message ?? "",
      });
    }
  }, [q.data]);

  // Partner's reflection for today (read only)
  const partnerId = couple?.user_a === user!.id ? couple?.user_b : couple?.user_a;
  const partnerRef = useQuery({
    queryKey: ["partner-reflection", partnerId, today],
    enabled: !!partnerId,
    queryFn: async () => {
      const { data } = await supabase.from("reflections").select("*").eq("user_id", partnerId!).eq("for_date", today).maybeSingle();
      return data;
    },
  });

  async function save() {
    setSaving(true);
    const payload = { ...values, user_id: user!.id, couple_id: couple?.id ?? null, for_date: today };
    const { error } = await supabase.from("reflections").upsert(payload, { onConflict: "user_id,for_date" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved 🌙");
    void qc.invalidateQueries({ queryKey: ["reflection", user!.id, today] });
  }

  return (
    <div className="space-y-4 pb-4">
      <section className="px-1 pt-2 animate-fade-up">
        <p className="text-sm text-muted-foreground">Before you sleep</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight">A soft night reflection</h1>
      </section>

      <GlassCard className="animate-fade-up text-center">
        <Moon className="mx-auto h-8 w-8 text-primary animate-float-slow" />
        <p className="mt-2 font-serif text-lg">{format(new Date(), "EEEE, MMMM d")}</p>
        <p className="text-xs text-muted-foreground">Six gentle questions. Answer the ones that feel right.</p>
      </GlassCard>

      {FIELDS.map((f) => (
        <GlassCard key={f.key} className="animate-fade-up">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{f.label}</span>
            <textarea
              value={values[f.key]} maxLength={500} rows={2}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="mt-2 w-full resize-none rounded-2xl border border-input bg-card/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </GlassCard>
      ))}

      <button onClick={save} disabled={saving} className="grid w-full place-items-center rounded-2xl gradient-hemo px-6 py-3.5 font-medium text-white shadow-[var(--shadow-soft)] disabled:opacity-60">
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save reflection"}
      </button>

      {partnerRef.data?.message && (
        <GlassCard className="animate-fade-up">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> A message from your person
          </div>
          <p className="mt-2 font-serif text-lg italic">"{partnerRef.data.message}"</p>
        </GlassCard>
      )}
    </div>
  );
}
