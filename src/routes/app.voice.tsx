import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { uploadTo, useSignedUrl } from "@/lib/signed-url";
import { GlassCard } from "@/components/hemo/GlassCard";
import { Empty } from "@/components/hemo/Empty";
import { Mic, Square, Play, Pause, Heart, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNowStrict } from "date-fns";

export const Route = createFileRoute("/app/voice")({
  head: () => ({ meta: [{ title: "Voice Notes — HEMO" }] }),
  component: Page,
});

type Note = {
  id: string;
  couple_id: string;
  sender_id: string;
  kind: string;
  media_url: string | null;
  duration_ms: number | null;
  reaction: string | null;
  created_at: string;
  body: string | null;
};

function Page() {
  const { user, couple, profile, partnerProfile } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "fav">("all");

  const q = useQuery({
    queryKey: ["voice-notes", couple?.id, filter],
    enabled: !!couple?.id,
    queryFn: async () => {
      let query = supabase.from("messages").select("*").eq("couple_id", couple!.id).eq("kind", "voice");
      if (filter === "fav") query = query.eq("reaction", "❤️");
      const { data } = await query.order("created_at", { ascending: false });
      return (data ?? []) as Note[];
    },
  });

  useEffect(() => {
    if (!couple?.id) return;
    const ch = supabase.channel(`voice-${couple.id}`).on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages", filter: `couple_id=eq.${couple.id}` },
      () => { void qc.invalidateQueries({ queryKey: ["voice-notes"] }); },
    ).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [couple?.id, qc]);

  return (
    <div className="space-y-4 pb-4">
      <section className="px-1 pt-2 animate-fade-up flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Your voice, saved.</p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight">Voice notes</h1>
        </div>
        <div className="glass rounded-full p-1 text-xs">
          <button onClick={() => setFilter("all")} className={`rounded-full px-3 py-1.5 ${filter === "all" ? "gradient-hemo text-white" : ""}`}>All</button>
          <button onClick={() => setFilter("fav")} className={`rounded-full px-3 py-1.5 ${filter === "fav" ? "gradient-hemo text-white" : ""}`}>Loved</button>
        </div>
      </section>

      <Recorder onSaved={() => void qc.invalidateQueries({ queryKey: ["voice-notes"] })} />

      {q.isLoading ? (
        <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !q.data?.length ? (
        <Empty icon={Mic} title="No voice notes yet" hint="Tap and hold to send them a moment of your voice." />
      ) : (
        <div className="space-y-2 animate-fade-up">
          {q.data.map((n) => (
            <NoteRow
              key={n.id}
              n={n}
              mine={n.sender_id === user!.id}
              name={n.sender_id === user!.id ? (profile?.nickname || "You") : (partnerProfile?.nickname || partnerProfile?.display_name || "Them")}
              onChange={() => void qc.invalidateQueries({ queryKey: ["voice-notes"] })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Recorder({ onSaved }: { onSaved: () => void }) {
  const { user, couple } = useAuth();
  const [state, setState] = useState<"idle" | "recording" | "review" | "saving">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        const b = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        setBlob(b); setPreviewUrl(URL.createObjectURL(b)); setState("review");
        streamRef.current?.getTracks().forEach((t) => t.stop());
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        void ctxRef.current?.close();
      };
      recRef.current = rec;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser(); analyser.fftSize = 256;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / buf.length);
        setLevels((l) => [...l.slice(-59), Math.min(1, rms * 3)]);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      startRef.current = Date.now();
      const timer = setInterval(() => {
        const s = Math.floor((Date.now() - startRef.current) / 1000);
        setElapsed(s);
        if (s >= 120) { clearInterval(timer); stop(); }
      }, 250);
      (rec as unknown as { _timer: number })._timer = timer as unknown as number;
      rec.start();
      setState("recording"); setElapsed(0); setLevels([]);
    } catch {
      toast.error("Microphone permission needed");
    }
  }

  function stop() {
    const rec = recRef.current;
    if (!rec) return;
    const t = (rec as unknown as { _timer?: number })._timer;
    if (t) clearInterval(t);
    if (rec.state !== "inactive") rec.stop();
  }

  function discard() {
    setBlob(null); setPreviewUrl(null); setState("idle"); setElapsed(0); setLevels([]);
  }

  async function save() {
    if (!blob || !user || !couple) return;
    setState("saving");
    try {
      const path = await uploadTo(user.id, "voice", blob, "webm");
      const { error } = await supabase.from("messages").insert({
        couple_id: couple.id, sender_id: user.id, kind: "voice",
        media_url: path, duration_ms: elapsed * 1000,
      });
      if (error) throw error;
      toast.success("Sent");
      discard(); onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
      setState("review");
    }
  }

  return (
    <GlassCard className="animate-fade-up">
      {state === "idle" && (
        <button onClick={start} className="flex w-full items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-full gradient-hemo shadow-[var(--shadow-glow-him)] active:scale-95 transition">
            <Mic className="h-6 w-6 text-white" />
          </span>
          <div className="text-left">
            <p className="font-serif text-lg">Record a moment</p>
            <p className="text-xs text-muted-foreground">Up to 2 minutes. They'll hear it right away.</p>
          </div>
        </button>
      )}
      {state === "recording" && (
        <div className="flex items-center gap-4">
          <button onClick={stop} className="grid h-16 w-16 place-items-center rounded-full bg-destructive text-white animate-breathe">
            <Square className="h-5 w-5" fill="currentColor" />
          </button>
          <div className="flex-1">
            <Waveform levels={levels} />
            <p className="mt-2 font-mono text-sm tabular-nums">{fmtTime(elapsed)}</p>
          </div>
        </div>
      )}
      {state === "review" && previewUrl && (
        <div className="space-y-3">
          <audio src={previewUrl} controls className="w-full" />
          <p className="text-xs text-muted-foreground">{fmtTime(elapsed)} · ready to send</p>
          <div className="flex gap-2">
            <button onClick={discard} className="flex-1 rounded-2xl bg-secondary px-4 py-3 text-sm font-medium">Retake</button>
            <button onClick={save} className="flex-1 rounded-2xl gradient-hemo px-4 py-3 text-sm font-medium text-white">Send</button>
          </div>
        </div>
      )}
      {state === "saving" && (
        <div className="grid place-items-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      )}
    </GlassCard>
  );
}

function NoteRow({ n, mine, name, onChange }: { n: Note; mine: boolean; name: string; onChange: () => void }) {
  const { data: url } = useSignedUrl(n.media_url);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  function toggle() {
    const a = audioRef.current; if (!a) return;
    if (a.paused) { void a.play(); } else { a.pause(); }
  }
  async function fav() {
    await supabase.from("messages").update({ reaction: n.reaction === "❤️" ? null : "❤️" }).eq("id", n.id);
    onChange();
  }
  async function remove() {
    if (!mine) return;
    if (n.media_url) await supabase.storage.from("hemo-media").remove([n.media_url]);
    await supabase.from("messages").delete().eq("id", n.id);
    onChange();
  }

  const bars = seededBars(n.id, 32);
  const dur = Math.round((n.duration_ms ?? 0) / 1000);

  return (
    <GlassCard className="p-3">
      <div className="flex items-center gap-3">
        <button onClick={toggle} className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${mine ? "gradient-her" : "gradient-him text-white"} active:scale-95 transition`}>
          {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="text-[10px] text-muted-foreground">{formatDistanceToNowStrict(new Date(n.created_at))} ago</p>
          </div>
          <div className="mt-1.5 flex h-8 items-center gap-[2px]">
            {bars.map((h, i) => {
              const active = i / bars.length < progress;
              return <span key={i} className={`w-[3px] rounded-full transition-colors ${active ? (mine ? "bg-primary" : "bg-[oklch(0.5_0.18_250)]") : "bg-muted-foreground/25"}`} style={{ height: `${h * 100}%` }} />;
            })}
            <span className="ml-2 font-mono text-[10px] tabular-nums text-muted-foreground">{fmtTime(dur)}</span>
          </div>
        </div>
        <button onClick={fav} className={`grid h-8 w-8 place-items-center rounded-full ${n.reaction === "❤️" ? "bg-destructive/15 text-destructive" : "text-muted-foreground"}`}>
          <Heart className="h-3.5 w-3.5" fill={n.reaction === "❤️" ? "currentColor" : "none"} />
        </button>
        {mine && (
          <button onClick={remove} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {url && (
        <audio
          ref={audioRef} src={url} preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setProgress(0); }}
          onTimeUpdate={(e) => { const a = e.currentTarget; setProgress(a.duration ? a.currentTime / a.duration : 0); }}
          className="hidden"
        />
      )}
    </GlassCard>
  );
}

function Waveform({ levels }: { levels: number[] }) {
  return (
    <div className="flex h-10 items-center gap-[2px]">
      {Array.from({ length: 60 }).map((_, i) => {
        const v = levels[i] ?? 0;
        return <span key={i} className="w-[3px] rounded-full gradient-hemo" style={{ height: `${Math.max(6, v * 100)}%` }} />;
      })}
    </div>
  );
}

function seededBars(seed: string, n: number) {
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const out: number[] = [];
  for (let i = 0; i < n; i++) { h = (h * 1103515245 + 12345) | 0; out.push(0.25 + (Math.abs(h % 1000) / 1000) * 0.75); }
  return out;
}

function fmtTime(s: number) { const m = Math.floor(s / 60); const r = s % 60; return `${m}:${r.toString().padStart(2, "0")}`; }
