import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Heart, Loader2, Copy, Check, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Set up HEMO" }] }),
  component: Onboarding,
});

type Step = "welcome" | "profile" | "pair" | "details" | "done";

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function Onboarding() {
  const { user, profile, couple, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("welcome");

  useEffect(() => {
    if (loading || !user) return;
    if (couple?.user_b) void navigate({ to: "/app" });
  }, [couple, loading, user, navigate]);

  useEffect(() => {
    if (!user) {
      if (!loading) void navigate({ to: "/auth", search: { mode: "signup" } });
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="grid min-h-dvh place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full gradient-her opacity-50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full gradient-him opacity-40 blur-3xl" />
      <div className="relative mx-auto flex min-h-dvh max-w-screen-sm flex-col px-6 py-10">
        <header className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl gradient-hemo">
            <Heart className="h-4 w-4 text-white" fill="currentColor" />
          </span>
          <span className="font-serif text-lg">HEMO</span>
          <div className="ml-auto flex gap-1.5">
            {(["welcome","profile","pair","details","done"] as Step[]).map((s) => (
              <span key={s} className={`h-1.5 w-6 rounded-full transition ${s === step ? "gradient-hemo" : "bg-secondary"}`} />
            ))}
          </div>
        </header>

        <div className="flex-1 pt-10">
          {step === "welcome" && <Welcome onNext={() => setStep("profile")} name={profile?.display_name ?? null} />}
          {step === "profile" && <ProfileStep onNext={() => setStep("pair")} />}
          {step === "pair" && <PairStep userId={user.id} onPaired={async () => { await refresh(); setStep("details"); }} />}
          {step === "details" && couple && <DetailsStep coupleId={couple.id} onDone={async () => { await refresh(); setStep("done"); }} />}
          {step === "done" && <DoneStep onGo={() => navigate({ to: "/app" })} />}
        </div>
      </div>
    </div>
  );
}

function Welcome({ onNext, name }: { onNext: () => void; name: string | null }) {
  return (
    <div className="animate-fade-up text-center">
      <div className="mx-auto mb-8 grid h-28 w-28 place-items-center rounded-full gradient-hemo shadow-[var(--shadow-glow-her)] animate-breathe">
        <Heart className="h-12 w-12 text-white" fill="currentColor" />
      </div>
      <h1 className="font-serif text-4xl tracking-tight">Hi {name ?? "there"}.</h1>
      <p className="mx-auto mt-3 max-w-sm text-muted-foreground">
        HEMO is a little world for two. Let's set it up — it takes under a minute.
      </p>
      <button onClick={onNext} className="mx-auto mt-10 inline-flex items-center gap-2 rounded-2xl gradient-hemo px-6 py-3.5 font-medium text-white shadow-[var(--shadow-soft)]">
        Let's begin <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function ProfileStep({ onNext }: { onNext: () => void }) {
  const { user, profile, refresh } = useAuth();
  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [role, setRole] = useState<"her" | "him" | "they">(profile?.pronoun_role ?? "her");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ nickname: nickname || null, pronoun_role: role }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await refresh();
    onNext();
  }

  return (
    <div className="animate-fade-up">
      <h2 className="font-serif text-3xl">Who are you, to them?</h2>
      <p className="mt-2 text-muted-foreground">A nickname they call you, and which side of the palette is yours.</p>

      <label className="mt-8 block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Your nickname</span>
        <input
          value={nickname} maxLength={40} onChange={(e) => setNickname(e.target.value)}
          placeholder="love, sunshine, jaan…"
          className="w-full rounded-2xl border border-input bg-card/60 px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {(["her","him","they"] as const).map((r) => (
          <button
            key={r} onClick={() => setRole(r)}
            className={`rounded-2xl px-4 py-3 text-sm font-medium capitalize transition ${
              role === r ? (r === "her" ? "gradient-her text-foreground shadow-[var(--shadow-glow-her)]" : r === "him" ? "gradient-him text-white shadow-[var(--shadow-glow-him)]" : "gradient-hemo text-white") : "bg-secondary/60 text-muted-foreground"
            }`}
          >{r === "they" ? "them" : r}</button>
        ))}
      </div>

      <button onClick={save} disabled={saving} className="mt-10 grid w-full place-items-center rounded-2xl gradient-hemo px-6 py-3.5 font-medium text-white shadow-[var(--shadow-soft)] disabled:opacity-60">
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue"}
      </button>
    </div>
  );
}

