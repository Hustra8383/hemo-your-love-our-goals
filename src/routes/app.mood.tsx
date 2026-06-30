import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { GlassCard } from "@/components/hemo/GlassCard";
import { Empty } from "@/components/hemo/Empty";
import { Smile, Loader2 } from "lucide-react";
import { formatDistanceToNowStrict, format, startOfDay, subDays, isSameDay } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/app/mood")({
  head: () => ({ meta: [{ title: "Mood — HEMO" }] }),
  component: Mood,
});

const MOODS = [
  { key: "happy", emoji: "😊", label: "Happy" },
  { key: "calm", emoji: "😌", label: "Calm" },
  { key: "loved", emoji: "😍", label: "Loved" },
  { key: "grateful", emoji: "🥰", label: "Grateful" },
  { key: "motivated", emoji: "💪", label: "Motivated" },
  { key: "missing you", emoji: "🥺", label: "Missing you" },
  { key: "tired", emoji: "😴", label: "Tired" },
  { key: "stressed", emoji: "😵", label: "Stressed" },
  { key: "sad", emoji: "😭", label: "Sad" },
  { key: "angry", emoji: "😡", label: "Angry" },
] as const;

function Mood() {
  const { user, couple } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const history = useQuery({
    queryKey: ["moods", user!.id],
    queryFn: async () => {
      const { data } = await supabase.from("moods").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(60);
      return data ?? [];
    },
  });

  async function save() {
    if (!selected) return;
    const m = MOODS.find((x) => x.key === selected)!;
    setSaving(true);
    const { error } = await supabase.from("moods").insert({
      user_id: user!.id, couple_id: couple?.id ?? null,
      mood: m.key, emoji: m.emoji, note: note.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Mood saved 🤍");
    setSelected(null); setNote("");
    void qc.invalidateQueries({ queryKey: ["moods", user!.id] });
    void qc.invalidateQueries({ queryKey: ["partner-mood"] });
  }

  // 7-day trend (count by day)
  const last7 = Array.from({ length: 7 }).map((_, i) => startOfDay(subDays(new Date(), 6 - i)));
  const counts = last7.map((d) => (history.data ?? []).filter((m) => isSameDay(new Date(m.created_at), d)).length);
  const max = Math.max(1, ...counts);

  return (
    <div className="space-y-4 pb-4">
      <section className="px-1 pt-2 animate-fade-up">
        <p className="text-sm text-muted-foreground">How do you feel</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight">right now?</h1>
      </section>

      <GlassCard className="animate-fade-up">
        <div className="grid grid-cols-5 gap-2">
          {MOODS.map((m) => (
            <button
              key={m.key} onClick={() => setSelected(m.key)}
              className={`flex flex-col items-center gap-1 rounded-2xl p-3 text-[10px] font-medium transition ${
                selected === m.key ? "gradient-hemo text-white shadow-[var(--shadow-soft)] scale-[1.05]" : "bg-secondary/40 hover:bg-secondary/70"
              }`}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className="leading-tight">{m.label}</span>
            </button>
          ))}
        </div>

        {selected && (
          <div className="mt-4 animate-fade-up">
            <textarea
              value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3}
              placeholder="A line about it (optional)…"
              className="w-full resize-none rounded-2xl border border-input bg-card/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button onClick={save} disabled={saving} className="mt-3 grid w-full place-items-center rounded-2xl gradient-hemo px-6 py-3 font-medium text-white disabled:opacity-60">
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save mood"}
            </button>
          </div>
        )}
      </GlassCard>

      {/* Trend */}
      <GlassCard className="animate-fade-up">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Last 7 days</p>
        <div className="mt-3 flex h-24 items-end gap-2">
          {counts.map((c, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end">
                <div className="w-full rounded-t-lg gradient-hemo transition-all duration-500" style={{ height: `${(c / max) * 100}%`, minHeight: c > 0 ? "8%" : "2%" }} />
              </div>
              <span className="text-[10px] text-muted-foreground">{format(last7[i], "EEEEE")}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* History */}
      <section className="animate-fade-up">
        <p className="px-1 pb-2 text-xs uppercase tracking-wider text-muted-foreground">Your mood journal</p>
        {history.isLoading ? (
          <GlassCard className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></GlassCard>
        ) : !history.data?.length ? (
          <Empty icon={Smile} title="No moods yet" hint="Tap a feeling above — your journal begins now." />
        ) : (
          <div className="space-y-2">
            {history.data.map((m) => (
              <GlassCard key={m.id} className="flex items-start gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary/60 text-xl">{m.emoji ?? "💭"}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium capitalize">{m.mood}</p>
                  {m.note && <p className="mt-0.5 text-sm text-muted-foreground">{m.note}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{formatDistanceToNowStrict(new Date(m.created_at))} ago</p>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
