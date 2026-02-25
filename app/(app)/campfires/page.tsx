"use client";

import * as React from "react";
import Link from "next/link";
import { Flame, Users, Search } from "lucide-react";
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
          <h1 className="text-xl font-bold text-ash-100">Browse Campfires</h1>
          <p className="mt-1 text-sm text-ash-500">
            Find your people. Each campfire governs itself.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash-500" />
        <input
          type="text"
          placeholder="Search campfires..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-ash-800 bg-ash-900/50 py-2.5 pl-10 pr-4 text-sm text-ash-200 placeholder:text-ash-600 focus:border-flame-500/50 focus:outline-none focus:ring-1 focus:ring-flame-500/30"
        />
      </div>

      {/* Grid */}
      <div className="mt-6">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-lg border border-ash-800 bg-ash-900/30 p-5"
              >
                <div className="h-5 w-24 rounded bg-ash-800" />
                <div className="mt-3 h-3 w-full rounded bg-ash-800" />
                <div className="mt-2 h-3 w-2/3 rounded bg-ash-800" />
                <div className="mt-4 h-3 w-16 rounded bg-ash-800" />
              </div>
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
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ash-900 border border-ash-800">
              <Flame className="h-7 w-7 text-ash-500" />
            </div>
            {search.trim() ? (
              <>
                <p className="text-lg font-medium text-ash-300">
                  No campfires match &ldquo;{search}&rdquo;
                </p>
                <p className="mt-1 text-sm text-ash-500">
                  Try a different search term.
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium text-ash-300">
                  No campfires yet
                </p>
                <p className="mt-1 text-sm text-ash-500">
                  Be the first to create one.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Link
                key={c.id}
                href={`/f/${c.name}`}
                className="group rounded-lg border border-ash-800 bg-ash-900/30 p-5 transition-all hover:border-flame-500/30 hover:bg-ash-900/50"
              >
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-flame-400" />
                  <h3 className="text-sm font-semibold text-ash-100 group-hover:text-flame-400 transition-colors">
                    <span className="text-flame-400">f</span>
                    <span className="text-ash-600 mx-0.5">|</span>
                    {c.name}
                  </h3>
                </div>
                {c.display_name && c.display_name !== c.name && (
                  <p className="mt-0.5 text-xs text-ash-500">
                    {c.display_name}
                  </p>
                )}
                <p className="mt-2 text-xs text-ash-400 line-clamp-2 leading-relaxed">
                  {c.description}
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs text-ash-600">
                  <Users className="h-3 w-3" />
                  <span>
                    {c.member_count}{" "}
                    {c.member_count === 1 ? "member" : "members"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
