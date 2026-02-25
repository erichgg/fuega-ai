"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/fuega/post-card";
import { FeedSort } from "@/components/fuega/feed-sort";
import { FeedSkeleton } from "@/components/fuega/page-skeleton";
import { useAuth } from "@/lib/contexts/auth-context";
import { usePosts } from "@/lib/hooks/usePosts";
import { useVoting } from "@/lib/hooks/useVoting";
import { toPostCardData } from "@/lib/adapters/post-adapter";

type SortOption = "hot" | "new" | "top" | "rising";

export default function HomeFeedPage() {
  const { user, loading: authLoading } = useAuth();
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

  const handleVote = async (postId: string, voteType: "spark" | "douse") => {
    const current = votes[postId] ?? null;
    const newState = voteType === "spark" ? "sparked" : "doused";

    // Optimistic update
    if (current === newState) {
      // Un-vote
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
      if (current === newState) {
        await vote("post", postId, voteType);
      } else {
        await vote("post", postId, voteType);
      }
    } catch {
      // Revert on error
      setVotes((prev) => ({ ...prev, [postId]: current }));
      setSparkDeltas((prev) => ({ ...prev, [postId]: 0 }));
    }
  };

  // Convert API posts to UI shape
  const postCards = posts.map((p) => {
    const card = toPostCardData(p);
    // Apply optimistic vote delta
    if (sparkDeltas[p.id] !== undefined) {
      card.sparkCount += sparkDeltas[p.id] ?? 0;
    }
    return card;
  });

  return (
    <div>
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
            <p className="mt-1 text-sm text-smoke">Be the first to start a conversation.</p>
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
  );
}
