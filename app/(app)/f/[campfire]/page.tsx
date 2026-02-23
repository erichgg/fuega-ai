"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Users, Bot, Plus, Shield, Clock, Settings, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PostCard } from "@/components/fuega/post-card";
import { FeedSort } from "@/components/fuega/feed-sort";
import { CampfireSkeleton } from "@/components/fuega/page-skeleton";
import { useAuth } from "@/lib/contexts/auth-context";
import { useCampfire, useCampfireMembership } from "@/lib/hooks/useCampfires";
import { usePosts } from "@/lib/hooks/usePosts";
import { useVoting } from "@/lib/hooks/useVoting";
import { toPostCardData } from "@/lib/adapters/post-adapter";

type SortOption = "hot" | "new" | "top" | "rising";

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
  const {
    posts,
    loading: postsLoading,
    error: postsError,
    hasMore,
    loadMore,
  } = usePosts({ campfire: campfireSlug, sort });

  // Voting
  const { vote } = useVoting();
  const [votes, setVotes] = React.useState<
    Record<string, "sparked" | "doused" | null>
  >({});
  const [sparkDeltas, setSparkDeltas] = React.useState<Record<string, number>>(
    {},
  );

  // Membership
  const { join, leave, loading: membershipLoading, error: membershipError } = useCampfireMembership();
  const [joined, setJoined] = React.useState(false);

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
    if (sparkDeltas[p.id] !== undefined) {
      card.sparkCount += sparkDeltas[p.id] ?? 0;
    }
    return card;
  });

  const loading = campfireLoading || postsLoading;

  if (loading) return <CampfireSkeleton />;

  if (campfireError || !campfire) {
    return (
      <div className="py-16 text-center">
        <p className="text-ash-400">
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
      {/* Campfire Header */}
      <div className="rounded-lg border border-ash-800 bg-ash-900/50 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-flame-400">
              <span className="text-lava-hot">f</span>
              <span className="text-smoke mx-1">|</span>
              <span>{campfire.name}</span>
            </h1>
            <p className="mt-1 text-sm text-ash-400">
              {campfire.description}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ash-500">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {(campfire.member_count ?? 0).toLocaleString()} members
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Created{" "}
                {new Date(campfire.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {user && (
              <Button
                variant={joined ? "outline" : "spark"}
                size="sm"
                onClick={handleToggleMembership}
                disabled={membershipLoading}
                className={
                  joined
                    ? "border-ash-700 text-ash-400 hover:border-red-500/50 hover:text-red-400"
                    : ""
                }
              >
                {membershipLoading
                  ? "..."
                  : joined
                    ? "Joined"
                    : "Join"}
              </Button>
            )}
            {membershipError && (
              <div className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5" />
                {membershipError}
              </div>
            )}
          </div>
        </div>

        {/* Tender info (public) */}
        <div className="mt-4 rounded-lg border border-ash-800/50 bg-ash-950/50 p-3">
          <div className="flex items-center gap-2 text-xs text-ash-500">
            <Bot className="h-3.5 w-3.5" />
            <span className="font-medium">Tender</span>
            <Badge
              variant="outline"
              className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]"
            >
              <Shield className="mr-1 h-2.5 w-2.5" />
              Active
            </Badge>
          </div>
          <p className="mt-2 text-xs text-ash-400 leading-relaxed">
            Tender compiled from this campfire&apos;s governance variables.
            All decisions logged publicly.
          </p>
          <Link
            href={`/governance?campfire=${campfire.name}`}
            className="mt-2 inline-flex items-center gap-1 text-[10px] text-flame-400 hover:underline"
          >
            <Settings className="h-3 w-3" />
            View governance settings
          </Link>
        </div>
      </div>

      {/* Feed controls */}
      <div className="mt-4 flex items-center justify-between gap-4">
        <FeedSort active={sort} onChange={setSort} />
        {user && (
          <Link href={`/submit?campfire=${campfire.name}`}>
            <Button variant="spark" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Post</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Posts */}
      <div className="mt-4 space-y-2">
        {postsError ? (
          <div className="py-16 text-center">
            <p className="text-red-400">{postsError}</p>
          </div>
        ) : postCards.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-ash-400">
              No posts in{" "}
              <span className="text-lava-hot">f</span>
              <span className="text-smoke mx-1">|</span>
              <span>{campfire.name}</span> yet. Be the first!
            </p>
          </div>
        ) : (
          <>
            {postCards.map((post) => (
              <Link key={post.id} href={`/f/${campfire.name}/${post.id}`}>
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
                className="w-full py-3 text-center text-xs text-ash-400 hover:text-flame-400 transition-colors"
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
