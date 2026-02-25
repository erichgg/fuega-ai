"use client";

import * as React from "react";
import Link from "next/link";
import { Flame, Users, Search, ChevronRight } from "lucide-react";
import { api, type Campfire, ApiError } from "@/lib/api/client";

export default function CampfiresPage() {
  const [campfires, setCampfires] = React.useState<Campfire[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api.get<{ campfires: Campfire[] }>("/api/campfires");
        if (!cancelled) setCampfires(data.campfires);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Failed to load campfires",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = search.trim()
    ? campfires.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.display_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
          c.description.toLowerCase().includes(search.toLowerCase()),
      )
    : campfires;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Browse Campfires</h1>
          <p className="mt-1 text-sm text-smoke">
            Find your people. Each campfire governs itself.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-smoke" />
        <input
          type="text"
          placeholder="Search campfires..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search campfires"
          className="w-full rounded-lg border border-charcoal bg-charcoal/50 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-smoke focus:border-flame-500/50 focus:outline-none focus:ring-1 focus:ring-flame-500/30"
        />
      </div>

      {/* Grid */}
      <div className="mt-6">
        {loading ? (
          <div className="space-y-0.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse h-10 rounded bg-charcoal/30"
              />
            ))}
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-xs text-flame-400 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-coal border border-charcoal">
              <Flame className="h-7 w-7 text-smoke" />
            </div>
            {search.trim() ? (
              <>
                <p className="text-lg font-medium text-ash">
                  No campfires match &ldquo;{search}&rdquo;
                </p>
                <p className="mt-1 text-sm text-smoke">
                  Try a different search term.
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium text-ash">
                  No campfires yet
                </p>
                <p className="mt-1 text-sm text-smoke">
                  Be the first to create one.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((c) => (
              <Link
                key={c.id}
                href={`/f/${c.name}`}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 border border-transparent hover:border-lava-hot/20 hover:bg-coal/80 transition-all"
              >
                <Flame className="h-4 w-4 shrink-0 text-flame-400" />
                <span className="text-sm font-mono text-foreground whitespace-nowrap">
                  <span className="text-flame-400">f</span>
                  <span className="text-smoke mx-0.5">|</span>
                  {c.name}
                </span>
                <span className="flex-1 truncate text-xs text-ash">
                  {c.description}
                </span>
                <span className="shrink-0 text-xs text-smoke">
                  {c.member_count} {c.member_count === 1 ? "member" : "members"}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-smoke" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
