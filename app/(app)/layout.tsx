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
        // Sidebar falls back to defaults in component
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-void flex flex-col">
      <Navbar />

      {/* Spacer for fixed navbar */}
      <div className="h-14" />

      <div className="flex flex-1">
        <Sidebar
          popularCampfires={popularCampfires.length > 0 ? popularCampfires : undefined}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main
          id="main-content"
          className="flex-1 px-3 py-4 sm:px-6 lg:px-12 2xl:px-8"
          role="main"
        >
          <div className="mx-auto max-w-7xl">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
