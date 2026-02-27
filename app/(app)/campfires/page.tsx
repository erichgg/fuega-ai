"use client";

import * as React from "react";
import Link from "next/link";
import {
  Flame,
  Users,
  Search,
  Plus,
  TrendingUp,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type Campfire, ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/contexts/auth-context";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const SECTION_SIZE = 6;

interface CampfireListResponse {
  campfires: Campfire[];
  total: number;
  count: number;
}

export default function CampfiresPage() {
  const { user } = useAuth();

  // Search state
  const [searchInput, setSearchInput] = React.useState("");
  const [activeSearch, setActiveSearch] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<Campfire[]>([]);
  const [searchTotal, setSearchTotal] = React.useState(0);
  const [searchOffset, setSearchOffset] = React.useState(0);
  const [searchLoading, setSearchLoading] = React.useState(false);

  // Trending + New sections (loaded once)
  const [trending, setTrending] = React.useState<Campfire[]>([]);
  const [newest, setNewest] = React.useState<Campfire[]>([]);
  const [totalCampfires, setTotalCampfires] = React.useState(0);
  const [sectionsLoading, setSectionsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  // Page title
  React.useEffect(() => {
    document.title = "Explore Campfires - fuega";
  }, []);

  // Load trending and newest sections
  React.useEffect(() => {
    let cancelled = false;
    setSectionsLoading(true);
    setError(null);

    async function load() {
      try {
        const [trendingRes, newestRes] = await Promise.all([
          api.get<CampfireListResponse>("/api/campfires", {
            sort: "members",
            limit: SECTION_SIZE,
            offset: 0,
          }),
          api.get<CampfireListResponse>("/api/campfires", {
            sort: "created_at",
            limit: SECTION_SIZE,
            offset: 0,
          }),
        ]);
        if (!cancelled) {
          setTrending(trendingRes.campfires);
          setNewest(newestRes.campfires);
          setTotalCampfires(trendingRes.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Failed to load campfires",
          );
        }
      } finally {
        if (!cancelled) setSectionsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [retryCount]);

  // Debounced search
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const executeSearch = React.useCallback(async (query: string, offset: number) => {
    if (!query.trim()) {
      setActiveSearch("");
      setSearchResults([]);
      setSearchTotal(0);
      setSearchOffset(0);
      return;
    }
    setSearchLoading(true);
    setActiveSearch(query);
    try {
      const data = await api.get<CampfireListResponse>("/api/campfires", {
        search: query,
        limit: PAGE_SIZE,
        offset,
        sort: "members",
      });
      setSearchResults(data.campfires);
      setSearchTotal(data.total);
      setSearchOffset(offset);
    } catch {
      // Search errors are non-critical
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = React.useCallback((value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      executeSearch(value, 0);
    }, 300);
  }, [executeSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    executeSearch(searchInput, 0);
  };

  const isSearching = activeSearch.trim().length > 0;
  const searchTotalPages = Math.max(1, Math.ceil(searchTotal / PAGE_SIZE));
  const searchCurrentPage = Math.floor(searchOffset / PAGE_SIZE) + 1;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Flame className="h-6 w-6 text-flame-400" />
            Explore Campfires
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

      {/* Search bar -- primary UI */}
      <form onSubmit={handleSearchSubmit} className="mt-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-smoke" />
          <input
            type="text"
            placeholder="Search campfires by name or description..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label="Search campfires"
            className="w-full rounded-lg border border-charcoal bg-coal py-3 pl-12 pr-4 text-sm text-foreground placeholder:text-smoke focus:border-flame-500/50 focus:outline-none focus:ring-1 focus:ring-flame-500/30"
          />
          {searchLoading && (
            <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-smoke" />
          )}
        </div>
      </form>

      {/* Loading state */}
      {sectionsLoading && !isSearching ? (
        <div className="mt-6">
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
        </div>
      ) : error && !isSearching ? (
        <div className="mt-6 py-16 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="mt-2 text-xs text-flame-400 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : isSearching ? (
        /* ===== Search results view ===== */
        <div className="mt-4">
          {searchLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-flame-400" />
              <p className="mt-3 text-sm text-smoke">Searching...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-coal border border-charcoal">
                <Search className="h-7 w-7 text-smoke" />
              </div>
              <p className="text-lg font-medium text-ash">
                No campfires match &ldquo;{activeSearch}&rdquo;
              </p>
              <p className="mt-1 text-sm text-smoke">
                Try a different search term or create a new campfire.
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
            </div>
          ) : (
            <>
              <p className="text-xs text-smoke font-mono mb-3">
                Showing {searchOffset + 1}&ndash;{Math.min(searchOffset + PAGE_SIZE, searchTotal)} of{" "}
                {searchTotal.toLocaleString()} campfire{searchTotal !== 1 ? "s" : ""} matching &ldquo;{activeSearch}&rdquo;
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchResults.map((c) => (
                  <CampfireCard key={c.id} campfire={c} />
                ))}
              </div>

              {/* Pagination */}
              {searchTotal > PAGE_SIZE && (
                <div className="mt-6 flex items-center justify-between text-xs text-smoke">
                  <span>
                    Page {searchCurrentPage} of {searchTotalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={searchOffset === 0}
                      className="h-7 border-charcoal text-ash"
                      onClick={() => executeSearch(activeSearch, Math.max(0, searchOffset - PAGE_SIZE))}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={searchOffset + PAGE_SIZE >= searchTotal}
                      className="h-7 border-charcoal text-ash"
                      onClick={() => executeSearch(activeSearch, searchOffset + PAGE_SIZE)}
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* ===== Browse view (trending + new) ===== */
        <div className="mt-6 space-y-8">
          {/* Total count */}
          {totalCampfires > 0 && (
            <p className="text-xs text-smoke font-mono">
              {totalCampfires.toLocaleString()} campfire{totalCampfires !== 1 ? "s" : ""} across fuega
            </p>
          )}

          {/* Trending section */}
          {trending.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                <TrendingUp className="h-4 w-4 text-flame-400" />
                Trending Campfires
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {trending.map((c) => (
                  <CampfireCard key={c.id} campfire={c} />
                ))}
              </div>
            </section>
          )}

          {/* Newest section */}
          {newest.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                <Clock className="h-4 w-4 text-flame-400" />
                New Campfires
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {newest.map((c) => (
                  <CampfireCard key={c.id} campfire={c} />
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {trending.length === 0 && newest.length === 0 && (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-coal border border-charcoal">
                <Flame className="h-7 w-7 text-smoke" />
              </div>
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Campfire Card (extracted for reuse)
// ---------------------------------------------------------------------------

function CampfireCard({ campfire: c }: { campfire: Campfire }) {
  return (
    <Link
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
  );
}
