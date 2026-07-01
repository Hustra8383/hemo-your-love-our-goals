import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { GlassCard } from "@/components/hemo/GlassCard";
import { Empty } from "@/components/hemo/Empty";
import { Sparkles, Plus, Loader2, Trash2, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { differenceInCalendarDays, format } from "date-fns";

export const Route = createFileRoute("/app/dreams")({
  head: () => ({ meta: [{ title: "Dream Board — HEMO" }] }),
  component: Page,
});

type Dream = {
  id: string; user_id: string; couple_id: string | null;
  title: string; description: string | null; emoji: string | null;
  progress: number; done: boolean; shared: boolean;
  due_date: string | null; scope: string; created_at: string;
};

const EMOJIS = ["🚀","🎓","💰","🏡","💍","🌍","✨","📚","🏆","💪","🎨","🧘","💼","🌟"];

function Page() {
  const { user, couple } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const q = useQuery({
    queryKey: ["dreams", user?.id, couple?.id],
    enabled: !!user,
    queryFn: async () => {
      const orFilter = couple?.id ? `user_id.eq.${user!.id},couple_id.eq.${couple.id}` : `user_id.eq.${user!.id}`;
      const { data } = await supabase.from("goals").select("*").eq("scope", "dream").or(orFilter).order("done", { ascending: true }).order("due_date", { ascending: true, nullsFirst: false });
      return (data ?? []) as Dream[];
    },
  });

  async function updateProgress(d: Dream, p: number) {
    const done = p >= 100;
    await supabase.from("goals").update({ progress: p, done }).eq("id", d.id);
    if (done && !d.done) toast.success("🎉 A dream came true");
    void qc.invalidateQueries({ queryKey: ["dreams"] });
  }
  async function remove(d: Dream) {
    await supabase.from("goals").delete().eq("id", d.id);
    void qc.invalidateQueries({ queryKey: ["dreams"] });
  }

  const active = (q.data ?? []).filter((d) => !d.done);
  const done = (q.data ?? []).filter((d) => d.done);

  return (
    <div className="space-y-4 pb-4">
      <section className="px-1 pt-2 animate-fade-up">
        <p className="text-sm text-muted-foreground">The bigger picture.</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight">Dream board</h1>
      </section>

      <button onClick={() => setOpen(true)} className="glass flex w-full items-center gap-3 rounded-2xl p-4 animate-fade-up active:scale-[0.99] transition">
        <span className="grid h-10 w-10 place-items-center rounded-xl gradient-hemo"><Plus className="h-4 w-4 text-white" /></span>
        <span className="text-sm font-medium">Add a dream</span>
      </button>

      {q.isLoading ? (
        <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !q.data?.length ? (
        <Empty icon={Sparkles} title="Dream out loud" hint="JEE, ChatGro, Hasmol, a home together — put it down." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 animate-fade-up sm:grid-cols-2">
            {active.map((d) => <DreamCard key={d.id} d={d} onProgress={(p) => updateProgress(d, p)} onDelete={() => remove(d)} mine={d.user_id === user!.id} />)}
          </div>
          {done.length > 0 && (
            <section className="animate-fade-up">
              <p className="px-1 pb-2 pt-4 text-xs uppercase tracking-wider text-muted-foreground">Achieved</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {done.map((d) => <DreamCard key={d.id} d={d} onProgress={(p) => updateProgress(d, p)} onDelete={() => remove(d)} mine={d.user_id === user!.id} />)}
              </div>
            </section>
          )}
        </>
      )}

      {open && <NewDreamSheet onClose={() => setOpen(false)} onSaved={() => { setOpen(false); void qc.invalidateQueries({ queryKey: ["dreams"] }); }} />}
    </div>
  );
}

function DreamCard({ d, onProgress, onDelete, mine }: { d: Dream; onProgress: (p: number) => void; onDelete: () => void; mine: boolean }) {
  const days = d.due_date ? differenceInCalendarDays(new Date(d.due_date), new Date()) : null;
  return (
    <GlassCard className={`relative overflow-hidden ${d.done ? "opacity-80" : ""}`}>
      {d.done && <div className="pointer-events-none absolute inset-0 gradient-hemo opacity-10" />}
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{d.emoji || "✨"}</span>
            {d.shared && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Shared</span>}
            {d.done && <Trophy className="h-4 w-4 text-primary" />}
          </div>
          <p className="mt-1.5 font-serif text-lg leading-snug">{d.title}</p>
          {d.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{d.description}</p>}
        </div>
        {mine && (
          <button onClick={onDelete} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="relative mt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Progress</span>
          <span className="font-mono text-sm font-medium tabular-nums">{d.progress}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary/50">
          <div className="h-full rounded-full gradient-hemo transition-all duration-700" style={{ width: `${d.progress}%` }} />
        </div>
        {mine && (
          <input
            type="range" min={0} max={100} step={5} value={d.progress}
            onChange={(e) => onProgress(Number(e.target.value))}
            className="mt-2 w-full accent-[oklch(0.55_0.18_250)]"
          />
        )}
      </div>

      {d.due_date && (
        <div className="relative mt-3 flex items-center justify-between rounded-2xl bg-secondary/40 px-3 py-2 text-xs">
          <span className="text-muted-foreground">{format(new Date(d.due_date), "MMM d, yyyy")}</span>
          <span className={`font-medium ${days !== null && days < 30 ? "text-destructive" : ""}`}>
            {days === null ? "" : days > 0 ? `${days} days to go` : days === 0 ? "Today!" : `${-days} days past`}
          </span>
        </div>
      )}
    </GlassCard>
  );
}

function NewDreamSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user, couple } = useAuth();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [due, setDue] = useState("");
  const [shared, setShared] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) { toast.error("Give it a name"); return; }
    setSaving(true);
    const { error } = await supabase.from("goals").insert({
      user_id: user!.id, couple_id: shared ? couple?.id ?? null : null,
      title: title.trim(), description: desc.trim() || null, emoji, shared,
      scope: "dream", due_date: due || null, progress: 0,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong m-3 w-full max-w-md rounded-3xl p-5 animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-serif text-xl">New dream</p>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-secondary"><X className="h-4 w-4" /></button>
        </div>

        <input
          autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80}
          placeholder="Crack JEE Advanced"
          className="w-full rounded-2xl border border-input bg-card/60 px-4 py-3 font-serif text-lg outline-none focus:ring-2 focus:ring-ring"
        />
        <textarea
          value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={240} rows={2}
          placeholder="Why does this matter?"
          className="mt-2 w-full resize-none rounded-2xl border border-input bg-card/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="mt-3 flex flex-wrap gap-1.5">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setEmoji(e)} className={`grid h-9 w-9 place-items-center rounded-xl text-lg transition ${emoji === e ? "gradient-hemo scale-110" : "bg-secondary/60"}`}>{e}</button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="rounded-2xl bg-secondary/40 p-3">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Target date</span>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="mt-1 w-full bg-transparent text-sm outline-none" />
          </label>
          <button onClick={() => setShared(!shared)} className={`rounded-2xl p-3 text-left transition ${shared ? "gradient-hemo text-white" : "bg-secondary/40"}`}>
            <span className={`text-[10px] uppercase tracking-wider ${shared ? "text-white/80" : "text-muted-foreground"}`}>Visibility</span>
            <p className="mt-1 text-sm font-medium">{shared ? "Shared with them" : "Just for you"}</p>
          </button>
        </div>

        <button onClick={save} disabled={saving} className="mt-4 w-full rounded-2xl gradient-hemo px-4 py-3.5 font-medium text-white disabled:opacity-60">
          {saving ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Add to dream board"}
        </button>
      </div>
    </div>
  );
}
