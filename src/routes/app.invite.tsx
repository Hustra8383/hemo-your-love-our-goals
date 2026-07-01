import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { GlassCard } from "@/components/hemo/GlassCard";
import { Copy, Check, Loader2, Sparkles, Share2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNowStrict } from "date-fns";

export const Route = createFileRoute("/app/invite")({
  head: () => ({ meta: [{ title: "Invite Partner — HEMO" }] }),
  component: Page,
});

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = ""; for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function Page() {
  const { user, couple, partnerProfile } = useAuth();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [working, setWorking] = useState(false);

  const q = useQuery({
    queryKey: ["invite-codes", couple?.id],
    enabled: !!couple?.id,
    queryFn: async () => {
      const { data } = await supabase.from("invite_codes").select("*").eq("couple_id", couple!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const active = q.data?.find((c) => !c.used && new Date(c.expires_at) > new Date());

  async function generate() {
    if (!user || !couple) return;
    setWorking(true);
    const code = makeCode();
    const { error } = await supabase.from("invite_codes").insert({ code, couple_id: couple.id, created_by: user.id });
    setWorking(false);
    if (error) { toast.error(error.message); return; }
    void qc.invalidateQueries({ queryKey: ["invite-codes"] });
    toast.success("New code ready");
  }

  async function copy() {
    if (!active) return;
    await navigator.clipboard.writeText(active.code);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  async function share() {
    if (!active) return;
    const text = `Join me on HEMO 💚💙  Code: ${active.code}`;
    if (navigator.share) {
      try { await navigator.share({ title: "HEMO", text }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text); toast.success("Copied invite text");
    }
  }

  if (partnerProfile) {
    return (
      <div className="space-y-4 pb-4">
        <section className="px-1 pt-2 animate-fade-up">
          <p className="text-sm text-muted-foreground">You're already paired.</p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight">Just the two of you</h1>
        </section>
        <GlassCard className="animate-fade-up text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full gradient-hemo shadow-[var(--shadow-glow-her)] animate-breathe">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <p className="mt-4 font-serif text-xl">You & {partnerProfile.nickname || partnerProfile.display_name}</p>
          <p className="mt-1 text-sm text-muted-foreground">Your world is set. Invite codes aren't needed anymore.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <section className="px-1 pt-2 animate-fade-up">
        <p className="text-sm text-muted-foreground">Bring them into your world.</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight">Invite your person</h1>
      </section>

      <GlassCard className="animate-fade-up text-center">
        {q.isLoading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : active ? (
          <>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Your invite code</p>
            <p className="mt-3 font-mono text-5xl font-bold tracking-[0.3em] text-gradient">{active.code}</p>
            <p className="mt-2 text-xs text-muted-foreground">Expires {formatDistanceToNowStrict(new Date(active.expires_at))} from now</p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={copy} className="rounded-2xl bg-secondary px-4 py-3 text-sm font-medium">
                {copied ? <><Check className="mr-1 inline h-4 w-4" />Copied</> : <><Copy className="mr-1 inline h-4 w-4" />Copy</>}
              </button>
              <button onClick={share} className="rounded-2xl gradient-hemo px-4 py-3 text-sm font-medium text-white">
                <Share2 className="mr-1 inline h-4 w-4" /> Share
              </button>
            </div>
            <button onClick={generate} disabled={working} className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <RefreshCw className="h-3 w-3" /> Generate a new code
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full gradient-hemo">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <p className="mt-3 font-serif text-lg">No active code</p>
            <button onClick={generate} disabled={working} className="mt-4 w-full rounded-2xl gradient-hemo px-4 py-3 font-medium text-white disabled:opacity-60">
              {working ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Create invite code"}
            </button>
          </>
        )}
      </GlassCard>

      <GlassCard className="animate-fade-up">
        <p className="font-serif text-lg">How it works</p>
        <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li><span className="mr-2 font-semibold text-foreground">1.</span> Share the code above with your person.</li>
          <li><span className="mr-2 font-semibold text-foreground">2.</span> They sign up and enter it during onboarding.</li>
          <li><span className="mr-2 font-semibold text-foreground">3.</span> Your worlds sync — instantly and privately.</li>
        </ol>
      </GlassCard>
    </div>
  );
}
