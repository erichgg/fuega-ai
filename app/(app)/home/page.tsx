"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/fuega/post-card";
import { FeedSort } from "@/components/fuega/feed-sort";
import { FeedSkeleton } from "@/components/fuega/page-skeleton";
import { useAuth } from "@/lib/contexts/auth-context";

type SortOption = "hot" | "new" | "top" | "rising";

interface Post {
  id: string;
  title: string;
  body?: string;
  author: string;
  community: string;
  sparkCount: number;
  commentCount: number;
  createdAt: string;
  moderation?: {
    action: "approved" | "flagged" | "removed";
    confidence?: number;
  };
}

// TEST_DATA - DELETE BEFORE PRODUCTION
const MOCK_POSTS: Post[] = [
  {
    id: "1",
    title: "Welcome to fuega.ai — the future of community discussion",
    body: "We're building something different here. A platform where AI moderation is transparent, communities govern themselves, and privacy is a right. Join the conversation.",
    author: "fuega_team",
    community: "meta",
    sparkCount: 247,
    commentCount: 89,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    moderation: { action: "approved", confidence: 0.98 },
  },
  {
    id: "2",
    title: "How AI moderation actually works on fuega — a deep dive",
    body: "Every post goes through Claude-based AI moderation in real-time. Here's exactly how it works, what prompts are used, and how you can change them through governance.",
    author: "transparency_fan",
    community: "tech",
    sparkCount: 182,
    commentCount: 45,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    moderation: { action: "approved", confidence: 0.95 },
  },
  {
    id: "3",
    title: "Proposal: Update f | science moderation prompt to allow more speculative discussion",
    body: "The current prompt is too strict on speculative content. I think we should allow more hypothesis-driven posts as long as they're clearly labeled.",
    author: "science_nerd_42",
    community: "science",
    sparkCount: 94,
    commentCount: 67,
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: "4",
    title: "Why spark/douse voting is better than upvote/downvote",
    body: "The spark/douse system isn't just a rename — it fundamentally changes the incentive structure. Here's my analysis of why it leads to better discussions.",
    author: "game_theory_nerd",
    community: "meta",
    sparkCount: 156,
    commentCount: 34,
    createdAt: new Date(Date.now() - 21600000).toISOString(),
    moderation: { action: "approved", confidence: 0.99 },
  },
  {
    id: "5",
    title: "First governance vote results are in! f | tech community prompt updated",
    body: "The community voted 78% in favor of adding more nuance to the tech community's moderation prompt. The new prompt takes effect immediately.",
    author: "governance_watch",
    community: "tech",
    sparkCount: 210,
    commentCount: 23,
    createdAt: new Date(Date.now() - 43200000).toISOString(),
    moderation: { action: "approved", confidence: 0.97 },
  },
];

export default function HomeFeedPage() {
  const { user, loading: authLoading } = useAuth();
  const [sort, setSort] = React.useState<SortOption>("hot");
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [votes, setVotes] = React.useState<
    Record<string, "sparked" | "doused" | null>
  >({});

  React.useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      let sorted = [...MOCK_POSTS];
      switch (sort) {
        case "new":
          sorted.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime(),
          );
          break;
        case "top":
          sorted.sort((a, b) => b.sparkCount - a.sparkCount);
          break;
        case "rising":
          sorted.sort((a, b) => b.commentCount - a.commentCount);
          break;
        default: // "hot" - default order
          break;
      }
      setPosts(sorted);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [sort]);

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
        {loading || authLoading ? (
          <FeedSkeleton />
        ) : posts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-ash-400">No posts yet. Be the first!</p>
          </div>
        ) : (
          posts.map((post) => (
            <Link key={post.id} href={`/f/${post.community}/${post.id}`}>
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
