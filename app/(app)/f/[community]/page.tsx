"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Users, Bot, Plus, Shield, Flame, Clock, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PostCard } from "@/components/fuega/post-card";
import { FeedSort } from "@/components/fuega/feed-sort";
import { CommunitySkeleton } from "@/components/fuega/page-skeleton";
import { useAuth } from "@/lib/contexts/auth-context";

type SortOption = "hot" | "new" | "top" | "rising";

// TEST_DATA - DELETE BEFORE PRODUCTION
function getMockCommunity(slug: string) {
  return {
    id: slug,
    name: slug,
    description: `Welcome to f | ${slug}. A community for open discussion about ${slug}-related topics with transparent AI moderation.`,
    category: "technology" as const,
    memberCount: 12400 + Math.floor(Math.random() * 5000),
    activeCount: 340 + Math.floor(Math.random() * 200),
    createdAt: "2024-01-15T00:00:00Z",
    aiPrompt:
      "Moderate content for quality and relevance. Allow disagreement but remove personal attacks. Flag misinformation for community review.",
    isJoined: false,
    isAdmin: false,
  };
}

// TEST_DATA - DELETE BEFORE PRODUCTION
function getMockPosts(community: string) {
  return [
    {
      id: "c1",
      title: `Best resources for learning about ${community} in 2026`,
      body: "I've compiled a list of the best resources for getting started. Would love to hear your recommendations too.",
      author: "helpful_user",
      community,
      sparkCount: 89,
      commentCount: 23,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      moderation: { action: "approved" as const, confidence: 0.96 },
    },
    {
      id: "c2",
      title: `Controversial take: ${community} needs to rethink its fundamentals`,
      body: "I know this might be unpopular, but hear me out. The way we approach this topic needs a fundamental rethink.",
      author: "critical_thinker",
      community,
      sparkCount: 156,
      commentCount: 89,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      moderation: { action: "flagged" as const, confidence: 0.72 },
    },
    {
      id: "c3",
      title: "Weekly discussion thread — share what you're working on",
      author: "community_bot",
      community,
      sparkCount: 45,
      commentCount: 67,
      createdAt: new Date(Date.now() - 14400000).toISOString(),
      moderation: { action: "approved" as const, confidence: 0.99 },
    },
  ];
}

export default function CommunityPage() {
  const params = useParams();
  const { user } = useAuth();
  const communitySlug = params.community as string;

  const [community, setCommunity] = React.useState<ReturnType<
    typeof getMockCommunity
  > | null>(null);
  const [posts, setPosts] = React.useState<ReturnType<typeof getMockPosts>>([]);
  const [sort, setSort] = React.useState<SortOption>("hot");
  const [loading, setLoading] = React.useState(true);
  const [joined, setJoined] = React.useState(false);
  const [votes, setVotes] = React.useState<
    Record<string, "sparked" | "doused" | null>
  >({});

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setCommunity(getMockCommunity(communitySlug));
      setPosts(getMockPosts(communitySlug));
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [communitySlug]);

  const handleVote = (postId: string, vote: "spark" | "douse") => {
    setVotes((prev) => {
      const current = prev[postId];
      const voteState = vote === "spark" ? "sparked" : "doused";
      return {
        ...prev,
        [postId]: current === voteState ? null : voteState,
      };
    });
  };

  if (loading) return <CommunitySkeleton />;
  if (!community)
    return (
      <div className="py-16 text-center">
        <p className="text-ash-400">Community not found</p>
      </div>
    );

  return (
    <div>
      {/* Community Header */}
      <div className="rounded-lg border border-ash-800 bg-ash-900/50 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-flame-400">
              <span className="text-lava-hot">f</span><span className="text-smoke mx-1">|</span><span>{community.name}</span>
            </h1>
            <p className="mt-1 text-sm text-ash-400">
              {community.description}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ash-500">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {community.memberCount.toLocaleString()} members
              </span>
              <span className="flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-flame-500" />
                {community.activeCount} active now
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Created{" "}
                {new Date(community.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {user && (
              <Button
                variant={joined ? "outline" : "spark"}
                size="sm"
                onClick={() => setJoined(!joined)}
                className={
                  joined
                    ? "border-ash-700 text-ash-400 hover:border-red-500/50 hover:text-red-400"
                    : ""
                }
              >
                {joined ? "Joined" : "Join"}
              </Button>
            )}
          </div>
        </div>

        {/* AI Prompt (public) */}
        <div className="mt-4 rounded-lg border border-ash-800/50 bg-ash-950/50 p-3">
          <div className="flex items-center gap-2 text-xs text-ash-500">
            <Bot className="h-3.5 w-3.5" />
            <span className="font-medium">AI Moderation Prompt</span>
            <Badge
              variant="outline"
              className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]"
            >
              <Shield className="mr-1 h-2.5 w-2.5" />
              Active
            </Badge>
          </div>
          <p className="mt-2 text-xs text-ash-400 italic leading-relaxed">
            &quot;{community.aiPrompt}&quot;
          </p>
          <Link
            href={`/governance?community=${community.name}`}
            className="mt-2 inline-flex items-center gap-1 text-[10px] text-flame-400 hover:underline"
          >
            <Settings className="h-3 w-3" />
            Propose changes via governance
          </Link>
        </div>
      </div>

      {/* Feed controls */}
      <div className="mt-4 flex items-center justify-between gap-4">
        <FeedSort active={sort} onChange={setSort} />
        {user && (
          <Link href={`/submit?community=${community.name}`}>
            <Button variant="spark" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Post</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Posts */}
      <div className="mt-4 space-y-2">
        {posts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-ash-400">
              No posts in <span className="text-lava-hot">f</span><span className="text-smoke mx-1">|</span><span>{community.name}</span> yet. Be the first!
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <Link key={post.id} href={`/f/${community.name}/${post.id}`}>
              <PostCard
                post={post}
                userVote={votes[post.id] ?? null}
                onVote={(vote) => handleVote(post.id, vote)}
              />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
