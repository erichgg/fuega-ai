"use client";

import * as React from "react";
import { Header } from "@/components/fuega/header";
import { Sidebar } from "@/components/fuega/sidebar";
import { ErrorBoundary } from "@/components/fuega/error-boundary";
import { useAuth } from "@/lib/contexts/auth-context";

const DEMO_COMMUNITIES = [
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
    <div className="min-h-screen bg-background">
      <Header
        user={user ? { username: user.username, sparkScore: user.sparkScore } : null}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="flex">
        <Sidebar
          communities={user ? DEMO_COMMUNITIES : []}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 px-4 py-4 lg:px-6 2xl:px-8">
          <div className="mx-auto max-w-7xl">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
