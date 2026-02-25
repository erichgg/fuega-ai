"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Flame, Vote, Award, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/fuega/post-card";
import { FeedSort } from "@/components/fuega/feed-sort";
import { FeedSkeleton } from "@/components/fuega/page-skeleton";
import { useAuth } from "@/lib/contexts/auth-context";
import { usePosts } from "@/lib/hooks/usePosts";
import { useVoting } from "@/lib/hooks/useVoting";
import { toPostCardData } from "@/lib/adapters/post-adapter";
import { api } from "@/lib/api/client";
import type { Campfire, Proposal } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type SortOption = "hot" | "new" | "top" | "rising";

export default function HomeFeedPage() {
  const { user } = useAuth();
  const [sort, setSort] = React.useState<SortOption>("hot");
  const { posts, loading, error, hasMore, loadMore } = usePosts({ sort });
  const { vote } = useVoting();

  // Track local vote state for optimistic UI
  const [votes, setVotes] = React.useState<
    Record<string, "sparked" | "doused" | null>
  >({});
  const [sparkDeltas, setSparkDeltas] = React.useState<Record<string, number>>(
    {},
  );

  // Right-rail data
  const [trendingCampfires, setTrendingCampfires] = React.useState<Campfire[]>([]);
  const [activeProposals, setActiveProposals] = React.useState<Proposal[]>([]);

  React.useEffect(() => {
    // Fetch trending campfires
    api
      .get<{ campfires: Campfire[] }>("/api/campfires", { limit: 5 })
      .then((res) => setTrendingCampfires(res.campfires))
      .catch(() => {});

    // Fetch active proposals
    api
      .get<{ proposals: Proposal[] }>("/api/proposals", { status: "voting" })
      .then((res) => setActiveProposals(res.proposals.slice(0, 3)))
      .catch(() => {});
  }, []);

  const handleVote = async (postId: string, voteType: "spark" | "douse") => {
    const current = votes[postId] ?? null;
    const newState = voteType === "spark" ? "sparked" : "doused";

    if (current === newState) {
      setVotes((prev) => ({ ...prev, [postId]: null }));
      setSparkDeltas((prev) => ({ ...prev, [postId]: 0 }));
    } else {
      setVotes((prev) => ({ ...prev, [postId]: newState }));
      setSparkDeltas((prev) => ({
        ...prev,
        [postId]: voteType === "spark" ? 1 : -1,
      }));
    }

    try {
      await vote("post", postId, voteType);
    } catch {
      setVotes((prev) => ({ ...prev, [postId]: current }));
      setSparkDeltas((prev) => ({ ...prev, [postId]: 0 }));
    }
  };

  const postCards = posts.map((p) => {
    const card = toPostCardData(p);
    if (sparkDeltas[p.id] !== undefined) {
      card.sparkCount += sparkDeltas[p.id] ?? 0;
    }
    return card;
  });

  return (
    <div className="flex gap-6">
      {/* Main feed */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <FeedSort active={sort} onChange={setSort} />
          {user && (
            <Link href="/submit">
              <Button variant="spark" size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create Post</span>
              </Button>
            </Link>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {loading ? (
            <FeedSkeleton />
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
          ) : postCards.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-coal border border-charcoal">
                <Plus className="h-7 w-7 text-smoke" />
              </div>
              <p className="text-lg font-medium text-ash">No posts yet</p>
              <p className="mt-1 text-sm text-smoke">
                Be the first to start a conversation.
              </p>
              <Link
                href={user ? "/submit" : "/signup"}
                className="mt-4 inline-flex items-center gap-1.5 bg-flame-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-flame-600"
              >
                {user ? "Create a post" : "Sign up to post"}
              </Link>
            </div>
          ) : (
            <>
              {postCards.map((post) => (
                <Link key={post.id} href={`/f/${post.campfire}/${post.id}`}>
                  <PostCard
                    post={post}
                    userVote={votes[post.id] ?? null}
                    onVote={(v) => handleVote(post.id, v)}
                  />
                </Link>
              ))}
              {hasMore && (
                <button
                  onClick={loadMore}
                  className="w-full py-3 text-center text-xs text-ash hover:text-flame-400 transition-colors"
                >
                  Load more posts
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right rail — desktop only */}
      <aside className="hidden xl:flex flex-col gap-4 w-64 shrink-0">
        {/* Trending campfires */}
        <div className="rounded-lg border border-charcoal bg-charcoal/30 p-3">
          <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-3 font-mono">
            <TrendingUp className="h-3.5 w-3.5 text-lava-hot" />
            Trending Campfires
          </h3>
          {trendingCampfires.length === 0 ? (
            <p className="text-[10px] text-smoke">No campfires yet</p>
          ) : (
            <div className="space-y-2">
              {trendingCampfires.map((c) => (
                <Link
                  key={c.id}
                  href={`/f/${c.name}`}
                  className="flex items-center gap-2 group"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-coal border border-charcoal shrink-0">
                    <Flame className="h-3 w-3 text-flame-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-mono text-foreground group-hover:text-flame-400 transition-colors truncate block">
                      <span className="text-flame-400">f</span>
                      <span className="text-smoke mx-0.5">|</span>
                      {c.name}
                    </span>
                    <span className="text-[10px] text-smoke flex items-center gap-1">
                      <Users className="h-2.5 w-2.5" />
                      {(c.member_count ?? 0).toLocaleString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <Link
            href="/campfires"
            className="mt-3 block text-[10px] text-flame-400 hover:underline font-mono"
          >
            Browse all →
          </Link>
        </div>

        {/* Active governance */}
        {activeProposals.length > 0 && (
          <div className="rounded-lg border border-charcoal bg-charcoal/30 p-3">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-3 font-mono">
              <Vote className="h-3.5 w-3.5 text-lava-hot" />
              Active Votes
            </h3>
            <div className="space-y-2">
              {activeProposals.map((p) => {
                const total = p.votes_for + p.votes_against;
                const forPct = total > 0 ? Math.round((p.votes_for / total) * 100) : 0;
                return (
                  <Link
                    key={p.id}
                    href={`/governance/${p.id}`}
                    className="block group"
                  >
                    <p className="text-xs text-foreground group-hover:text-flame-400 transition-colors line-clamp-1">
                      {p.title}
                    </p>
                    {total > 0 && (
                      <div className="mt-1 flex h-1 overflow-hidden rounded-full bg-charcoal">
                        <div
                          className="bg-green-500"
                          style={{ width: `${forPct}%` }}
                        />
                        <div
                          className="bg-red-500"
                          style={{ width: `${100 - forPct}%` }}
                        />
                      </div>
                    )}
                    <p className="text-[10px] text-smoke mt-0.5">
                      {total} votes · {forPct}% for
                    </p>
                  </Link>
                );
              })}
            </div>
            <Link
              href="/governance"
              className="mt-3 block text-[10px] text-flame-400 hover:underline font-mono"
            >
              All proposals →
            </Link>
          </div>
        )}

        {/* Quick links */}
        <div className="rounded-lg border border-charcoal bg-charcoal/30 p-3">
          <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-3 font-mono">
            <Award className="h-3.5 w-3.5 text-lava-hot" />
            Quick Links
          </h3>
          <div className="space-y-1.5">
            {[
              { href: "/badges", label: "Badge Gallery" },
              { href: "/mod-log", label: "Mod Log" },
              { href: "/about", label: "About fuega" },
              { href: "/how-it-works", label: "How It Works" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "block text-xs text-ash hover:text-flame-400 transition-colors font-mono",
                )}
              >
                → {link.label}
              </Link>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
