"use client";

import * as React from "react";
import type { ReactNode } from "react";
import {
  MessageSquare,
  Flag,
  Clock,
  Edit3,
  Trash2,
  X,
  Check,
  Loader2,
  Send,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SparkButton } from "@/components/fuega/spark-button";
import { UserAvatar } from "@/components/fuega/user-avatar";
import { UserHoverCard } from "@/components/fuega/user-hover-card";
import { ModBadge } from "@/components/fuega/mod-badge";
import { MarkdownContent } from "@/components/fuega/markdown-content";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils/time-ago";

const MAX_COMMENT_LENGTH = 10000;

interface CommentCardProps {
  comment: {
    id: string;
    body: string;
    author: string;
    sparkCount: number;
    replyCount: number;
    createdAt: string;
    depth: number;
    moderation?: {
      action: "approved" | "flagged" | "removed";
      confidence?: number;
    };
  };
  userVote: "sparked" | "doused" | null;
  onVote: (vote: "spark" | "douse") => void;
  /** Current logged-in username (null if not logged in) */
  currentUser?: string | null;
  /** Callback to start replying to this comment */
  onReply?: (commentId: string) => void;
  /** Whether the reply form is currently shown for this comment */
  isReplying?: boolean;
  /** Callback to submit a reply */
  onSubmitReply?: (parentId: string, body: string) => Promise<void>;
  /** Callback to cancel replying */
  onCancelReply?: () => void;
  /** Callback to report this comment */
  onReport?: (commentId: string) => void;
  /** Callback to save an edit */
  onEdit?: (commentId: string, body: string) => Promise<void>;
  /** Callback to delete this comment */
  onDelete?: (commentId: string) => void;
  collapseToggle?: ReactNode;
  className?: string;
}

