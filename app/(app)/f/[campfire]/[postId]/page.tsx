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
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SparkButton } from "@/components/fuega/spark-button";
import { CommentCard } from "@/components/fuega/comment-card";
import { UserAvatar } from "@/components/fuega/user-avatar";
import { ModBadge } from "@/components/fuega/mod-badge";
import { PostDetailSkeleton } from "@/components/fuega/page-skeleton";
import { useAuth } from "@/lib/contexts/auth-context";
import { usePost } from "@/lib/hooks/usePosts";
import { useComments, useCreateComment } from "@/lib/hooks/useComments";
import { useVoting } from "@/lib/hooks/useVoting";
import { toPostCardData, flattenCommentsForDisplay } from "@/lib/adapters/post-adapter";
import { timeAgo } from "@/lib/utils/time-ago";

export default function PostDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const campfireSlug = params.campfire as string;
  const postId = params.postId as string;

  // Fetch post + comments from API
  const {
    post: rawPost,
    loading: postLoading,
    error: postError,
    refresh: refreshPost,
  } = usePost(postId);
  const {
    comments: rawComments,
    loading: commentsLoading,
    error: commentsError,
    refresh: refreshComments,
  } = useComments(postId);
  const { createComment, creating, error: commentError } = useCreateComment();
  const { vote } = useVoting();

  // Local state
  const [postVote, setPostVote] = React.useState<
    "sparked" | "doused" | null
  >(null);
  const [postSparkDelta, setPostSparkDelta] = React.useState(0);
  const [commentVotes, setCommentVotes] = React.useState<
    Record<string, "sparked" | "doused" | null>
  >({});
  const [commentText, setCommentText] = React.useState("");

  // Convert to UI shapes
  const post = rawPost ? toPostCardData(rawPost) : null;
  const displayComments = flattenCommentsForDisplay(rawComments);

  const handlePostVote = async (voteType: "spark" | "douse") => {
    const current = postVote;
    const newState = voteType === "spark" ? "sparked" : "doused";

    if (current === newState) {
      setPostVote(null);
      setPostSparkDelta(0);
    } else {
      setPostVote(newState);
      setPostSparkDelta(voteType === "spark" ? 1 : -1);
    }

    try {
      await vote("post", postId, voteType);
    } catch {
      setPostVote(current);
      setPostSparkDelta(0);
    }
  };

  const handleCommentVote = async (
    commentId: string,
    voteType: "spark" | "douse",
  ) => {
    const current = commentVotes[commentId] ?? null;
    const newState = voteType === "spark" ? "sparked" : "doused";

    setCommentVotes((prev) => ({
      ...prev,
      [commentId]: current === newState ? null : newState,
    }));

    try {
      await vote("comment", commentId, voteType);
    } catch {
      setCommentVotes((prev) => ({ ...prev, [commentId]: current }));
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || creating) return;

    try {
      await createComment({
        post_id: postId,
        body: commentText.trim(),
      });
      setCommentText("");
      refreshComments();
      refreshPost();
    } catch {
      // Error handled by hook
    }
  };

  const loading = postLoading || commentsLoading;

  if (loading) return <PostDetailSkeleton />;
  if (postError || !post) {
    return (
      <div className="py-16 text-center">
        <p className="text-ash">{postError ?? "Post not found"}</p>
        <Link
          href={`/f/${campfireSlug}`}
          className="mt-2 inline-block text-xs text-flame-400 hover:underline"
        >
          ← Back to campfire
        </Link>
      </div>
    );
  }

  const isOwner = user?.username === post.author;
  const adjustedSparkCount = post.sparkCount + postSparkDelta;

  return (
    <div className="max-w-5xl">
      {/* Back link */}
      <Link
        href={`/f/${campfireSlug}`}
        className="inline-flex items-center gap-1.5 text-sm text-smoke transition-colors hover:text-ash"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span className="text-lava-hot">f</span>
        <span className="text-smoke mx-1">|</span>
        <span>{campfireSlug}</span>
      </Link>

      {/* Post */}
      <article className="mt-4 rounded-md border border-charcoal bg-coal p-4">
        {/* Meta */}
        <div className="flex items-center gap-2 text-xs font-mono text-smoke">
          <Link
            href={`/f/${post.campfire}`}
            className="font-medium text-flame-400 hover:underline"
          >
            <span className="text-lava-hot">f</span>
            <span className="text-smoke mx-1">|</span>
            <span>{post.campfire}</span>
          </Link>
          <span>·</span>
          <UserAvatar username={post.author} size="sm" />
          <Link href={`/u/${post.author}`} className="hover:underline">
            {post.author}
          </Link>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo(post.createdAt)}
          </span>
          {rawPost?.edited_at && (
            <span className="text-smoke/60">(edited)</span>
          )}
          {post.moderation && (
            <ModBadge
              action={post.moderation.action}
              confidence={post.moderation.confidence}
            />
          )}
        </div>

        <h1 className="mt-2 text-xl font-bold text-foreground">
          {post.title}
        </h1>

        {post.body && (
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ash">
            {post.body}
          </div>
        )}

        {/* Action bar — inline voting */}
        <div className="mt-4 flex items-center gap-4 text-xs text-smoke">
          <SparkButton
            sparkCount={adjustedSparkCount}
            userVote={postVote}
            onVote={handlePostVote}
            variant="horizontal"
          />
          <span className="flex items-center gap-1.5 font-mono" aria-label={`${post.commentCount} comments`}>
            <MessageSquare className="h-3.5 w-3.5" />
            {post.commentCount}
          </span>
          <button
            onClick={() => { navigator.clipboard.writeText(window.location.href); }}
            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
            aria-label="Share post"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
          <button
            onClick={() => { alert("Reporting is coming soon."); }}
            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
            aria-label="Report post"
          >
            <Flag className="h-3.5 w-3.5" />
            Report
          </button>
          {isOwner && (
            <>
              <button className="flex items-center gap-1.5 text-smoke/50 cursor-not-allowed" aria-label="Edit post" disabled title="Editing coming soon">
                <Edit3 className="h-3.5 w-3.5" />
                Edit
              </button>
              <button className="flex items-center gap-1.5 text-smoke/50 cursor-not-allowed" aria-label="Delete post" disabled title="Deleting coming soon">
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </>
          )}
        </div>
      </article>

      {/* Comment form */}
      {user ? (
        <form
          onSubmit={handleSubmitComment}
          className="mt-4 rounded-lg border border-charcoal bg-charcoal/50 p-4"
        >
          <div className="flex items-start gap-3">
            <UserAvatar username={user.username} size="sm" />
            <div className="flex-1">
              <Textarea
                placeholder="Join the discussion..."
                aria-label="Write a comment"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
                className="min-h-[80px] resize-y border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50"
              />
              {commentError && (
                <div className="mt-2 flex items-center gap-2 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  {commentError}
                </div>
              )}
              <div className="mt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="spark"
                  size="sm"
                  disabled={!commentText.trim() || creating}
                  className="gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  {creating ? "Posting..." : "Comment"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mt-4 rounded-lg border border-charcoal bg-charcoal/50 p-4 text-center text-sm text-ash">
          <Link href="/login" className="text-flame-400 hover:underline">
            Log in
          </Link>{" "}
          to join the discussion
        </div>
      )}

      {/* Comments */}
      <div className="mt-4">
        <h2 className="text-sm font-medium text-ash">
          {displayComments.length}{" "}
          {displayComments.length === 1 ? "Comment" : "Comments"}
        </h2>
        {commentsError && (
          <p className="mt-2 text-xs text-red-400">{commentsError}</p>
        )}
        <div className="mt-3 space-y-0.5">
          {displayComments.length === 0 && !commentsError ? (
            <div className="py-10 text-center">
              <p className="text-sm text-smoke">No comments yet. Be the first to share your thoughts.</p>
            </div>
          ) : (
            displayComments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                userVote={commentVotes[comment.id] ?? null}
                onVote={(v) => handleCommentVote(comment.id, v)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
