import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { GlassCard } from "@/components/hemo/GlassCard";
import { LogOut, Heart, User2, Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";

export const Route = createFileRoute("/app/profile")({
  head: () => ({ meta: [{ title: "Profile — HEMO" }] }),
  component: Page,
});

function Page() {
  const { user, profile, couple, partnerProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const days = couple?.relationship_start ? differenceInDays(new Date(), new Date(couple.relationship_start)) : null;

  return (
    <div className="space-y-4 pb-4">
      <section className="px-1 pt-2 animate-fade-up">
        <h1 className="font-serif text-3xl tracking-tight">Your space</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </section>

      <GlassCard className="animate-fade-up">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl gradient-her text-2xl">
            {profile?.pronoun_role === "him" ? "💙" : profile?.pronoun_role === "they" ? "🤍" : "💚"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-xl">{profile?.nickname || profile?.display_name || "You"}</p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{profile?.pronoun_role ?? "—"}</p>
          </div>
        </div>
      </GlassCard>

      {partnerProfile && (
        <GlassCard className="animate-fade-up">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Your person</p>
          <div className="mt-2 flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-him text-xl text-white">
              {partnerProfile.pronoun_role === "her" ? "💚" : "💙"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-lg">{partnerProfile.nickname || partnerProfile.display_name}</p>
              {days !== null && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Heart className="h-3 w-3" /> Together {days} days · since {format(new Date(couple!.relationship_start!), "MMM d, yyyy")}
                </p>
              )}
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard className="animate-fade-up">
        <button
          onClick={async () => { await signOut(); void navigate({ to: "/" }); }}
          className="flex w-full items-center gap-3 text-left text-destructive"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-destructive/10"><LogOut className="h-4 w-4" /></span>
          <span className="font-medium">Sign out</span>
        </button>
      </GlassCard>
    </div>
  );
}
