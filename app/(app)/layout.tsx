"use client";

import * as React from "react";
import { Navbar } from "@/components/fuega/Navbar";
import { Sidebar, SidebarContent } from "@/components/fuega/sidebar";
import { Footer } from "@/components/fuega/Footer";
import { ErrorBoundary } from "@/components/fuega/error-boundary";
import { ConnectionStatus } from "@/components/fuega/connection-status";
import {
  CommandPalette,
  CommandPaletteProvider,
} from "@/components/fuega/command-palette";
import { Toaster } from "sonner";
import { BottomNav } from "@/components/fuega/bottom-nav";
import { ConsoleEasterEgg } from "@/components/fuega/console-easter-egg";
import { KonamiCode } from "@/components/fuega/konami-code";
import { useAuth } from "@/lib/contexts/auth-context";
import { api, type Campfire } from "@/lib/api/client";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [popularCampfires, setPopularCampfires] = React.useState<
    { name: string; memberCount: number }[]
  >([]);
  const [myCampfires, setMyCampfires] = React.useState<
    { name: string; memberCount: number }[]
  >([]);

  // Fetch popular campfires for sidebar
  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api.get<{ campfires: Campfire[] }>("/api/campfires");
        if (!cancelled) {
          setPopularCampfires(
            data.campfires
              .sort((a, b) => (b.member_count ?? 0) - (a.member_count ?? 0))
              .slice(0, 8)
              .map((c) => ({ name: c.name, memberCount: c.member_count ?? 0 })),
          );
        }
      } catch {
        // Sidebar falls back to empty
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Fetch user's joined campfires for sidebar
  React.useEffect(() => {
    if (!user) {
      setMyCampfires([]);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const data = await api.get<{ campfires: Campfire[] }>("/api/me/campfires");
        if (!cancelled) {
          setMyCampfires(
            data.campfires.map((c) => ({ name: c.name, memberCount: c.member_count ?? 0 })),
          );
        }
      } catch {
        // Falls back to empty
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <CommandPaletteProvider>
    <div className="min-h-screen bg-void flex flex-col">
      <Navbar onOpenSidebar={() => setSidebarOpen(true)} />
      <ConnectionStatus />
      <CommandPalette />
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          className: "bg-coal border-charcoal text-foreground font-mono text-sm",
        }}
      />

      {/* Sidebar drawer (mobile + menu button) */}
      <Sidebar
        campfires={myCampfires.length > 0 ? myCampfires : undefined}
        popularCampfires={popularCampfires.length > 0 ? popularCampfires : undefined}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Spacer for fixed navbar */}
      <div className="h-14" />

      {/* Desktop: persistent sidebar + main content */}
      <div className="flex-1 flex">
        {/* Persistent sidebar — visible on lg+ */}
        <aside aria-label="Sidebar" className="hidden lg:flex lg:w-60 xl:w-64 shrink-0 flex-col border-r border-lava-hot/10 bg-coal/50 sticky top-14 h-[calc(100vh-3.5rem)] overflow-hidden">
          <SidebarContent
            campfires={myCampfires.length > 0 ? myCampfires : undefined}
            popularCampfires={popularCampfires.length > 0 ? popularCampfires : undefined}
          />
        </aside>

        {/* Main content — fills remaining space */}
        <main
          id="main-content"
          className="flex-1 min-w-0 px-3 py-4 sm:px-6 lg:px-8 pb-20 md:pb-4"
          role="main"
        >
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>

      <Footer />

      {/* Mobile bottom navigation */}
      <BottomNav />

      {/* Easter eggs */}
      <ConsoleEasterEgg />
      <KonamiCode />
    </div>
    </CommandPaletteProvider>
  );
}
