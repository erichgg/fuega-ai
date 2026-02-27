"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Flame, User, FileText, Loader2, TrendingUp, Sparkles } from "lucide-react";
import { api, ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils/time-ago";

// --- Types ---

interface SearchResultItem {
  type: "post" | "campfire" | "user";
  id: string;
  title: string;
  snippet: string;
  meta?: {
    campfire?: string;
    author?: string;
    sparkCount?: number;
    memberCount?: number;
    createdAt?: string;
  };
}

interface SearchApiResponse {
  results: SearchResultItem[];
  total: number;
  query: string;
}

type SearchTab = "all" | "posts" | "campfires" | "users";

const tabs: { key: SearchTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "posts", label: "Posts" },
  { key: "campfires", label: "Campfires" },
  { key: "users", label: "Users" },
];

const PAGE_SIZE = 20;

// --- Page ---

export default function SearchPage() {
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto max-w-2xl py-16 text-center text-ash">
          Loading...
        </div>
      }
    >
      <SearchPageInner />
    </React.Suspense>
  );
}

function SearchPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") ?? "";

  // Page title
  React.useEffect(() => {
    document.title = q.trim() ? `Search: ${q} - fuega` : "Search - fuega";
  }, [q]);

  const [searchInput, setSearchInput] = React.useState(q);
  React.useEffect(() => { setSearchInput(q); }, [q]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const [activeTab, setActiveTab] = React.useState<SearchTab>("all");
  const [results, setResults] = React.useState<SearchResultItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Per-tab counts
  const [counts, setCounts] = React.useState<Record<SearchTab, number>>({
    all: 0,
    posts: 0,
    campfires: 0,
    users: 0,
  });
  const [countsLoaded, setCountsLoaded] = React.useState(false);

  // Fetch counts for all tabs when query changes
  React.useEffect(() => {
    if (!q.trim()) {
      setCounts({ all: 0, posts: 0, campfires: 0, users: 0 });
      setCountsLoaded(false);
      return;
    }

    let cancelled = false;

    async function fetchCounts() {
      try {
        const [posts, campfires, users] = await Promise.all([
          api.get<SearchApiResponse>("/api/search", { q, type: "posts", limit: 1 }),
          api.get<SearchApiResponse>("/api/search", { q, type: "campfires", limit: 1 }),
          api.get<SearchApiResponse>("/api/search", { q, type: "users", limit: 1 }),
        ]);
        if (!cancelled) {
          const postCount = posts.total;
          const campfireCount = campfires.total;
          const userCount = users.total;
          setCounts({
            all: postCount + campfireCount + userCount,
            posts: postCount,
            campfires: campfireCount,
            users: userCount,
          });
          setCountsLoaded(true);
        }
      } catch {
        // Counts are supplementary
      }
    }

    fetchCounts();
    return () => { cancelled = true; };
  }, [q]);

  // Fetch initial results when query or tab changes
  React.useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setResults([]);
    setTotal(0);

    async function fetchResults() {
      try {
        const data = await api.get<SearchApiResponse>("/api/search", {
          q,
          type: activeTab,
          limit: PAGE_SIZE,
          offset: 0,
        });
        if (!cancelled) {
          setResults(data.results);
          setTotal(data.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Search failed",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchResults();
    return () => { cancelled = true; };
  }, [q, activeTab]);

  // Load more handler
  const loadMore = React.useCallback(async () => {
    if (loadingMore || results.length >= total) return;
    setLoadingMore(true);
    try {
      const data = await api.get<SearchApiResponse>("/api/search", {
        q,
        type: activeTab,
        limit: PAGE_SIZE,
        offset: results.length,
      });
      setResults((prev) => [...prev, ...data.results]);
    } catch {
      // Silently fail on load more
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, results.length, total, q, activeTab]);

  const hasMore = results.length < total;

  return (
    <div>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Search</h1>
        {q.trim() ? (
          <p className="mt-1 text-sm text-ash">
            {countsLoaded ? `${counts.all.toLocaleString()} results` : "Searching"} for &ldquo;{q}&rdquo;
          </p>
        ) : (
          <p className="mt-1 text-sm text-ash">
            Find posts, campfires, and users across fuega.
          </p>
        )}
      </div>

      {/* Search form */}
      <form onSubmit={handleSearchSubmit} className="mt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-smoke" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search posts, campfires, users..."
            className="w-full rounded-lg border border-charcoal bg-coal pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-smoke focus:border-flame-500/50 focus:outline-none focus:ring-1 focus:ring-flame-500/30"
            autoFocus={!q.trim()}
          />
        </div>
      </form>

      {/* Tabs */}
      {q.trim() && (
        <div className="mt-4 flex flex-wrap items-center gap-2" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-flame-500/20 text-flame-400"
                  : "text-smoke hover:text-ash",
              )}
            >
              {tab.label}
              {countsLoaded && (
                <span className="ml-1 text-[10px] opacity-70">
                  ({counts[tab.key].toLocaleString()})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="mt-6 space-y-1">
        {loading ? (
          <div className="space-y-0.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse h-12 rounded bg-charcoal/30"
              />
            ))}
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        ) : !q.trim() ? (
          <div className="py-12 text-center">
            <Search className="mx-auto h-12 w-12 text-smoke/60" />
            <p className="mt-4 text-ash">
              Type a search query to find posts, campfires, and users.
            </p>
            <div className="mt-6 space-y-3">
              <p className="text-xs text-smoke font-medium uppercase tracking-wider">Suggestions</p>
              <div className="flex flex-wrap justify-center gap-2">
                {["campfires", "governance", "badges", "trending", "new posts"].map((term) => (
                  <Link
                    key={term}
                    href={`/search?q=${encodeURIComponent(term)}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-charcoal px-3 py-1.5 text-xs text-smoke hover:text-flame-400 hover:border-flame-400/30 transition-colors"
                  >
                    <Sparkles className="h-3 w-3" />
                    {term}
                  </Link>
                ))}
              </div>
              <div className="mt-4 flex justify-center gap-4 text-xs">
                <Link href="/trending" className="flex items-center gap-1 text-smoke hover:text-flame-400 transition-colors">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Browse trending
                </Link>
                <Link href="/campfires" className="flex items-center gap-1 text-smoke hover:text-flame-400 transition-colors">
                  <Flame className="h-3.5 w-3.5" />
                  Explore campfires
                </Link>
              </div>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="py-16 text-center">
            <Search className="mx-auto h-12 w-12 text-smoke/60" />
            <p className="mt-4 text-ash">
              No results for &ldquo;{q}&rdquo;
            </p>
            <div className="mt-3 space-y-1 text-xs text-smoke">
              <p>Try different keywords or check your spelling.</p>
              <p>Search works across post titles, campfire names, and usernames.</p>
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {["campfires", "governance", "badges", "trending"].map((term) => (
                <Link
                  key={term}
                  href={`/search?q=${encodeURIComponent(term)}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-charcoal px-3 py-1.5 text-xs text-smoke hover:text-flame-400 hover:border-flame-400/30 transition-colors"
                >
                  <Sparkles className="h-3 w-3" />
                  Try &ldquo;{term}&rdquo;
                </Link>
              ))}
            </div>
            <div className="mt-4 flex justify-center gap-4 text-xs">
              <Link href="/campfires" className="flex items-center gap-1 text-smoke hover:text-flame-400 transition-colors">
                <Flame className="h-3.5 w-3.5" />
                Browse campfires
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Results count */}
            <p className="text-xs text-smoke font-mono mb-2">
              Showing {results.length.toLocaleString()} of {total.toLocaleString()} results
            </p>
            {results.map((result) => (
              <SearchResultRow key={`${result.type}-${result.id}`} result={result} />
            ))}

            {/* Load more button */}
            {hasMore && (
              <div className="pt-4 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-md border border-charcoal px-5 py-2 text-sm text-ash hover:text-flame-400 hover:border-flame-400/30 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    `Load more (${(total - results.length).toLocaleString()} remaining)`
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// --- Result Row ---

function SearchResultRow({ result }: { result: SearchResultItem }) {
  switch (result.type) {
    case "post":
      return <PostResult result={result} />;
    case "campfire":
      return <CampfireResult result={result} />;
    case "user":
      return <UserResult result={result} />;
    default:
      return null;
  }
}

function PostResult({ result }: { result: SearchResultItem }) {
  const campfire = result.meta?.campfire ?? "unknown";
  return (
    <Link
      href={`/f/${campfire}/${result.id}`}
      className="flex items-start gap-3 rounded-md px-3 py-2.5 border border-transparent hover:border-lava-hot/20 hover:bg-coal/80 transition-all"
    >
      <FileText className="h-4 w-4 shrink-0 text-flame-400 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-smoke">
          <span className="font-mono">
            <span className="text-flame-400">f</span>
            <span className="text-smoke mx-0.5">|</span>
            <span>{campfire}</span>
          </span>
          {result.meta?.author && (
            <>
              <span>·</span>
              <span>{result.meta.author}</span>
            </>
          )}
          {result.meta?.createdAt && (
            <>
              <span>·</span>
              <span>{timeAgo(result.meta.createdAt)}</span>
            </>
          )}
        </div>
        <p className="text-sm font-medium text-foreground mt-0.5 line-clamp-1">
          {result.title}
        </p>
        {result.snippet && (
          <p className="text-xs text-ash mt-0.5 line-clamp-1">{result.snippet}</p>
        )}
      </div>
      {typeof result.meta?.sparkCount === "number" && (
        <span className="shrink-0 text-xs text-flame-400 font-mono mt-1">
          {result.meta.sparkCount} glow
        </span>
      )}
    </Link>
  );
}

function CampfireResult({ result }: { result: SearchResultItem }) {
  return (
    <Link
      href={`/f/${result.title}`}
      className="flex items-center gap-3 rounded-md px-3 py-2.5 border border-transparent hover:border-lava-hot/20 hover:bg-coal/80 transition-all"
    >
      <Flame className="h-4 w-4 shrink-0 text-flame-400" />
      <span className="text-sm font-mono text-foreground whitespace-nowrap">
        <span className="text-flame-400">f</span>
        <span className="text-smoke mx-0.5">|</span>
        {result.title}
      </span>
      <span className="flex-1 truncate text-xs text-ash">
        {result.snippet}
      </span>
      {typeof result.meta?.memberCount === "number" && (
        <span className="shrink-0 text-xs text-smoke">
          {result.meta.memberCount} {result.meta.memberCount === 1 ? "member" : "members"}
        </span>
      )}
    </Link>
  );
}

function UserResult({ result }: { result: SearchResultItem }) {
  return (
    <Link
      href={`/u/${result.title}`}
      className="flex items-center gap-3 rounded-md px-3 py-2.5 border border-transparent hover:border-lava-hot/20 hover:bg-coal/80 transition-all"
    >
      <User className="h-4 w-4 shrink-0 text-ash" />
      <span className="text-sm font-mono text-foreground">
        {result.title}
      </span>
    </Link>
  );
}
