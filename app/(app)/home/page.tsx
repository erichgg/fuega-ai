"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/fuega/post-card";
import { ReportDialog } from "@/components/fuega/report-dialog";
import { FeedToolbar } from "@/components/fuega/feed-sort";
import { FeedSkeleton } from "@/components/fuega/page-skeleton";
import { QuickComposer } from "@/components/fuega/quick-composer";
import { WelcomeBanner } from "@/components/fuega/welcome-banner";
import { useAuth } from "@/lib/contexts/auth-context";
import { usePosts } from "@/lib/hooks/usePosts";
import { useOptimisticVoting } from "@/lib/hooks/useOptimisticVoting";
import { useInfiniteScroll } from "@/lib/hooks/useInfiniteScroll";
import { toPostCardData } from "@/lib/adapters/post-adapter";

type SortOption = "hot" | "new" | "top" | "rising";

export default function HomeFeedPage() {
  const { user } = useAuth();

  React.useEffect(() => {
    document.title = "Home - fuega";
  }, []);

  const [sort, setSort] = React.useState<SortOption>("hot");
  const [timeRange, setTimeRange] = React.useState<"all" | "today" | "week" | "month">("all");
  const [postType, setPostType] = React.useState<"all" | "text" | "link" | "image">("all");
  const { posts, loading, error, hasMore, loadMore, refresh } = usePosts({ sort, timeRange, postType });
  const { handleVote, getVote, getDelta } = useOptimisticVoting();
  const sentinelRef = useInfiniteScroll({
    hasMore,
    loading,
    onLoadMore: loadMore,
  });

  // Report dialog
  const [reportPostId, setReportPostId] = React.useState<string | null>(null);

  const postCards = posts.map((p) => {
    const card = toPostCardData(p);
    const delta = getDelta(p.id);
    if (delta !== 0) {
      card.sparkCount += delta;
    }
    return card;
  });

  return (
    <div>
      <WelcomeBanner className="mb-4" />
        <QuickComposer className="mb-4" />
        <div className="flex items-center justify-between gap-4">
          <FeedToolbar
            sort={sort}
            onSortChange={setSort}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            postType={postType}
            onPostTypeChange={setPostType}
          />
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
                onClick={() => refresh()}
                className="mt-2 text-xs text-flame-400 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : postCards.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-6 text-5xl" aria-hidden="true">
                🔥
              </div>
              <p className="text-lg font-medium text-foreground">
                The hearth is quiet&hellip;
              </p>
              <p className="mt-1 text-sm text-ash">
                No posts yet. Light the first spark and get the conversation going.
              </p>
              <Link
                href={user ? "/submit" : "/signup"}
                className="mt-5 inline-flex items-center gap-1.5 bg-flame-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-flame-600 rounded-md"
              >
                <Plus className="h-4 w-4" />
                {user ? "Start a conversation" : "Sign up to post"}
              </Link>
              <p className="mt-4 text-xs text-smoke">
                Or{" "}
                <Link href="/campfires" className="text-flame-400 hover:underline">
                  explore campfires
                </Link>{" "}
                to find your community.
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
