"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Users, Bot, Plus, Shield, Clock, Settings, AlertCircle, MessageSquare, FileText, Flame, TrendingUp, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PostCard } from "@/components/fuega/post-card";
import { ReportDialog } from "@/components/fuega/report-dialog";
import { FeedSort } from "@/components/fuega/feed-sort";
import { FeedFilters } from "@/components/fuega/feed-filters";
import { ChatPanel } from "@/components/fuega/chat-panel";
import { CampfireSkeleton } from "@/components/fuega/page-skeleton";
import { useAuth } from "@/lib/contexts/auth-context";
import { useCampfire, useCampfireMembership } from "@/lib/hooks/useCampfires";
import { usePosts } from "@/lib/hooks/usePosts";
import { useOptimisticVoting } from "@/lib/hooks/useOptimisticVoting";
import { useInfiniteScroll } from "@/lib/hooks/useInfiniteScroll";
import { toPostCardData } from "@/lib/adapters/post-adapter";

type SortOption = "hot" | "new" | "top" | "rising";
type ViewMode = "posts" | "chat";

export default function CampfirePage() {
  const params = useParams();
  const { user } = useAuth();
  const campfireSlug = params.campfire as string;

  // Fetch campfire by name (slug)
  const {
    campfire,
    loading: campfireLoading,
    error: campfireError,
    refresh: refreshCampfire,
  } = useCampfire(campfireSlug);

  // Fetch posts for this campfire
  const [sort, setSort] = React.useState<SortOption>("hot");
  const [timeRange, setTimeRange] = React.useState<"all" | "today" | "week" | "month">("all");
  const [postType, setPostType] = React.useState<"all" | "text" | "link" | "image">("all");
  const {
    posts,
    loading: postsLoading,
    error: postsError,
    hasMore,
    loadMore,
  } = usePosts({ campfire: campfireSlug, sort, timeRange, postType });

  // Voting
  const { handleVote, getVote, getDelta } = useOptimisticVoting();
  const sentinelRef = useInfiniteScroll({
    hasMore,
    loading: postsLoading,
    onLoadMore: loadMore,
  });

  // View mode (posts vs chat)
  const [viewMode, setViewMode] = React.useState<ViewMode>("posts");

  // Report dialog
  const [reportPostId, setReportPostId] = React.useState<string | null>(null);

  // Membership
  const { join, leave, loading: membershipLoading, error: membershipError } = useCampfireMembership();
  const [joined, setJoined] = React.useState(false);

  const handleToggleMembership = async () => {
    if (!campfire) return;
    try {
      if (joined) {
        await leave(campfire.id);
        setJoined(false);
      } else {
        await join(campfire.id);
        setJoined(true);
      }
      refreshCampfire();
    } catch {
      // Error handled by hook
    }
  };

  // Convert API posts to PostCard shape
  const postCards = posts.map((p) => {
    const card = toPostCardData(p);
    const delta = getDelta(p.id);
    if (delta !== 0) {
      card.sparkCount += delta;
    }
    return card;
  });

  const loading = campfireLoading || postsLoading;

  if (loading) return <CampfireSkeleton />;

  if (campfireError || !campfire) {
    return (
      <div className="py-16 text-center">
        <p className="text-ash">
          {campfireError ?? "Campfire not found"}
        </p>
        <Link
          href="/home"
          className="mt-2 inline-block text-xs text-flame-400 hover:underline"
        >
          ← Back to home
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Campfire Hearth — Banner + Header */}
      <div className="rounded-lg border border-charcoal overflow-hidden">
        {/* Banner gradient (future: campfire.banner_url image) */}
        <div
          className="h-24 sm:h-32 relative"
          style={{
            background: `linear-gradient(135deg, var(--lava-hot) 0%, var(--ember) 50%, #1a0a00 100%)`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-coal/80 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-coal border-2 border-lava-hot/40">
                <Flame className="h-6 w-6 text-lava-hot" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white drop-shadow-lg font-mono">
                  <span className="text-flame-400">f</span>
                  <span className="text-white/60 mx-0.5">|</span>
                  <span>{campfire.name}</span>
                </h1>
              </div>
            </div>
            {user && (
              <Button
                variant={joined ? "outline" : "spark"}
                size="sm"
                onClick={handleToggleMembership}
                disabled={membershipLoading}
                className={
                  joined
                    ? "border-white/30 text-white hover:border-red-500/50 hover:text-red-400 bg-black/30 backdrop-blur-sm"
                    : "shadow-lg"
                }
              >
                {membershipLoading ? "..." : joined ? "Joined" : "Join"}
              </Button>
            )}
          </div>
        </div>

        {/* Info section */}
        <div className="bg-charcoal/50 p-4">
          <p className="text-sm text-ash">{campfire.description}</p>
          {membershipError && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5" />
              {membershipError}
            </div>
          )}

          {/* Stats bar */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-smoke font-mono">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span className="text-foreground font-semibold">{(campfire.member_count ?? 0).toLocaleString()}</span>
              members
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-foreground font-semibold">{postCards.length}</span>
              posts
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {new Date(campfire.created_at).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Quick links row */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/f/${campfire.name}/settings`}
              className="inline-flex items-center gap-1 rounded-md border border-charcoal bg-coal/50 px-2.5 py-1 text-[10px] font-mono text-ash transition-colors hover:border-lava-hot/30 hover:text-flame-400"
            >
              <Settings className="h-3 w-3" />
              Settings
            </Link>
            <Link
              href={`/mod-log?campfire=${campfire.name}`}
              className="inline-flex items-center gap-1 rounded-md border border-charcoal bg-coal/50 px-2.5 py-1 text-[10px] font-mono text-ash transition-colors hover:border-lava-hot/30 hover:text-flame-400"
            >
              <Shield className="h-3 w-3" />
              Mod Log
            </Link>
            <Link
              href={`/governance?campfire=${campfire.name}`}
              className="inline-flex items-center gap-1 rounded-md border border-charcoal bg-coal/50 px-2.5 py-1 text-[10px] font-mono text-ash transition-colors hover:border-lava-hot/30 hover:text-flame-400"
            >
              <Vote className="h-3 w-3" />
              Governance
            </Link>
            <div className="flex items-center gap-1.5 ml-auto text-[10px] text-smoke">
              <Bot className="h-3 w-3" />
              <span className="font-mono">Tender</span>
              <Badge
                variant="outline"
                className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]"
              >
                <Shield className="mr-0.5 h-2.5 w-2.5" />
                Active
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Content below banner constrained */}
      <div className="max-w-5xl">
      {/* View mode tabs */}
      <div className="mt-4 flex items-center gap-1 rounded-lg border border-charcoal bg-charcoal/50 p-1" role="tablist">
        <button
          role="tab"
          aria-selected={viewMode === "posts"}
          onClick={() => setViewMode("posts")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            viewMode === "posts"
              ? "bg-flame-500/20 text-flame-400"
              : "text-ash hover:text-foreground hover:bg-charcoal/50"
          }`}
        >
          <FileText className="h-4 w-4" />
          Posts
        </button>
        <button
          role="tab"
          aria-selected={viewMode === "chat"}
          onClick={() => setViewMode("chat")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            viewMode === "chat"
              ? "bg-flame-500/20 text-flame-400"
              : "text-ash hover:text-foreground hover:bg-charcoal/50"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Chat
        </button>
        <div className="flex-1" />
        {viewMode === "posts" && user && (
          <Link href={`/submit?campfire=${campfire.name}`}>
            <Button variant="spark" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Post</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Posts view */}
      {viewMode === "posts" && (
        <>
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
          <div className="mt-3 space-y-2">
            {postsError ? (
              <div className="py-16 text-center">
                <p className="text-red-400">{postsError}</p>
              </div>
            ) : postCards.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-coal border border-charcoal">
                  <FileText className="h-7 w-7 text-smoke" />
                </div>
                <p className="text-lg font-medium text-ash">
                  No posts in{" "}
                  <span className="text-flame-400">f</span>
                  <span className="text-smoke mx-0.5">|</span>
                  <span className="text-flame-400">{campfire.name}</span>
                </p>
                <p className="mt-1 text-sm text-smoke">Be the first to start a conversation here.</p>
                {user && (
                  <Link
                    href="/submit"
                    className="mt-4 inline-flex items-center gap-1.5 bg-flame-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-flame-600"
                  >
                    Create a post
                  </Link>
                )}
              </div>
            ) : (
              <>
                {postCards.map((post) => (
                  <Link key={post.id} href={`/f/${campfire.name}/${post.id}`}>
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
        </>
      )}

      {/* Chat view */}
      {viewMode === "chat" && (
        <div className="mt-3">
          <ChatPanel
            campfireId={campfire.id}
          />
        </div>
      )}
      </div>{/* end max-w-5xl */}

      {/* Report dialog */}
      <ReportDialog
        open={reportPostId !== null}
        onOpenChange={(open) => { if (!open) setReportPostId(null); }}
        postId={reportPostId ?? undefined}
      />
    </div>
  );
}