export function CommentCard({
  comment,
  userVote,
  onVote,
  currentUser,
  onReply,
  isReplying,
  onSubmitReply,
  onCancelReply,
  onReport,
  onEdit,
  onDelete,
  collapseToggle,
  className,
}: CommentCardProps) {
  // Cap visual indent at 3 on mobile-first (4.5rem max)
  const indent = Math.min(comment.depth, 3);

  // Edit state
  const [editing, setEditing] = React.useState(false);
  const [editBody, setEditBody] = React.useState(comment.body);
  const [editSaving, setEditSaving] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  // Reply form state
  const [replyText, setReplyText] = React.useState("");
  const [replySubmitting, setReplySubmitting] = React.useState(false);
  const [replyError, setReplyError] = React.useState<string | null>(null);

  const isOwner = currentUser != null && currentUser === comment.author;
  const isLoggedIn = currentUser != null;

  const handleStartEdit = () => {
    setEditBody(comment.body);
    setEditError(null);
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!onEdit || !editBody.trim()) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await onEdit(comment.id, editBody.trim());
      setEditing(false);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Failed to save changes"
      );
    } finally {
      setEditSaving(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!onSubmitReply || !replyText.trim()) return;
    setReplySubmitting(true);
    setReplyError(null);
    try {
      await onSubmitReply(comment.id, replyText.trim());
      setReplyText("");
    } catch (err) {
      setReplyError(
        err instanceof Error ? err.message : "Failed to post reply"
      );
    } finally {
      setReplySubmitting(false);
    }
  };

  return (
    <div
      className={cn("relative", className)}
      style={{ marginLeft: `${indent * 1.5}rem` }}
      id={`comment-${comment.id}`}
    >
      {comment.depth > 0 && (
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-charcoal" />
      )}

      <div className="flex gap-2 py-2 ml-3">
        {collapseToggle && (
          <div className="flex items-start pt-1">
            {collapseToggle}
          </div>
        )}

        <SparkButton
          sparkCount={comment.sparkCount}
          userVote={userVote}
          onVote={onVote}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-ash">
            <UserAvatar username={comment.author} size="sm" />
            <UserHoverCard username={comment.author}>
              <span className="font-medium hover:underline cursor-pointer">
                {comment.author}
              </span>
            </UserHoverCard>
            <span>&middot;</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo(comment.createdAt)}
            </span>
            {comment.moderation && (
              <ModBadge
                action={comment.moderation.action}
                confidence={comment.moderation.confidence}
              />
            )}
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={editBody}
                onChange={(e) => {
                  setEditBody(e.target.value);
                  if (editError) setEditError(null);
                }}
                rows={3}
                maxLength={MAX_COMMENT_LENGTH}
                className="min-h-[60px] resize-y border-charcoal bg-coal text-ash placeholder:text-smoke focus-visible:ring-flame-500/50 text-sm"
                aria-label="Edit comment"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-smoke">
                  {editBody.length.toLocaleString()}/{MAX_COMMENT_LENGTH.toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="spark"
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={editSaving || !editBody.trim()}
                    className="gap-1 text-xs h-7"
                  >
                    {editSaving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    {editSaving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={editSaving}
                    className="gap-1 text-xs h-7 text-smoke hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                    Cancel
                  </Button>
                </div>
              </div>
              {editError && (
                <div className="flex items-center gap-2 text-xs text-red-400">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {editError}
                </div>
              )}
            </div>
          ) : (
            <MarkdownContent content={comment.body} className="mt-1" />
          )}

          {/* Action buttons */}
          {!editing && (
            <div className="mt-1.5 flex items-center gap-3 text-xs text-smoke">
              {/* Reply — only for logged-in users */}
              {isLoggedIn && onReply && (
                <button
                  onClick={() => onReply(comment.id)}
                  className="flex items-center gap-1 transition-colors hover:text-foreground"
                  aria-label="Reply to comment"
                >
                  <MessageSquare className="h-3 w-3" />
                  Reply
                </button>
              )}

              {/* Report — only for logged-in users, not own comments */}
              {isLoggedIn && !isOwner && onReport && (
                <button
                  onClick={() => onReport(comment.id)}
                  className="flex items-center gap-1 transition-colors hover:text-foreground"
                  aria-label="Report comment"
                >
                  <Flag className="h-3 w-3" />
                  Report
                </button>
              )}

              {/* Edit — owner only */}
              {isOwner && onEdit && (
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-1 transition-colors hover:text-foreground"
                  aria-label="Edit comment"
                >
                  <Edit3 className="h-3 w-3" />
                  Edit
                </button>
              )}

              {/* Delete — owner only */}
              {isOwner && onDelete && (
                <button
                  onClick={() => onDelete(comment.id)}
                  className="flex items-center gap-1 transition-colors hover:text-red-400"
                  aria-label="Delete comment"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              )}
            </div>
          )}

          {/* Inline reply form */}
          {isReplying && onSubmitReply && onCancelReply && (
            <div className="mt-2 rounded-md border border-charcoal bg-charcoal/50 p-3">
              <Textarea
                value={replyText}
                onChange={(e) => {
                  setReplyText(e.target.value);
                  if (replyError) setReplyError(null);
                }}
                placeholder={`Reply to ${comment.author}...`}
                rows={2}
                maxLength={MAX_COMMENT_LENGTH}
                className="min-h-[50px] resize-y border-charcoal bg-coal text-ash placeholder:text-smoke focus-visible:ring-flame-500/50 text-sm"
                aria-label={`Reply to ${comment.author}`}
                autoFocus
              />
              {replyError && (
                <div className="mt-1.5 flex items-center gap-2 text-xs text-red-400">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {replyError}
                </div>
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-smoke">
                  {replyText.length.toLocaleString()}/{MAX_COMMENT_LENGTH.toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplyText("");
                      setReplyError(null);
                      onCancelReply();
                    }}
                    disabled={replySubmitting}
                    className="gap-1 text-xs h-7 text-smoke hover:text-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="spark"
                    size="sm"
                    onClick={handleSubmitReply}
                    disabled={!replyText.trim() || replySubmitting}
                    className="gap-1 text-xs h-7"
                  >
                    {replySubmitting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    {replySubmitting ? "Posting..." : "Reply"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
