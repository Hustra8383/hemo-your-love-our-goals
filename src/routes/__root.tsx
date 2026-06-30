import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="glass rounded-3xl p-10">
        <p className="font-serif text-5xl text-gradient">404</p>
        <p className="mt-2 text-muted-foreground">This page wandered off.</p>
        <a href="/" className="mt-6 inline-flex rounded-full gradient-hemo px-5 py-2 text-sm font-medium text-white">Go home</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="glass rounded-3xl p-8 max-w-md">
        <h1 className="font-serif text-2xl">Something stumbled</h1>
        <p className="mt-2 text-sm text-muted-foreground">A small breath, then try again.</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-5 rounded-full gradient-hemo px-5 py-2 text-sm font-medium text-white"
        >Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#7dd3a8" },
      { title: "HEMO — a calm space for two" },
      { name: "description", content: "A private emotional companion for two people pursuing ambitious dreams together." },
      { property: "og:title", content: "HEMO" },
      { property: "og:description", content: "A private emotional companion for two." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
