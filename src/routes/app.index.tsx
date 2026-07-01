import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSignedUrl } from "@/lib/signed-url";
import { GlassCard } from "@/components/hemo/GlassCard";
import { Heart, Smile, Coffee, Moon, Sparkles, MessageCircleHeart, Clock, Image as ImageIcon, Mic, Play, Camera, UserPlus, Flame, TrendingUp } from "lucide-react";
import { formatDistanceToNowStrict, differenceInDays, format, startOfDay, subDays } from "date-fns";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Home — HEMO" }] }),
  component: Home,
});

const MOOD_SCORES: Record<string, number> = {
  happy: 5, loved: 5, grateful: 5, motivated: 4.5, calm: 4,
  tired: 2.5, "missing you": 2.5, stressed: 2, sad: 1.5, angry: 1,
};

function Home() {
  const { user, profile, couple, partnerProfile } = useAuth();
  const partnerName = partnerProfile?.nickname || partnerProfile?.display_name || "your person";
  const youName = profile?.nickname || profile?.display_name || "you";
  const partnerId = couple?.user_a === user!.id ? couple?.user_b : couple?.user_a;

  const moodQ = useQuery({
    queryKey: ["partner-mood", partnerId], enabled: !!partnerId,
    queryFn: async () => (await supabase.from("moods").select("*").eq("user_id", partnerId!).order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });
  const statusQ = useQuery({
    queryKey: ["partner-status", partnerId], enabled: !!partnerId, refetchInterval: 15000,
    queryFn: async () => (await supabase.from("statuses").select("*").eq("user_id", partnerId!).maybeSingle()).data,
  });
  const lastMsg = useQuery({
    queryKey: ["last-msg", couple?.id], enabled: !!couple?.id,
    queryFn: async () => (await supabase.from("messages").select("*").eq("couple_id", couple!.id).neq("kind", "voice").order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });
  const lastVoice = useQuery({
    queryKey: ["latest-voice", couple?.id], enabled: !!couple?.id,
    queryFn: async () => (await supabase.from("messages").select("*").eq("couple_id", couple!.id).eq("kind", "voice").order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });
  const lastMemory = useQuery({
    queryKey: ["latest-memory", couple?.id], enabled: !!couple?.id,
    queryFn: async () => (await supabase.from("memories").select("*").eq("couple_id", couple!.id).order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });
  const lastReflection = useQuery({
    queryKey: ["latest-reflection", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("reflections").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });
  const todayGoals = useQuery({
    queryKey: ["today-goals", user!.id],
    queryFn: async () => (await supabase.from("goals").select("*").eq("user_id", user!.id).eq("scope", "today").order("created_at", { ascending: false })).data ?? [],
  });
  const moodTrend = useQuery({
    queryKey: ["mood-trend", user?.id], enabled: !!user,
    queryFn: async () => {
      const since = subDays(startOfDay(new Date()), 6).toISOString();
      const { data } = await supabase.from("moods").select("mood,created_at").eq("user_id", user!.id).gte("created_at", since).order("created_at", { ascending: true });
      return data ?? [];
    },
  });
  const checkinDays = useQuery({
    queryKey: ["streak", user?.id], enabled: !!user,
    queryFn: async () => {
      const since = subDays(startOfDay(new Date()), 30).toISOString();
      const { data } = await supabase.from("check_ins").select("created_at").eq("user_id", user!.id).gte("created_at", since);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!partnerId) return;
    const ch = supabase.channel(`home-${partnerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "moods", filter: `user_id=eq.${partnerId}` }, () => void moodQ.refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "statuses", filter: `user_id=eq.${partnerId}` }, () => void statusQ.refetch())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  useEffect(() => {
    if (!couple?.id) return;
    const ch = supabase.channel(`home-couple-${couple.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `couple_id=eq.${couple.id}` }, () => { void lastMsg.refetch(); void lastVoice.refetch(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "memories", filter: `couple_id=eq.${couple.id}` }, () => void lastMemory.refetch())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couple?.id]);

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
  const streak = computeStreak(checkinDays.data ?? []);
  const trendPoints = buildTrend(moodTrend.data ?? []);

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
            {focusing && <span className="absolute -bottom-1 -right-1 rounded-full bg-foreground/90 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-background">focus</span>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Right now</p>
            <p className="truncate font-medium">{statusQ.data?.custom_text || statusQ.data?.activity || (moodQ.data ? `Feeling ${moodQ.data.mood}` : "No update yet")}</p>
            {moodQ.data?.note && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">"{moodQ.data.note}"</p>}
            {moodQ.data && <p className="mt-1 text-xs text-muted-foreground">{formatDistanceToNowStrict(new Date(moodQ.data.created_at))} ago</p>}
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

      {/* Streak + Mood trend */}
      <section className="grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: "160ms" }}>
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Flame className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase tracking-wider">Streak</span>
          </div>
          <p className="mt-1 font-serif text-2xl">{streak} {streak === 1 ? "day" : "days"}</p>
          <p className="text-xs text-muted-foreground">of daily check-ins</p>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase tracking-wider">Mood · 7d</span>
          </div>
          <Sparkline points={trendPoints} />
        </GlassCard>
      </section>

      {/* Quick actions */}
      <section className="grid grid-cols-4 gap-2 animate-fade-up" style={{ animationDelay: "200ms" }}>
        <Quick to="/app/mood" icon={Smile} label="Mood" />
        <Quick to="/app/focus" icon={Sparkles} label="Focus" />
        <Quick to="/app/checkins" icon={Coffee} label="Check-in" />
        <Quick to="/app/night" icon={Moon} label="Night" />
      </section>
      <section className="grid grid-cols-4 gap-2 animate-fade-up" style={{ animationDelay: "220ms" }}>
        <Quick to="/app/memories" icon={Camera} label="Memory" />
        <Quick to="/app/voice" icon={Mic} label="Voice" />
        <Quick to="/app/dreams" icon={Sparkles} label="Dreams" />
        <Quick to="/app/invite" icon={UserPlus} label="Invite" />
      </section>

      {/* Together snap */}
      <section className="grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: "260ms" }}>
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Heart className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase tracking-wider">Together</span>
          </div>
          <p className="mt-1 font-serif text-xl">{days !== null ? `${days} days` : "—"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{couple?.relationship_start ? format(new Date(couple.relationship_start), "MMM d, yyyy") : "Set a start date"}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase tracking-wider">{focusing ? "Focus until" : "Status"}</span>
          </div>
          <p className="mt-1 font-serif text-xl">{focusing && statusQ.data?.focus_until ? format(new Date(statusQ.data.focus_until), "h:mm a") : (statusQ.data?.activity ?? "Free")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{focusing ? "Don't disturb" : "Available"}</p>
        </GlassCard>
      </section>

      {/* Latest memory + voice */}
      {(lastMemory.data || lastVoice.data) && (
        <section className="grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: "300ms" }}>
          {lastMemory.data && <LatestMemoryCard path={lastMemory.data.image_url} caption={lastMemory.data.caption} created={lastMemory.data.created_at} />}
          {lastVoice.data && <LatestVoiceCard duration={lastVoice.data.duration_ms} created={lastVoice.data.created_at} mine={lastVoice.data.sender_id === user!.id} />}
        </section>
      )}

      {/* Latest message */}
      {lastMsg.data && (
        <GlassCard className="animate-fade-up" style={{ animationDelay: "340ms" }}>
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

      {/* Night reflection preview */}
      {lastReflection.data && (
        <Link to="/app/night" className="block animate-fade-up" style={{ animationDelay: "380ms" }}>
          <GlassCard>
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-him text-white"><Moon className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Last reflection</p>
                <p className="mt-0.5 line-clamp-2 text-sm">{lastReflection.data.best_moment || lastReflection.data.grateful_for || lastReflection.data.message || "You reflected. That's the win."}</p>
                <p className="mt-1 text-xs text-muted-foreground">{format(new Date(lastReflection.data.created_at), "MMM d")}</p>
              </div>
            </div>
          </GlassCard>
        </Link>
      )}
    </div>
  );
}

function Quick({ to, icon: Icon, label }: { to: string; icon: typeof Heart; label: string }) {
  return (
    <Link to={to} className="glass flex flex-col items-center gap-1.5 rounded-2xl p-3 transition active:scale-[0.96]">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/50"><Icon className="h-4 w-4" /></span>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

function LatestMemoryCard({ path, caption, created }: { path: string; caption: string | null; created: string }) {
  const { data: url } = useSignedUrl(path);
  return (
    <Link to="/app/memories" className="group relative block aspect-square overflow-hidden rounded-3xl glass">
      {url ? <img src={url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="h-full w-full animate-pulse bg-secondary" />}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <p className="text-[10px] uppercase tracking-wider text-white/70">Latest memory</p>
        {caption ? <p className="line-clamp-1 text-xs text-white">{caption}</p> : <p className="text-xs text-white/70">{format(new Date(created), "MMM d")}</p>}
      </div>
    </Link>
  );
}

function LatestVoiceCard({ duration, created, mine }: { duration: number | null; created: string; mine: boolean }) {
  const sec = Math.round((duration ?? 0) / 1000);
  return (
    <Link to="/app/voice">
      <GlassCard className="flex h-full flex-col justify-between p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mic className="h-3.5 w-3.5" />
          <span className="text-[10px] uppercase tracking-wider">Latest voice</span>
        </div>
        <div className="my-2 flex items-center gap-2">
          <span className={`grid h-11 w-11 place-items-center rounded-full ${mine ? "gradient-her" : "gradient-him text-white"}`}>
            <Play className="h-4 w-4" fill="currentColor" />
          </span>
          <div className="flex h-8 flex-1 items-center gap-[2px]">
            {Array.from({ length: 22 }).map((_, i) => (
              <span key={i} className="w-[3px] rounded-full bg-muted-foreground/40" style={{ height: `${20 + Math.abs(Math.sin(i * 1.7)) * 80}%` }} />
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{Math.floor(sec / 60)}:{(sec % 60).toString().padStart(2, "0")} · {formatDistanceToNowStrict(new Date(created))} ago</p>
      </GlassCard>
    </Link>
  );
}

function Sparkline({ points }: { points: number[] }) {
  if (!points.length) return <p className="mt-2 text-xs text-muted-foreground">No moods yet</p>;
  const w = 100, h = 34;
  const max = 5, min = 1;
  const path = points.map((p, i) => {
    const x = (i / Math.max(1, points.length - 1)) * w;
    const y = h - ((p - min) / (max - min)) * h;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-10 w-full">
      <defs>
        <linearGradient id="sl" x1="0" x2="1">
          <stop offset="0%" stopColor="oklch(0.78 0.14 155)" />
          <stop offset="100%" stopColor="oklch(0.55 0.18 250)" />
        </linearGradient>
      </defs>
      <path d={path} fill="none" stroke="url(#sl)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => {
        const x = (i / Math.max(1, points.length - 1)) * w;
        const y = h - ((p - min) / (max - min)) * h;
        return <circle key={i} cx={x} cy={y} r="1.5" fill="oklch(0.55 0.18 250)" />;
      })}
    </svg>
  );
}

function computeStreak(rows: { created_at: string }[]) {
  const days = new Set(rows.map((r) => startOfDay(new Date(r.created_at)).toISOString()));
  let s = 0;
  for (let i = 0; i < 30; i++) {
    const d = startOfDay(subDays(new Date(), i)).toISOString();
    if (days.has(d)) s++; else if (i > 0) break; else break;
  }
  // if today missing, count from yesterday
  if (s === 0) {
    for (let i = 1; i < 30; i++) {
      const d = startOfDay(subDays(new Date(), i)).toISOString();
      if (days.has(d)) s++; else break;
    }
  }
  return s;
}

function buildTrend(rows: { mood: string; created_at: string }[]) {
  const byDay = new Map<string, number[]>();
  for (const r of rows) {
    const k = startOfDay(new Date(r.created_at)).toISOString();
    const score = MOOD_SCORES[r.mood.toLowerCase()] ?? 3;
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(score);
  }
  const out: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const k = startOfDay(subDays(new Date(), i)).toISOString();
    const arr = byDay.get(k);
    if (arr) out.push(arr.reduce((a, b) => a + b, 0) / arr.length);
  }
  return out;
}
