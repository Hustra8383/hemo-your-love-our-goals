import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { GlassCard } from "@/components/hemo/GlassCard";
import { Heart, Smile, Coffee, Droplets, Dumbbell, BookOpen, Briefcase, Moon, Sparkles, Target, MessageCircleHeart, Clock } from "lucide-react";
import { formatDistanceToNowStrict, differenceInDays, format } from "date-fns";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Home — HEMO" }] }),
  component: Home,
});

function Home() {
  const { user, profile, couple, partnerProfile } = useAuth();
  const partnerName = partnerProfile?.nickname || partnerProfile?.display_name || "your person";
  const youName = profile?.nickname || profile?.display_name || "you";

  // Partner mood
  const partnerId = couple?.user_a === user!.id ? couple?.user_b : couple?.user_a;

  const moodQ = useQuery({
    queryKey: ["partner-mood", partnerId],
    enabled: !!partnerId,
    queryFn: async () => {
      const { data } = await supabase.from("moods").select("*").eq("user_id", partnerId!).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });
  const statusQ = useQuery({
    queryKey: ["partner-status", partnerId],
    enabled: !!partnerId,
    queryFn: async () => {
      const { data } = await supabase.from("statuses").select("*").eq("user_id", partnerId!).maybeSingle();
      return data;
    },
    refetchInterval: 15000,
  });
  const lastMsg = useQuery({
    queryKey: ["last-msg", couple?.id],
    enabled: !!couple?.id,
    queryFn: async () => {
      const { data } = await supabase.from("messages").select("*").eq("couple_id", couple!.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });
  const todayGoals = useQuery({
    queryKey: ["today-goals", user!.id],
    queryFn: async () => {
      const { data } = await supabase.from("goals").select("*").eq("user_id", user!.id).eq("scope", "today").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Realtime: refresh on partner mood or status changes
  useEffect(() => {
    if (!partnerId) return;
    const ch = supabase
      .channel(`home-${partnerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "moods", filter: `user_id=eq.${partnerId}` }, () => { void moodQ.refetch(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "statuses", filter: `user_id=eq.${partnerId}` }, () => { void statusQ.refetch(); })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  const days = couple?.relationship_start ? differenceInDays(new Date(), new Date(couple.relationship_start)) : null;
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "Late night, love";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Good night";
  }, []);

  const focusing = statusQ.data?.focus_until && new Date(statusQ.data.focus_until) > new Date();
  const completedToday = todayGoals.data?.filter((g) => g.done).length ?? 0;
  const totalToday = todayGoals.data?.length ?? 0;
  const todayPct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  return (
    <div className="space-y-4 pb-4">
      {/* Greeting */}
      <section className="px-1 pt-2 animate-fade-up">
        <p className="text-sm text-muted-foreground">{greeting}, {youName}.</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight">
          {focusing ? <>{partnerName} is <span className="text-gradient">building dreams</span></> :
           moodQ.data ? <>{partnerName} feels <span className="text-gradient">{moodQ.data.mood}</span></> :
           <>How is <span className="text-gradient">{partnerName}</span> today?</>}
        </h1>
      </section>

      {/* Partner snapshot */}
      <GlassCard className="animate-fade-up" style={{ animationDelay: "60ms" }}>
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="grid h-16 w-16 place-items-center rounded-2xl gradient-him text-2xl shadow-[var(--shadow-glow-him)]">
              {moodQ.data?.emoji ?? "💙"}
            </div>
            {focusing && (
              <span className="absolute -bottom-1 -right-1 rounded-full bg-foreground/90 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-background">focus</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Right now</p>
            <p className="truncate font-medium">{statusQ.data?.custom_text || statusQ.data?.activity || (moodQ.data ? `Feeling ${moodQ.data.mood}` : "No update yet")}</p>
            {moodQ.data?.note && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">"{moodQ.data.note}"</p>}
            {moodQ.data && (
              <p className="mt-1 text-xs text-muted-foreground">{formatDistanceToNowStrict(new Date(moodQ.data.created_at))} ago</p>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Today progress */}
      <GlassCard className="animate-fade-up" style={{ animationDelay: "120ms" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Today's progress</p>
            <p className="mt-0.5 font-serif text-2xl">{completedToday} / {totalToday || "—"}</p>
          </div>
          <Link to="/app/goals" className="rounded-full bg-secondary/60 px-3 py-1.5 text-xs font-medium">Goals</Link>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary/50">
          <div className="h-full rounded-full gradient-hemo transition-all duration-700" style={{ width: `${todayPct}%` }} />
        </div>
      </GlassCard>

      {/* Quick actions */}
      <section className="grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: "180ms" }}>
        <QuickAction to="/app/mood" icon={Smile} title="Log mood" tint="her" />
        <QuickAction to="/app/focus" icon={Sparkles} title="Start focus" tint="him" />
        <QuickAction to="/app/checkins" icon={Coffee} title="Check-in" tint="her" />
        <QuickAction to="/app/night" icon={Moon} title="Night reflect" tint="him" />
      </section>

      {/* Snapshots row */}
      <section className="grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: "240ms" }}>
        <SnapCard icon={Heart} label="Together" value={days !== null ? `${days} days` : "—"} sub={couple?.relationship_start ? format(new Date(couple.relationship_start), "MMM d, yyyy") : "Set a start date"} />
        <SnapCard icon={Clock} label={focusing ? "Focusing until" : "Status"} value={focusing && statusQ.data?.focus_until ? format(new Date(statusQ.data.focus_until), "h:mm a") : (statusQ.data?.activity ?? "Free")} sub={focusing ? "Don't disturb" : "Available"} />
      </section>

      {/* Latest message */}
      {lastMsg.data && (
        <GlassCard className="animate-fade-up" style={{ animationDelay: "300ms" }}>
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-her">
              <MessageCircleHeart className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Latest message</p>
              <p className="mt-0.5 line-clamp-2 text-sm">{lastMsg.data.body || `${lastMsg.data.kind} message`}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatDistanceToNowStrict(new Date(lastMsg.data.created_at))} ago</p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function QuickAction({ to, icon: Icon, title, tint }: { to: string; icon: typeof Heart; title: string; tint: "her" | "him" }) {
  return (
    <Link to={to} className="glass flex items-center gap-3 rounded-2xl p-4 transition active:scale-[0.98] hover:shadow-[var(--shadow-soft)]">
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${tint === "her" ? "gradient-her" : "gradient-him text-white"}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-sm font-medium">{title}</span>
    </Link>
  );
}

function SnapCard({ icon: Icon, label, value, sub }: { icon: typeof Heart; label: string; value: string; sub?: string }) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 font-serif text-xl tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </GlassCard>
  );
}
