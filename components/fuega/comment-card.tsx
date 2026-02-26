"use client";

import type { ReactNode } from "react";
import { MessageSquare, Flag, Clock } from "lucide-react";
import { SparkButton } from "@/components/fuega/spark-button";
import { UserAvatar } from "@/components/fuega/user-avatar";
import { UserHoverCard } from "@/components/fuega/user-hover-card";
import { ModBadge } from "@/components/fuega/mod-badge";
import { MarkdownContent } from "@/components/fuega/markdown-content";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils/time-ago";

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
  collapseToggle?: ReactNode;
  className?: string;
}

export function CommentCard({
  comment,
  userVote,
  onVote,
  collapseToggle,
  className,
}: CommentCardProps) {
  const indent = Math.min(comment.depth, 6);

  return (
    <div
      className={cn("relative", className)}
      style={{ marginLeft: `${indent * 1.5}rem` }}
    >
      {comment.depth > 0 && (
        <div className="absolute -left-3 top-0 bottom-0 w-[2px] bg-charcoal" />
      )}

      <div className="flex gap-2 py-2">
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
            <span>·</span>
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

          <MarkdownContent content={comment.body} className="mt-1" />

          <div className="mt-1.5 flex items-center gap-3 text-xs text-smoke">
            <button
              className="flex items-center gap-1 opacity-50 cursor-not-allowed"
              title="Reply coming soon"
              aria-label="Reply — coming soon"
              disabled
            >
              <MessageSquare className="h-3 w-3" />
              Reply
            </button>
            <button
              className="flex items-center gap-1 opacity-50 cursor-not-allowed"
              title="Report coming soon"
              aria-label="Report — coming soon"
              disabled
            >
              <Flag className="h-3 w-3" />
              Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
