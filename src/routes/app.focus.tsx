import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { GlassCard } from "@/components/hemo/GlassCard";
import { Sparkles, Loader2, BookOpen, Briefcase, Coffee, Bed, Plane, CircleDot } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/app/focus")({
  head: () => ({ meta: [{ title: "Focus — HEMO" }] }),
  component: Page,
});

const ACTIVITIES = [
  { key: "Studying", icon: BookOpen },
  { key: "Working", icon: Briefcase },
  { key: "Eating", icon: Coffee },
  { key: "Sleeping", icon: Bed },
  { key: "Travelling", icon: Plane },
  { key: "Free", icon: CircleDot },
] as const;

const DURATIONS = [25, 45, 60, 90, 120];

function Page() {
  const { user, couple } = useAuth();
  const qc = useQueryClient();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const q = useQuery({
    queryKey: ["my-status", user!.id],
    queryFn: async () => {
      const { data } = await supabase.from("statuses").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const focusing = q.data?.focus_until && new Date(q.data.focus_until).getTime() > now;
  const remaining = focusing ? new Date(q.data!.focus_until!).getTime() - now : 0;
  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);

  async function setActivity(activity: string) {
    const payload = { user_id: user!.id, couple_id: couple?.id ?? null, activity, focus_until: null as string | null };
    const { error } = await supabase.from("statuses").upsert(payload, { onConflict: "user_id" });
    if (error) { toast.error(error.message); return; }
    toast.success(`Status set to ${activity}`);
    void qc.invalidateQueries({ queryKey: ["my-status", user!.id] });
  }

  async function startFocus(min: number) {
    const until = new Date(Date.now() + min * 60_000).toISOString();
    const { error } = await supabase.from("statuses").upsert({
      user_id: user!.id, couple_id: couple?.id ?? null,
      activity: "Focusing", focus_until: until,
    }, { onConflict: "user_id" });
    if (error) { toast.error(error.message); return; }
    toast.success(`Focus on for ${min} min`);
    void qc.invalidateQueries({ queryKey: ["my-status", user!.id] });
  }

  async function endFocus() {
    const { error } = await supabase.from("statuses").upsert({
      user_id: user!.id, couple_id: couple?.id ?? null, activity: "Free", focus_until: null,
    }, { onConflict: "user_id" });
    if (error) { toast.error(error.message); return; }
    toast.success("Focus ended");
    void qc.invalidateQueries({ queryKey: ["my-status", user!.id] });
  }

  return (
    <div className="space-y-4 pb-4">
      <section className="px-1 pt-2 animate-fade-up">
        <p className="text-sm text-muted-foreground">Tell your person</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight">what you're doing</h1>
      </section>

      {/* Focus widget */}
      <GlassCard className="overflow-hidden text-center animate-fade-up">
        <div className="relative mx-auto my-2 grid h-44 w-44 place-items-center">
          <div className={`absolute inset-0 rounded-full gradient-hemo opacity-30 ${focusing ? "animate-breathe" : ""}`} />
          <div className="absolute inset-3 rounded-full bg-background/80 backdrop-blur" />
          <div className="relative">
            {focusing ? (
              <>
                <p className="font-serif text-4xl tabular-nums tracking-tight text-gradient">{String(mm).padStart(2,"0")}:{String(ss).padStart(2,"0")}</p>
                <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">remaining</p>
              </>
            ) : (
              <>
                <Sparkles className="mx-auto h-10 w-10 text-primary" />
                <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">Ready when you are</p>
              </>
            )}
          </div>
        </div>

        {focusing ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">"Don't disturb. Currently building dreams."</p>
            <button onClick={endFocus} className="mx-auto mt-4 inline-flex rounded-full bg-secondary px-6 py-3 text-sm font-medium">End focus</button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Choose a focus duration</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {DURATIONS.map((d) => (
                <button key={d} onClick={() => startFocus(d)} className="rounded-full bg-secondary/60 px-4 py-2 text-sm font-medium transition hover:bg-secondary">
                  {d}m
                </button>
              ))}
            </div>
          </>
        )}
      </GlassCard>

      {/* Activity */}
      <section className="animate-fade-up">
        <p className="px-1 pb-2 text-xs uppercase tracking-wider text-muted-foreground">Or just set an activity</p>
        <div className="grid grid-cols-3 gap-3">
          {ACTIVITIES.map(({ key, icon: Icon }) => {
            const active = q.data?.activity === key && !focusing;
            return (
              <button key={key} onClick={() => setActivity(key)}
                className={`glass flex flex-col items-center gap-1.5 rounded-2xl p-4 text-xs font-medium transition active:scale-[0.96] ${active ? "ring-2 ring-primary/50" : ""}`}>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/60"><Icon className="h-4 w-4" /></span>
                {key}
              </button>
            );
          })}
        </div>
      </section>

      {q.data && (
        <GlassCard className="animate-fade-up">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Current status</p>
          <p className="mt-1 font-serif text-xl">{focusing ? "Focusing" : (q.data.activity ?? "Free")}</p>
          {focusing && q.data.focus_until && (
            <p className="text-xs text-muted-foreground">until {format(new Date(q.data.focus_until), "h:mm a")}</p>
          )}
        </GlassCard>
      )}
    </div>
  );
}
