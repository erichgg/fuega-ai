"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  X,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { SparkButton } from "@/components/fuega/spark-button";
import { CommentCard } from "@/components/fuega/comment-card";
import { UserHoverCard } from "@/components/fuega/user-hover-card";
import { UserAvatar } from "@/components/fuega/user-avatar";
import { ModBadge } from "@/components/fuega/mod-badge";
import { PostDetailSkeleton } from "@/components/fuega/page-skeleton";
import { ReportDialog } from "@/components/fuega/report-dialog";
import { MarkdownContent } from "@/components/fuega/markdown-content";
import { VideoEmbed, isVideoUrl } from "@/components/fuega/video-embed";
import { useAuth } from "@/lib/contexts/auth-context";
import { usePost } from "@/lib/hooks/usePosts";
import { useComments, useCreateComment, useEditComment, useDeleteComment } from "@/lib/hooks/useComments";
import { useVoting } from "@/lib/hooks/useVoting";
import { api, ApiError } from "@/lib/api/client";
import { toast } from "sonner";
import { toPostCardData, flattenCommentsForDisplay } from "@/lib/adapters/post-adapter";
import { timeAgo } from "@/lib/utils/time-ago";

const MAX_COMMENT_LENGTH = 10000;

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
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
  const { createComment, creating, error: commentError, clearError: clearCommentError } = useCreateComment();
  const { editComment } = useEditComment();
  const { deleteComment: deleteCommentApi } = useDeleteComment();
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

  // Edit mode state
  const [editing, setEditing] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState("");
  const [editBody, setEditBody] = React.useState("");
  const [editSaving, setEditSaving] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  // Delete state — now uses Dialog instead of window.confirm
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // Comment delete confirmation
  const [deleteCommentId, setDeleteCommentId] = React.useState<string | null>(null);
  const [deletingComment, setDeletingComment] = React.useState(false);

  // Share copied state
  const [shareCopied, setShareCopied] = React.useState(false);

  // Report dialog state — supports posts and comments
  const [reportOpen, setReportOpen] = React.useState(false);
  const [reportCommentId, setReportCommentId] = React.useState<string | undefined>(undefined);

  // Reply state
  const [replyingTo, setReplyingTo] = React.useState<string | null>(null);

  // Thread collapse state
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());

  const toggleCollapse = (commentId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  // Page title
  React.useEffect(() => {
    if (rawPost) {
      document.title = `${rawPost.title} - fuega`;
    }
  }, [rawPost]);

  // Load user's existing vote state on page load
  React.useEffect(() => {
    if (!user || !postId) return;
    let cancelled = false;

    api.get<{ vote_value: number | null; comment_votes?: Record<string, number> }>(
      `/api/posts/${postId}/vote`,
      { include_comments: "true" },
    ).then((data) => {
      if (cancelled) return;
      if (data.vote_value === 1) {
        setPostVote("sparked");
      } else if (data.vote_value === -1) {
        setPostVote("doused");
      } else {
        setPostVote(null);
      }
      if (data.comment_votes) {
        const mapped: Record<string, "sparked" | "doused" | null> = {};
        for (const [cid, val] of Object.entries(data.comment_votes)) {
          mapped[cid] = val === 1 ? "sparked" : val === -1 ? "doused" : null;
        }
        setCommentVotes(mapped);
      }
    }).catch(() => {
      // Silently fail — user may not be authenticated or endpoint may 401
    });

    return () => { cancelled = true; };
  }, [user, postId]);

  // Convert to UI shapes
  const post = rawPost ? toPostCardData(rawPost) : null;
  const displayComments = flattenCommentsForDisplay(rawComments);

  // --- Edit handlers ---
  const handleStartEdit = () => {
    if (!rawPost) return;
    setEditTitle(rawPost.title);
    setEditBody(rawPost.body ?? "");
    setEditError(null);
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!rawPost) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await api.patch(`/api/posts/${postId}`, {
        title: editTitle,
        body: editBody || null,
      });
      setEditing(false);
      toast.success("Post updated");
      await refreshPost();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Failed to save changes");
    } finally {
      setEditSaving(false);
    }
  };

  // --- Delete handler (with Dialog) ---
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/posts/${postId}`);
      toast.success("Post deleted");
      router.push(`/f/${campfireSlug}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete post");
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // --- Comment delete handler ---
  const handleDeleteComment = async () => {
    if (!deleteCommentId) return;
    setDeletingComment(true);
    try {
      await deleteCommentApi(deleteCommentId);
      toast.success("Comment deleted");
      setDeleteCommentId(null);
      refreshComments();
      refreshPost();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete comment");
    } finally {
      setDeletingComment(false);
    }
  };

  // --- Comment edit handler ---
  const handleEditComment = async (commentId: string, body: string) => {
    await editComment(commentId, body);
    toast.success("Comment updated");
    refreshComments();
  };

  // --- Reply handler ---
  const handleSubmitReply = async (parentId: string, body: string) => {
    await createComment({
      post_id: postId,
      body,
      parent_id: parentId,
    });
    setReplyingTo(null);
    refreshComments();
    refreshPost();
  };

  // --- Report handlers ---
  const handleReportPost = () => {
    setReportCommentId(undefined);
    setReportOpen(true);
  };

  const handleReportComment = (commentId: string) => {
    setReportCommentId(commentId);
    setReportOpen(true);
  };

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
      toast.error("Failed to vote");
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
      toast.error("Failed to vote");
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
          &larr; Back to campfire
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
          <span>&middot;</span>
          <UserAvatar username={post.author} size="sm" />
          <Link href={`/u/${post.author}`} className="hover:underline">
            {post.author}
          </Link>
          <span>&middot;</span>
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

        {editing ? (
          <div className="mt-3 space-y-3">
            <div>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Post title"
                className="border-charcoal bg-coal text-foreground font-bold placeholder:text-smoke focus-visible:ring-flame-500/50"
                maxLength={300}
                aria-label="Edit title"
              />
            </div>
            <div>
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                placeholder="Post body (optional)"
                rows={6}
                className="min-h-[120px] resize-y border-charcoal bg-coal text-ash placeholder:text-smoke focus-visible:ring-flame-500/50"
                maxLength={40000}
                aria-label="Edit body"
              />
            </div>
            {editError && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {editError}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="spark"
                size="sm"
                onClick={handleSaveEdit}
                disabled={editSaving || !editTitle.trim()}
                className="gap-1.5"
              >
                {editSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                {editSaving ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                disabled={editSaving}
                className="gap-1.5 text-smoke hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="mt-2 text-xl font-bold text-foreground">
              {post.title}
            </h1>

            {post.body && (
              <MarkdownContent content={post.body} className="mt-3" />
            )}

            {/* Video embed for link posts */}
            {rawPost?.url && isVideoUrl(rawPost.url) && (
              <VideoEmbed url={rawPost.url} className="mt-3" />
            )}

            {/* Image display for image posts */}
            {rawPost?.image_url && (
              <div className="mt-3 overflow-hidden rounded-md border border-charcoal">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={rawPost.image_url}
                  alt={post.title}
                  className="max-h-[600px] w-full object-contain bg-black/20"
                />
              </div>
            )}

            {/* Link domain for link posts (non-video) */}
            {rawPost?.url && !isVideoUrl(rawPost.url) && (
              <a
                href={rawPost.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-flame-400 hover:underline font-mono"
                onClick={(e) => e.stopPropagation()}
              >
                {"↗ "}{(() => { try { return new URL(rawPost.url).hostname; } catch { return rawPost.url; } })()}
              </a>
            )}
          </>
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
            onClick={() => {
              navigator.clipboard.writeText(window.location.href).then(() => {
                setShareCopied(true);
                toast.success("Link copied!");
                setTimeout(() => setShareCopied(false), 2000);
              });
            }}
            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
            aria-label="Share post"
          >
            {shareCopied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
            {shareCopied ? "Copied!" : "Share"}
          </button>
          <button
            onClick={handleReportPost}
            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
            aria-label="Report post"
          >
            <Flag className="h-3.5 w-3.5" />
            Report
          </button>
          {isOwner && !editing && (
            <>
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-1.5 transition-colors hover:text-foreground"
                aria-label="Edit post"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit
              </button>
              <button
                onClick={() => setDeleteDialogOpen(true)}
                disabled={deleting}
                className="flex items-center gap-1.5 transition-colors hover:text-red-400 disabled:opacity-50"
                aria-label="Delete post"
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                {deleting ? "Deleting..." : "Delete"}
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
                onChange={(e) => {
                  setCommentText(e.target.value);
                  // Clear error when user starts typing
                  if (commentError) clearCommentError();
                }}
                rows={3}
                maxLength={MAX_COMMENT_LENGTH}
                className="min-h-[80px] resize-y border-charcoal bg-coal placeholder:text-smoke focus-visible:ring-flame-500/50"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-smoke">
                  {commentText.length.toLocaleString()}/{MAX_COMMENT_LENGTH.toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  {commentError && (
                    <div className="flex items-center gap-1.5 text-xs text-red-400">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {commentError}
                    </div>
                  )}
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
            (() => {
              // Build a set of comment IDs whose ancestors are collapsed
              const hiddenIds = new Set<string>();
              for (let i = 0; i < displayComments.length; i++) {
                const c = displayComments[i]!;
                if (collapsed.has(c.id)) {
                  // Hide all subsequent comments with greater depth (descendants in flat list)
                  for (let j = i + 1; j < displayComments.length; j++) {
                    const next = displayComments[j]!;
                    if (next.depth > c.depth) {
                      hiddenIds.add(next.id);
                    } else {
                      break;
                    }
                  }
                }
              }

              return displayComments.map((comment) => {
                if (hiddenIds.has(comment.id)) return null;

                const isCollapsed = collapsed.has(comment.id);

                return (
                  <div key={comment.id}>
                    {isCollapsed ? (
                      <button
                        onClick={() => toggleCollapse(comment.id)}
                        className="flex w-full items-center gap-1.5 py-2 text-left text-xs font-mono text-smoke transition-colors hover:text-ash"
                        style={{ paddingLeft: `${Math.min(comment.depth, 3) * 1.5}rem` }}
                      >
                        <span className="text-smoke hover:text-flame-400">[+]</span>
                        <span className="font-medium text-ash">{comment.author}</span>
                        {" \u00b7 "}
                        {comment.totalDescendants}{" "}
                        {comment.totalDescendants === 1 ? "reply" : "replies"}
                        {" \u00b7 click to expand"}
                      </button>
                    ) : (
                      <CommentCard
                        comment={comment}
                        userVote={commentVotes[comment.id] ?? null}
                        onVote={(v) => handleCommentVote(comment.id, v)}
                        currentUser={user?.username ?? null}
                        onReply={(id) => setReplyingTo(replyingTo === id ? null : id)}
                        isReplying={replyingTo === comment.id}
                        onSubmitReply={handleSubmitReply}
                        onCancelReply={() => setReplyingTo(null)}
                        onReport={handleReportComment}
                        onEdit={handleEditComment}
                        onDelete={(id) => setDeleteCommentId(id)}
                        collapseToggle={
                          comment.totalDescendants > 0 ? (
                            <button
                              onClick={() => toggleCollapse(comment.id)}
                              className="shrink-0 text-xs font-mono text-smoke transition-colors hover:text-flame-400"
                              aria-label="Collapse thread"
                              title="Collapse thread"
                            >
                              [{"\u2013"}]
                            </button>
                          ) : undefined
                        }
                      />
                    )}
                  </div>
                );
              });
            })()
          )}
        </div>
      </div>

      {/* Report dialog — supports both posts and comments */}
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        postId={reportCommentId ? undefined : postId}
        commentId={reportCommentId}
      />

      {/* Delete post confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="border-charcoal bg-coal sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Trash2 className="h-4 w-4 text-red-400" />
              Delete Post
            </DialogTitle>
            <DialogDescription className="text-smoke">
              Are you sure you want to delete this post? This action cannot be undone.
              All comments on this post will also be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
              className="text-smoke hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-1.5"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Post
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete comment confirmation dialog */}
      <Dialog open={deleteCommentId !== null} onOpenChange={(open) => { if (!open) setDeleteCommentId(null); }}>
        <DialogContent className="border-charcoal bg-coal sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Trash2 className="h-4 w-4 text-red-400" />
              Delete Comment
            </DialogTitle>
            <DialogDescription className="text-smoke">
              Are you sure you want to delete this comment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeleteCommentId(null)}
              disabled={deletingComment}
              className="text-smoke hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteComment}
              disabled={deletingComment}
              className="gap-1.5"
            >
              {deletingComment ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Comment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
