"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Flame, User, FileText, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils/time-ago";

// ─── Types ───────────────────────────────────────────────────

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

// ─── Page ────────────────────────────────────────────────────

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
  const q = searchParams.get("q") ?? "";

  const [activeTab, setActiveTab] = React.useState<SearchTab>("all");
  const [results, setResults] = React.useState<SearchResultItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Per-tab counts (fetched once on initial query)
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
        // Counts are supplementary; silently ignore errors
      }
    }

    fetchCounts();
    return () => { cancelled = true; };
  }, [q]);

  // Fetch results when query or tab changes
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

    async function fetchResults() {
      try {
        const data = await api.get<SearchApiResponse>("/api/search", {
          q,
          type: activeTab,
          limit: 25,
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

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Search</h1>
        {q.trim() ? (
          <p className="mt-1 text-sm text-ash">
            {countsLoaded ? `${counts.all} results` : "Searching"} for &ldquo;{q}&rdquo;
          </p>
        ) : (
          <p className="mt-1 text-sm text-ash">
            Enter a query in the search bar above.
          </p>
        )}
      </div>

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
                  ({counts[tab.key]})
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
          <div className="py-16 text-center">
            <Search className="mx-auto h-12 w-12 text-smoke/60" />
            <p className="mt-4 text-ash">
              Type a search query to find posts, campfires, and users.
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="py-16 text-center">
            <Search className="mx-auto h-12 w-12 text-smoke/60" />
            <p className="mt-4 text-ash">
              No results for &ldquo;{q}&rdquo;
            </p>
            <p className="mt-1 text-xs text-smoke">
              Try different keywords or check your spelling.
            </p>
          </div>
        ) : (
          results.map((result) => (
            <SearchResultRow key={`${result.type}-${result.id}`} result={result} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Result Row ──────────────────────────────────────────────

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
  // We don't have postId-based routes with campfire prefix, use generic post link
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
