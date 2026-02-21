"use client";

import * as React from "react";
import { MessageSquare, Flag, Clock } from "lucide-react";
import { SparkButton } from "@/components/fuega/spark-button";
import { UserAvatar } from "@/components/fuega/user-avatar";
import { ModBadge } from "@/components/fuega/mod-badge";
import { cn } from "@/lib/utils";

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
  className?: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 604800)}w`;
}

export function CommentCard({
  comment,
  userVote,
  onVote,
  className,
}: CommentCardProps) {
  const indent = Math.min(comment.depth, 6);

  return (
    <div
      className={cn("relative", className)}
      style={{ marginLeft: `${indent * 1.5}rem` }}
    >
      {comment.depth > 0 && (
        <div className="absolute -left-3 top-0 bottom-0 w-px bg-ash-800" />
      )}

      <div className="flex gap-2 py-2">
        <SparkButton
          sparkCount={comment.sparkCount}
          userVote={userVote}
          onVote={onVote}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-ash-400">
            <UserAvatar username={comment.author} size="sm" />
            <span className="font-medium hover:underline cursor-pointer">
              {comment.author}
            </span>
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

          <p className="mt-1 text-sm text-ash-200 leading-relaxed">
            {comment.body}
          </p>

          <div className="mt-1.5 flex items-center gap-3 text-xs text-ash-500">
            <button className="flex items-center gap-1 transition-colors hover:text-ash-300">
              <MessageSquare className="h-3 w-3" />
              Reply
            </button>
            <button className="flex items-center gap-1 transition-colors hover:text-ash-300">
              <Flag className="h-3 w-3" />
              Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
