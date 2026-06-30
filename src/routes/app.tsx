import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/hemo/AppShell";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  const { user, couple, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user) void navigate({ to: "/auth", search: { mode: "signin" } });
    else if (!couple || !couple.user_b) void navigate({ to: "/onboarding" });
  }, [user, couple, loading, navigate]);

  if (loading || !user || !couple?.user_b) {
    return <div className="grid min-h-dvh place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  return <AppShell><Outlet /></AppShell>;
}
