"use client";

import * as React from "react";
import { Navbar } from "@/components/fuega/Navbar";
import { Sidebar, SidebarContent } from "@/components/fuega/sidebar";
import { Footer } from "@/components/fuega/Footer";
import { ErrorBoundary } from "@/components/fuega/error-boundary";
import { useAuth } from "@/lib/contexts/auth-context";
import { api, type Campfire } from "@/lib/api/client";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [popularCampfires, setPopularCampfires] = React.useState<
    { name: string; memberCount: number }[]
  >([]);

  // Fetch real campfires for sidebar
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

  return (
    <div className="min-h-screen bg-void flex flex-col">
      <Navbar onOpenSidebar={() => setSidebarOpen(true)} />

      {/* Sidebar drawer (mobile + menu button) */}
      <Sidebar
        popularCampfires={popularCampfires.length > 0 ? popularCampfires : undefined}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Spacer for fixed navbar */}
      <div className="h-14" />

      {/* Desktop: persistent sidebar + main content */}
      <div className="flex-1 flex">
        {/* Persistent sidebar — visible on lg+ */}
        <aside className="hidden lg:flex lg:w-60 xl:w-64 shrink-0 flex-col border-r border-lava-hot/10 bg-coal/50 sticky top-14 h-[calc(100vh-3.5rem)] overflow-hidden">
          <SidebarContent
            popularCampfires={popularCampfires.length > 0 ? popularCampfires : undefined}
          />
        </aside>

        {/* Main content — fills remaining space */}
        <main
          id="main-content"
          className="flex-1 min-w-0 px-3 py-4 sm:px-6 lg:px-8"
          role="main"
        >
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>

      <Footer />
    </div>
  );
}
