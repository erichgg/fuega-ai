"use client";

import * as React from "react";
import Link from "next/link";
import { TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/fuega/post-card";
import { ReportDialog } from "@/components/fuega/report-dialog";
import { FeedSkeleton } from "@/components/fuega/page-skeleton";
import { FeedSort } from "@/components/fuega/feed-sort";
import { FeedFilters } from "@/components/fuega/feed-filters";
import { useAuth } from "@/lib/contexts/auth-context";
import { usePosts } from "@/lib/hooks/usePosts";
import { useOptimisticVoting } from "@/lib/hooks/useOptimisticVoting";
import { useInfiniteScroll } from "@/lib/hooks/useInfiniteScroll";
import { toPostCardData } from "@/lib/adapters/post-adapter";

export default function TrendingPage() {
  const { user } = useAuth();
  const [sort, setSort] = React.useState<"hot" | "new" | "top" | "rising">("hot");
  const [timeRange, setTimeRange] = React.useState<"all" | "today" | "week" | "month">("all");
  const [postType, setPostType] = React.useState<"all" | "text" | "link" | "image">("all");

  const { posts, loading, error, hasMore, loadMore } = usePosts({ sort, timeRange, postType });
  const { handleVote, getVote, getDelta } = useOptimisticVoting();
  const [reportPostId, setReportPostId] = React.useState<string | null>(null);
  const sentinelRef = useInfiniteScroll({ hasMore, loading, onLoadMore: loadMore });

  const postCards = posts.map((p) => {
    const card = toPostCardData(p);
    const delta = getDelta(p.id);
    if (delta !== 0) {
      card.sparkCount += delta;
    }
    return card;
  });

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-flame-400" />
          <h1 className="text-xl font-bold text-foreground">Trending</h1>
        </div>
        {user && (
          <Link href="/submit">
            <Button variant="spark" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Post</span>
            </Button>
          </Link>
        )}
      </div>
      <p className="mt-1 text-sm text-smoke">
        The hottest posts across all campfires right now.
      </p>

      <div className="mt-3">
        <FeedSort active={sort} onChange={setSort} />
      </div>
      <FeedFilters
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        postType={postType}
        onPostTypeChange={setPostType}
        className="mt-2"
      />

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
              <TrendingUp className="h-7 w-7 text-smoke" />
            </div>
            <p className="text-lg font-medium text-ash">Nothing trending yet</p>
            <p className="mt-1 text-sm text-smoke">
              Posts will show up here as they gain sparks.
            </p>
          </div>
        ) : (
          <>
            {postCards.map((post) => (
              <Link key={post.id} href={`/f/${post.campfire}/${post.id}`}>
                <PostCard
                  post={post}
                  userVote={getVote(post.id)}
                  onVote={(v) => handleVote(post.id, v)}
                  onReport={() => setReportPostId(post.id)}
                />
              </Link>
            ))}
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-lava-hot border-t-transparent" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Report dialog */}
      <ReportDialog
        open={reportPostId !== null}
        onOpenChange={(open) => { if (!open) setReportPostId(null); }}
        postId={reportPostId ?? undefined}
      />
    </div>
  );
}
