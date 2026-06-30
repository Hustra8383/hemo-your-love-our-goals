import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";

const search = z.object({ mode: z.enum(["signin", "signup"]).default("signin") });

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({ meta: [{ title: "Sign in — HEMO" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const isSignup = mode === "signup";
  const navigate = useNavigate();
  const { user, couple, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user && couple) void navigate({ to: "/app" });
    else if (user) void navigate({ to: "/onboarding" });
  }, [user, couple, authLoading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: name }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Welcome to HEMO");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative grid min-h-dvh place-items-center px-6 py-10">
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full gradient-her opacity-50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full gradient-him opacity-40 blur-3xl" />
      <div className="glass-strong relative w-full max-w-md rounded-4xl p-8 animate-fade-up">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl gradient-hemo">
            <Heart className="h-4 w-4 text-white" fill="currentColor" />
          </span>
          <span className="font-serif text-lg">HEMO</span>
        </div>
        <h1 className="font-serif text-3xl tracking-tight">{isSignup ? "Begin your HEMO" : "Welcome back"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSignup ? "Make space for two. Just you and them." : "Sign in to your quiet space."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          {isSignup && (
            <Field label="Your name">
              <input
                required minLength={1} maxLength={60}
                value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border border-input bg-card/60 px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
                placeholder="What should we call you?" autoComplete="name"
              />
            </Field>
          )}
          <Field label="Email">
            <input
              required type="email" maxLength={255}
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-input bg-card/60 px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@example.com" autoComplete="email"
            />
          </Field>
          <Field label="Password">
            <input
              required type="password" minLength={6} maxLength={72}
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-input bg-card/60 px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
              placeholder="At least 6 characters" autoComplete={isSignup ? "new-password" : "current-password"}
            />
          </Field>

          <button
            type="submit" disabled={submitting}
            className="mt-3 grid w-full place-items-center rounded-2xl gradient-hemo px-6 py-3.5 font-medium text-white shadow-[var(--shadow-soft)] transition active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : isSignup ? "Create my space" : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isSignup ? "Already here? " : "New to HEMO? "}
          <Link
            to="/auth"
            search={{ mode: isSignup ? "signin" : "signup" }}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            {isSignup ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