function PairStep({ userId, onPaired }: { userId: string; onPaired: () => void | Promise<void> }) {
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [code, setCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setWorking(true);
    try {
      const { data: existing } = await supabase.from("couples").select("*").or(`user_a.eq.${userId},user_b.eq.${userId}`).maybeSingle();
      let coupleId = existing?.id as string | undefined;
      if (!coupleId) {
        const { data: c, error: ce } = await supabase.from("couples").insert({ user_a: userId }).select("id").single();
        if (ce) throw ce;
        coupleId = c.id;
      }
      const newCode = makeCode();
      const { error } = await supabase.from("invite_codes").insert({ code: newCode, couple_id: coupleId, created_by: userId });
      if (error) throw error;
      setCode(newCode);
      setMode("create");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create code");
    } finally { setWorking(false); }
  }

  async function poll() {
    const { data: c } = await supabase.from("couples").select("*").or(`user_a.eq.${userId},user_b.eq.${userId}`).maybeSingle();
    if (c?.user_b) await onPaired();
  }

  useEffect(() => {
    if (mode !== "create" || !code) return;
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, code]);

  async function join() {
    if (joinCode.trim().length < 4) { toast.error("Enter the full code"); return; }
    setWorking(true);
    try {
      const cleaned = joinCode.trim().toUpperCase();
      const { data: invite, error: ie } = await supabase
        .from("invite_codes").select("*").eq("code", cleaned).eq("used", false).maybeSingle();
      if (ie) throw ie;
      if (!invite) throw new Error("Code not found or already used");
      if (new Date(invite.expires_at) < new Date()) throw new Error("This code has expired");
      if (invite.created_by === userId) throw new Error("That's your own code — share it with your person");

      const { error: ue } = await supabase.from("couples").update({ user_b: userId }).eq("id", invite.couple_id).is("user_b", null);
      if (ue) throw ue;
      const { error: ic } = await supabase.from("invite_codes").update({ used: true }).eq("code", cleaned);
      if (ic) throw ic;
      toast.success("Paired! Welcome to your space.");
      await onPaired();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't pair");
    } finally { setWorking(false); }
  }

  if (mode === "choose") {
    return (
      <div className="animate-fade-up">
        <h2 className="font-serif text-3xl">Pair with your person</h2>
        <p className="mt-2 text-muted-foreground">One of you creates a code, the other enters it. That's it.</p>

        <div className="mt-8 space-y-3">
          <button onClick={generate} disabled={working} className="glass flex w-full items-center gap-4 rounded-2xl p-5 text-left transition hover:shadow-[var(--shadow-soft)] disabled:opacity-60">
            <span className="grid h-12 w-12 place-items-center rounded-2xl gradient-her">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">Create an invite code</p>
              <p className="text-sm text-muted-foreground">Share it with them. Expires in 7 days.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button onClick={() => setMode("join")} className="glass flex w-full items-center gap-4 rounded-2xl p-5 text-left transition hover:shadow-[var(--shadow-soft)]">
            <span className="grid h-12 w-12 place-items-center rounded-2xl gradient-him text-white">
              <ArrowRight className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">I have a code</p>
              <p className="text-sm text-muted-foreground">Enter the code your person shared.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }

  if (mode === "create" && code) {
    return (
      <div className="animate-fade-up text-center">
        <h2 className="font-serif text-3xl">Your invite code</h2>
        <p className="mt-2 text-muted-foreground">Send this to your person. We'll connect you the moment they enter it.</p>
        <div className="mx-auto mt-10 glass-strong inline-flex rounded-3xl px-8 py-6">
          <span className="font-serif text-5xl tracking-[0.4em] text-gradient">{code}</span>
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={async () => { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="inline-flex items-center gap-2 rounded-2xl bg-secondary/60 px-5 py-3 text-sm font-medium"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
          </button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button onClick={() => navigator.share?.({ title: "Join me on HEMO", text: `My HEMO invite code: ${code}` })} className="inline-flex items-center gap-2 rounded-2xl gradient-hemo px-5 py-3 text-sm font-medium text-white">
              Share
            </button>
          )}
        </div>
        <p className="mt-10 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Waiting for them to join…
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <h2 className="font-serif text-3xl">Enter your code</h2>
      <p className="mt-2 text-muted-foreground">The 6-character code they shared.</p>
      <input
        value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={8}
        className="mt-8 w-full rounded-2xl border border-input bg-card/60 px-4 py-5 text-center font-serif text-3xl tracking-[0.4em] outline-none focus:ring-2 focus:ring-ring"
        placeholder="ABCDEF" autoCapitalize="characters" autoCorrect="off"
      />
      <button onClick={join} disabled={working} className="mt-6 grid w-full place-items-center rounded-2xl gradient-hemo px-6 py-3.5 font-medium text-white shadow-[var(--shadow-soft)] disabled:opacity-60">
        {working ? <Loader2 className="h-5 w-5 animate-spin" /> : "Connect us"}
      </button>
      <button onClick={() => setMode("choose")} className="mt-3 w-full rounded-2xl bg-secondary/60 px-6 py-3 text-sm font-medium">Back</button>
    </div>
  );
}

function DetailsStep({ coupleId, onDone }: { coupleId: string; onDone: () => void | Promise<void> }) {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [her, setHer] = useState("");
  const [him, setHim] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("couples").update({
      relationship_start: date, her_nickname: her || null, him_nickname: him || null,
    }).eq("id", coupleId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await onDone();
  }

  return (
    <div className="animate-fade-up">
      <h2 className="font-serif text-3xl">A few sweet details</h2>
      <p className="mt-2 text-muted-foreground">For your relationship timeline. You can change these anytime.</p>

      <div className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">The day it began</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-2xl border border-input bg-card/60 px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Her nickname</span>
            <input value={her} maxLength={40} onChange={(e) => setHer(e.target.value)} placeholder="optional" className="w-full rounded-2xl border border-input bg-card/60 px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">His nickname</span>
            <input value={him} maxLength={40} onChange={(e) => setHim(e.target.value)} placeholder="optional" className="w-full rounded-2xl border border-input bg-card/60 px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
          </label>
        </div>
      </div>

      <button onClick={save} disabled={saving} className="mt-10 grid w-full place-items-center rounded-2xl gradient-hemo px-6 py-3.5 font-medium text-white shadow-[var(--shadow-soft)] disabled:opacity-60">
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue"}
      </button>
    </div>
  );
}

function DoneStep({ onGo }: { onGo: () => void }) {
  return (
    <div className="animate-fade-up text-center">
      <div className="mx-auto mb-6 grid h-32 w-32 place-items-center rounded-full gradient-hemo shadow-[var(--shadow-glow-her)] animate-breathe">
        <Heart className="h-14 w-14 text-white" fill="currentColor" />
      </div>
      <h2 className="font-serif text-4xl tracking-tight">You're in.</h2>
      <p className="mx-auto mt-3 max-w-sm text-muted-foreground">Your quiet little world for two is ready.</p>
      <button onClick={onGo} className="mx-auto mt-10 inline-flex items-center gap-2 rounded-2xl gradient-hemo px-7 py-4 text-base font-medium text-white shadow-[var(--shadow-soft)]">
        Open HEMO <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
