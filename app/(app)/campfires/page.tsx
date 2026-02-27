"use client";

import * as React from "react";
import Link from "next/link";
import { Flame, Users, Search, Plus, TrendingUp, Clock, SortAsc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type Campfire, ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/contexts/auth-context";
import { cn } from "@/lib/utils";

export default function CampfiresPage() {
  const { user } = useAuth();
  const [campfires, setCampfires] = React.useState<Campfire[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<"members" | "newest" | "name">("members");
  const [retryCount, setRetryCount] = React.useState(0);

  // Page title
  React.useEffect(() => {
    document.title = "Explore Campfires - fuega";
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    async function load() {
      try {
        const data = await api.get<{ campfires: Campfire[] }>("/api/campfires", { limit: 100 });
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
    return () => { cancelled = true; };
  }, [retryCount]);

  const filtered = search.trim()
    ? campfires.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.display_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
          c.description.toLowerCase().includes(search.toLowerCase()),
      )
    : campfires;

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "members") return (b.member_count ?? 0) - (a.member_count ?? 0);
    if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return a.name.localeCompare(b.name);
  });

  const sortOptions = [
    { value: "members" as const, label: "Most Members", icon: TrendingUp },
    { value: "newest" as const, label: "Newest", icon: Clock },
    { value: "name" as const, label: "A\u2013Z", icon: SortAsc },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Flame className="h-6 w-6 text-flame-400" />
            Browse Campfires
          </h1>
          <p className="mt-1 text-sm text-smoke">
            Find your people. Each campfire governs itself through democratic governance.
          </p>
        </div>
        {user && (
          <Link href="/campfires/create">
            <Button variant="spark" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Search + Sort toolbar */}
      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-smoke" />
          <input
            type="text"
            placeholder="Search campfires..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search campfires"
            className="w-full rounded-lg border border-charcoal bg-coal py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-smoke focus:border-flame-500/50 focus:outline-none focus:ring-1 focus:ring-flame-500/30"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-charcoal bg-charcoal/50 p-1">
          {sortOptions.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.value}
                onClick={() => setSort(s.value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-mono transition-colors",
                  sort === s.value
                    ? "bg-coal text-flame-400"
                    : "text-smoke hover:text-ash",
                )}
              >
                <Icon className="h-3 w-3" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results count */}
      {!loading && !error && (
        <p className="mt-3 text-xs text-smoke font-mono">
          {sorted.length} campfire{sorted.length !== 1 ? "s" : ""}
          {search.trim() ? ` matching "${search}"` : ""}
        </p>
      )}

      {/* Grid */}
      <div className="mt-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg border border-charcoal overflow-hidden">
                <div className="h-16 bg-charcoal/50" />
                <div className="p-3 space-y-2">
                  <div className="h-4 w-24 bg-charcoal/50 rounded" />
                  <div className="h-3 w-full bg-charcoal/30 rounded" />
                  <div className="h-3 w-2/3 bg-charcoal/30 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => setRetryCount((c) => c + 1)}
              className="mt-2 text-xs text-flame-400 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : sorted.length === 0 ? (
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
                  Try a different search term or create a new campfire.
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium text-ash">No campfires yet</p>
                <p className="mt-1 text-sm text-smoke">
                  Be the first to light one up.
                </p>
                {user && (
                  <Link
                    href="/campfires/create"
                    className="mt-4 inline-flex items-center gap-1.5 bg-flame-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-flame-600 rounded-md"
                  >
                    <Plus className="h-4 w-4" />
                    Create a campfire
                  </Link>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sorted.map((c) => (
              <Link
                key={c.id}
                href={`/f/${c.name}`}
                className="group rounded-lg border border-charcoal overflow-hidden transition-all duration-200 hover:border-lava-hot/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-lava-hot/5"
              >
                {/* Card header gradient */}
                <div
                  className="h-14 relative"
                  style={{
                    backgroundImage: c.banner_url
                      ? `url(${c.banner_url})`
                      : `linear-gradient(135deg, ${c.theme_color || 'var(--lava-hot)'} 0%, var(--ember) 50%, #1a0a00 100%)`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-coal/80 to-transparent" />
                  <div className="absolute bottom-2 left-3 flex items-center gap-2">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-coal/80 border"
                      style={{ borderColor: c.theme_color || "rgba(255,69,0,0.3)" }}
                    >
                      <Flame className="h-3.5 w-3.5 text-flame-400" />
                    </div>
                    <span className="text-sm font-mono font-medium text-white drop-shadow">
                      <span className="text-flame-400">f</span>
                      <span className="text-white/50 mx-0.5">|</span>
                      <span>{c.name}</span>
                    </span>
                  </div>
                </div>

                {/* Card body */}
                <div className="bg-coal p-3">
                  <p className="text-xs text-ash line-clamp-2 leading-relaxed">
                    {c.description}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-smoke font-mono">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span className="text-foreground font-medium">
                        {(c.member_count ?? 0).toLocaleString()}
                      </span>
                      members
                    </span>
                    <span className="text-charcoal">&middot;</span>
                    <span>
                      {new Date(c.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
