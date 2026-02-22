"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Share2,
  Flag,
  Clock,
  Edit3,
  Trash2,
  MessageSquare,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SparkButton } from "@/components/fuega/spark-button";
import { CommentCard } from "@/components/fuega/comment-card";
import { UserAvatar } from "@/components/fuega/user-avatar";
import { ModBadge } from "@/components/fuega/mod-badge";
import { PostDetailSkeleton } from "@/components/fuega/page-skeleton";
import { useAuth } from "@/lib/contexts/auth-context";

// TEST_DATA - DELETE BEFORE PRODUCTION
function getMockPost(community: string, postId: string) {
  return {
    id: postId,
    title: "Welcome to fuega.ai — the future of community discussion",
    body: `We're building something different here. A platform where AI moderation is transparent, communities govern themselves, and privacy is a right.\n\nEvery moderation decision is public. Every community writes its own AI moderator prompt. Every voice matters.\n\nHere's what makes fuega different:\n\n1. **Transparent AI moderation** — Every decision logged publicly with reasoning\n2. **Community governance** — You write and vote on moderation rules\n3. **True anonymity** — No email required, IPs hashed and deleted\n4. **Spark & Douse** — Vote on quality, not popularity\n\nJoin the conversation. Shape the rules. Build something better.`,
    author: "fuega_team",
    community,
    sparkCount: 247,
    commentCount: 5,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    editedAt: null as string | null,
    moderation: { action: "approved" as const, confidence: 0.98 },
  };
}

