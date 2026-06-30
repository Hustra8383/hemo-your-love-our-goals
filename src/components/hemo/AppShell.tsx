import { Link, useRouterState } from "@tanstack/react-router";
import { Heart, Home, Smile, Target, Moon, User2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tab = { to: string; label: string; icon: typeof Home; exact?: boolean };
const tabs: Tab[] = [
  { to: "/app", label: "Home", icon: Home, exact: true },
  { to: "/app/mood", label: "Mood", icon: Smile },
  { to: "/app/focus", label: "Focus", icon: Sparkles },
  { to: "/app/goals", label: "Goals", icon: Target },
  { to: "/app/night", label: "Night", icon: Moon },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col pb-28 sm:max-w-screen-md">
      <header className="sticky top-0 z-40 px-4 pt-6 pb-3">
        <div className="glass flex items-center justify-between rounded-full px-4 py-2.5">
          <Link to="/app" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full gradient-hemo shadow-[var(--shadow-glow-her)]">
              <Heart className="h-4 w-4 text-white" fill="currentColor" />
            </span>
            <span className="font-serif text-lg font-semibold tracking-tight">HEMO</span>
          </Link>
          <Link
            to="/app/profile"
            className="grid h-9 w-9 place-items-center rounded-full bg-secondary/70 text-secondary-foreground transition hover:bg-secondary"
            aria-label="Profile"
          >
            <User2 className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 pt-2">{children}</main>

      <nav className="fixed inset-x-0 bottom-3 z-40 mx-auto w-[min(100%-1.5rem,32rem)]">
        <div className="glass flex items-center justify-between gap-1 rounded-full p-1.5">
          {tabs.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? pathname === to : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to as never}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-2 text-[10px] font-medium transition-all duration-300",
                  active
                    ? "gradient-hemo text-white shadow-[var(--shadow-glow-him)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-label={label}
              >
                <Icon className={cn("h-[18px] w-[18px] transition-transform", active && "scale-110")} strokeWidth={active ? 2.5 : 2} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
