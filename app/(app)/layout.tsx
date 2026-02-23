"use client";

import * as React from "react";
import { Navbar } from "@/components/fuega/Navbar";
import { Sidebar } from "@/components/fuega/sidebar";
import { Footer } from "@/components/fuega/Footer";
import { ErrorBoundary } from "@/components/fuega/error-boundary";
import { useAuth } from "@/lib/contexts/auth-context";

const DEMO_CAMPFIRES = [
  { name: "tech", memberCount: 12400 },
  { name: "science", memberCount: 8900 },
  { name: "gaming", memberCount: 15200 },
  { name: "music", memberCount: 6700 },
  { name: "philosophy", memberCount: 3200 },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-void flex flex-col">
      <Navbar />

      {/* Spacer for fixed navbar */}
      <div className="h-14" />

      <div className="flex flex-1">
        <Sidebar
          campfires={user ? DEMO_CAMPFIRES : []}
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