// TEST_DATA - DELETE BEFORE PRODUCTION
function getMockComments() {
  return [
    {
      id: "cm1",
      body: "This is exactly what online discussion needs. Tired of opaque moderation and shadow bans. Looking forward to seeing how governance evolves.",
      author: "early_adopter",
      sparkCount: 45,
      replyCount: 2,
      createdAt: new Date(Date.now() - 2400000).toISOString(),
      depth: 0,
    },
    {
      id: "cm2",
      body: "Agreed! The transparency aspect is huge. Being able to see WHY something was moderated changes everything.",
      author: "transparency_fan",
      sparkCount: 23,
      replyCount: 0,
      createdAt: new Date(Date.now() - 2000000).toISOString(),
      depth: 1,
    },
    {
      id: "cm3",
      body: "How does the AI handle edge cases? Like satire or sarcasm?",
      author: "curious_mind",
      sparkCount: 18,
      replyCount: 1,
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      depth: 1,
    },
    {
      id: "cm4",
      body: "Great question. The AI uses confidence scores — low-confidence decisions get flagged for community review rather than auto-removed. Communities can tune this threshold through governance.",
      author: "fuega_team",
      sparkCount: 56,
      replyCount: 0,
      createdAt: new Date(Date.now() - 1200000).toISOString(),
      depth: 2,
    },
    {
      id: "cm5",
      body: "The Founder badge is a nice touch. Good incentive for early adoption.",
      author: "badge_collector",
      sparkCount: 12,
      replyCount: 0,
      createdAt: new Date(Date.now() - 600000).toISOString(),
      depth: 0,
    },
  ];
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

export default function PostDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const communitySlug = params.community as string;
  const postId = params.postId as string;

  const [post, setPost] = React.useState<ReturnType<typeof getMockPost> | null>(
    null,
  );
  const [comments, setComments] = React.useState<
    ReturnType<typeof getMockComments>
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [postVote, setPostVote] = React.useState<
    "sparked" | "doused" | null
  >(null);
  const [commentVotes, setCommentVotes] = React.useState<
    Record<string, "sparked" | "doused" | null>
  >({});
  const [commentText, setCommentText] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPost(getMockPost(communitySlug, postId));
      setComments(getMockComments());
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [communitySlug, postId]);

  const handlePostVote = (vote: "spark" | "douse") => {
    const voteState = vote === "spark" ? "sparked" : "doused";
    setPostVote((prev) => (prev === voteState ? null : voteState));
  };

  const handleCommentVote = (
    commentId: string,
    vote: "spark" | "douse",
  ) => {
    setCommentVotes((prev) => {
      const current = prev[commentId];
      const voteState = vote === "spark" ? "sparked" : "doused";
      return {
        ...prev,
        [commentId]: current === voteState ? null : voteState,
      };
    });
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);

    // Simulate API call
    await new Promise((r) => setTimeout(r, 500));

    setComments((prev) => [
      ...prev,
      {
        id: `cm-new-${Date.now()}`,
        body: commentText,
        author: user?.username ?? "anonymous",
        sparkCount: 0,
        replyCount: 0,
        createdAt: new Date().toISOString(),
        depth: 0,
      },
    ]);
    setCommentText("");
    setSubmitting(false);
  };

  if (loading) return <PostDetailSkeleton />;
  if (!post)
    return (
      <div className="py-16 text-center">
        <p className="text-ash-400">Post not found</p>
      </div>
    );

  const isOwner = user?.username === post.author;

  return (
    <div>
      {/* Back link */}
      <Link
        href={`/f/${communitySlug}`}
        className="inline-flex items-center gap-1.5 text-sm text-ash-500 transition-colors hover:text-ash-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span className="text-lava-hot">f</span><span className="text-smoke mx-1">|</span><span>{communitySlug}</span>
      </Link>

      {/* Post */}
      <article className="mt-4 rounded-lg border border-ash-800 bg-ash-900/50 p-4">
        <div className="flex gap-3">
          <SparkButton
            sparkCount={post.sparkCount}
            userVote={postVote}
            onVote={handlePostVote}
          />
          <div className="min-w-0 flex-1">
            {/* Meta */}
            <div className="flex items-center gap-2 text-xs text-ash-400">
              <Link
                href={`/f/${post.community}`}
                className="font-medium text-flame-400 hover:underline"
              >
                <span className="text-lava-hot">f</span><span className="text-smoke mx-1">|</span><span>{post.community}</span>
              </Link>
              <span>·</span>
              <UserAvatar username={post.author} size="sm" />
              <Link
                href={`/u/${post.author}`}
                className="hover:underline"
              >
                {post.author}
              </Link>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo(post.createdAt)}
              </span>
              {post.editedAt && (
                <span className="text-ash-600">(edited)</span>
              )}
              {post.moderation && (
                <ModBadge
                  action={post.moderation.action}
                  confidence={post.moderation.confidence}
                />
              )}
            </div>

            {/* Title */}
            <h1 className="mt-2 text-xl font-bold text-ash-100">
              {post.title}
            </h1>

            {/* Body */}
            {post.body && (
              <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ash-300">
                {post.body}
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex items-center gap-4 text-xs text-ash-500">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                {post.commentCount} comments
              </span>
              <button className="flex items-center gap-1.5 transition-colors hover:text-ash-300">
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
              <button className="flex items-center gap-1.5 transition-colors hover:text-ash-300">
                <Flag className="h-3.5 w-3.5" />
                Report
              </button>
              {isOwner && (
                <>
                  <button className="flex items-center gap-1.5 transition-colors hover:text-ash-300">
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button className="flex items-center gap-1.5 transition-colors hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* Comment form */}
      {user ? (
        <form
          onSubmit={handleSubmitComment}
          className="mt-4 rounded-lg border border-ash-800 bg-ash-900/50 p-4"
        >
          <div className="flex items-start gap-3">
            <UserAvatar username={user.username} size="sm" />
            <div className="flex-1">
              <Textarea
                placeholder="Join the discussion..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
                className="min-h-[80px] resize-y border-ash-800 bg-ash-950 placeholder:text-ash-600 focus-visible:ring-flame-500/50"
              />
              <div className="mt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="spark"
                  size="sm"
                  disabled={!commentText.trim() || submitting}
                  className="gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? "Posting..." : "Comment"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mt-4 rounded-lg border border-ash-800 bg-ash-900/50 p-4 text-center text-sm text-ash-400">
          <Link href="/login" className="text-flame-400 hover:underline">
            Log in
          </Link>{" "}
          to join the discussion
        </div>
      )}

      {/* Comments */}
      <div className="mt-4">
        <h2 className="text-sm font-medium text-ash-300">
          {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
        </h2>
        <div className="mt-3 space-y-0.5">
          {comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              userVote={commentVotes[comment.id] ?? null}
              onVote={(vote) => handleCommentVote(comment.id, vote)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
