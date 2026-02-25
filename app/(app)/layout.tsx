"use client";

import * as React from "react";
import { Navbar } from "@/components/fuega/Navbar";
import { Sidebar } from "@/components/fuega/sidebar";
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

      {/* Sidebar drawer */}
      <Sidebar
        popularCampfires={popularCampfires.length > 0 ? popularCampfires : undefined}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Spacer for fixed navbar */}
      <div className="h-14" />

      {/* Centered main content — no persistent sidebar */}
      <main
        id="main-content"
        className="flex-1 w-full px-3 py-4 sm:px-6"
        role="main"
      >
        <div className="mx-auto max-w-2xl">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>

      <Footer />
    </div>
  );
}
