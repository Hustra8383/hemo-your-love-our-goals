import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Heart, Sparkles, ShieldCheck, Sun } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HEMO — a calm space for two" },
      { name: "description", content: "A private emotional companion for two people pursuing ambitious dreams together." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, couple, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user && couple) void navigate({ to: "/app" });
    else if (user && !couple) void navigate({ to: "/onboarding" });
  }, [user, couple, loading, navigate]);

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full gradient-her opacity-50 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full gradient-him opacity-40 blur-3xl animate-float-slow" />

      <div className="relative mx-auto flex min-h-dvh max-w-screen-sm flex-col justify-between px-6 py-10">
        <header className="flex items-center gap-2 animate-fade-up">
          <span className="grid h-10 w-10 place-items-center rounded-2xl gradient-hemo shadow-[var(--shadow-glow-her)]">
            <Heart className="h-5 w-5 text-white" fill="currentColor" />
          </span>
          <span className="font-serif text-xl tracking-tight">HEMO</span>
        </header>

        <main className="flex flex-col gap-8">
          <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">For two of you. Only.</p>
            <h1 className="mt-3 font-serif text-5xl leading-[1.05] tracking-tight sm:text-6xl">
              A quiet place to <span className="text-gradient">grow together</span> without losing focus.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              HEMO is a private companion for couples chasing big dreams. Stay emotionally close, share moods, focus on study and work, and build memories — all without the noise of social media.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 animate-fade-up" style={{ animationDelay: "120ms" }}>
            {[
              { icon: Heart, t: "Feel close, even when apart", d: "Live mood, status, voice notes, and tiny gestures." },
              { icon: Sparkles, t: "Focus without guilt", d: "Focus Mode tells your person you're building dreams." },
              { icon: ShieldCheck, t: "Private by design", d: "Just two accounts. No feed. No ads. Encrypted." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="glass flex items-start gap-3 rounded-2xl p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary/60">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium">{t}</p>
                  <p className="text-sm text-muted-foreground">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </main>

        <footer className="flex flex-col gap-3 pt-8 animate-fade-up" style={{ animationDelay: "180ms" }}>
          <Link
            to="/auth"
            search={{ mode: "signup" as const }}
            className="grid place-items-center rounded-2xl gradient-hemo px-6 py-4 text-base font-medium text-white shadow-[var(--shadow-soft)] transition active:scale-[0.98]"
          >
            Begin your HEMO
          </Link>
          <Link to="/auth" search={{ mode: "signin" as const }} className="grid place-items-center rounded-2xl bg-secondary/60 px-6 py-3 text-sm font-medium">
            I already have an account
          </Link>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Sun className="h-3 w-3" /> A soft, premium space — made with care.
          </p>
        </footer>
      </div>
    </div>
  );
}
