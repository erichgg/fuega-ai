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
import { useAuth } from "@/lib/contexts/auth-context";
import { usePosts } from "@/lib/hooks/usePosts";
import { useOptimisticVoting } from "@/lib/hooks/useOptimisticVoting";
import { useInfiniteScroll } from "@/lib/hooks/useInfiniteScroll";
import { toPostCardData } from "@/lib/adapters/post-adapter";

type SortOption = "hot" | "new" | "top" | "rising";
type TimeRange = "all" | "today" | "week" | "month";
type PostType = "all" | "text" | "link" | "image";

// ---------------------------------------------------------------------------
// Header config — optional icon + title + description above the toolbar
// ---------------------------------------------------------------------------

interface FeedHeader {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Empty state config — customizable icon, title, subtitle, CTA
// ---------------------------------------------------------------------------

interface FeedEmptyState {
  /** Lucide icon component, or undefined for emoji-based empty state */
  icon?: React.ComponentType<{ className?: string }>;
  /** Emoji to render (used when icon is not provided) */
  emoji?: string;
  title: string;
  subtitle: string;
  /** Label for the primary CTA button. If omitted, no CTA is shown. */
  ctaLabel?: string;
  /** Label for the CTA shown to logged-out users */
  ctaLabelLoggedOut?: string;
  /** Additional JSX rendered below the CTA (e.g. an "explore campfires" link) */
  footer?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// FeedTemplate props
// ---------------------------------------------------------------------------

export interface FeedTemplateProps {
  /** Page title set via document.title */
  pageTitle: string;
  /** Default sort when the feed first loads */
  defaultSort: SortOption;
  /** Optional header block (icon + title + description) */
  header?: FeedHeader;
  /** Empty state configuration */
  emptyState: FeedEmptyState;
  /** Content rendered before the QuickComposer (e.g. WelcomeBanner) */
  beforeComposer?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FeedTemplate({
  pageTitle,
  defaultSort,
  header,
  emptyState,
  beforeComposer,
}: FeedTemplateProps) {
  const { user } = useAuth();

  React.useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  const [sort, setSort] = React.useState<SortOption>(defaultSort);
  const [timeRange, setTimeRange] = React.useState<TimeRange>("all");
  const [postType, setPostType] = React.useState<PostType>("all");

  const { posts, loading, error, hasMore, loadMore, refresh } = usePosts({
    sort,
    timeRange,
    postType,
  });
  const { handleVote, getVote, getDelta } = useOptimisticVoting();
  const sentinelRef = useInfiniteScroll({
    hasMore,
    loading,
    onLoadMore: loadMore,
  });

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
      {beforeComposer}
      <QuickComposer className="mb-4" />

      {/* Optional header with icon + title + description */}
      {header ? (
        <>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <header.icon className="h-5 w-5 text-flame-400" />
              <h1 className="text-xl font-bold text-foreground">
                {header.title}
              </h1>
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
          <p className="mt-1 text-sm text-smoke">{header.description}</p>
          <div className="mt-3">
            <FeedToolbar
              sort={sort}
              onSortChange={setSort}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              postType={postType}
              onPostTypeChange={setPostType}
            />
          </div>
        </>
      ) : (
        /* No header — toolbar + create button on the same row (home page style) */
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
      )}

      {/* Feed content */}
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
          <FeedEmptyBlock
            config={emptyState}
            user={user}
          />
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
        onOpenChange={(open) => {
          if (!open) setReportPostId(null);
        }}
        postId={reportPostId ?? undefined}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal: Empty state block
// ---------------------------------------------------------------------------

interface FeedEmptyBlockProps {
  config: FeedEmptyState;
  user: { username: string } | null | undefined;
}

function FeedEmptyBlock({ config, user }: FeedEmptyBlockProps) {
  const Icon = config.icon;
  const hasCta = config.ctaLabel || config.ctaLabelLoggedOut;

  return (
    <div className="py-16 text-center">
      {Icon ? (
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-coal border border-charcoal">
          <Icon className="h-7 w-7 text-smoke" />
        </div>
      ) : config.emoji ? (
        <div className="mx-auto mb-6 text-5xl" aria-hidden="true">
          {config.emoji}
        </div>
      ) : null}

      <p className={Icon ? "text-lg font-medium text-ash" : "text-lg font-medium text-foreground"}>
        {config.title}
      </p>
      <p className="mt-1 text-sm text-smoke">{config.subtitle}</p>

      {hasCta && (
        <Link
          href={user ? "/submit" : "/signup"}
          className="mt-4 inline-flex items-center gap-1.5 bg-flame-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-flame-600 rounded-md"
        >
          <Plus className="h-4 w-4" />
          {user ? config.ctaLabel : (config.ctaLabelLoggedOut ?? config.ctaLabel)}
        </Link>
      )}

      {config.footer}
    </div>
  );
}
