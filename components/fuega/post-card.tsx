"use client";

import * as React from "react";
import { MessageSquare, Share2, Flag, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SparkButton } from "@/components/fuega/spark-button";
import { UserAvatar } from "@/components/fuega/user-avatar";
import { ModBadge } from "@/components/fuega/mod-badge";
import { cn } from "@/lib/utils";

interface PostCardProps {
  post: {
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
  };
  userVote: "sparked" | "doused" | null;
  onVote: (vote: "spark" | "douse") => void;
  compact?: boolean;
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

export function PostCard({
  post,
  userVote,
  onVote,
  compact = false,
  className,
}: PostCardProps) {
  return (
    <Card
      className={cn(
        "group border-ash-800 bg-ash-900/50 transition-colors hover:border-ash-700 hover:bg-ash-900",
        className,
      )}
    >
      <CardContent className="flex gap-3 p-3">
        <SparkButton
          sparkCount={post.sparkCount}
          userVote={userVote}
          onVote={onVote}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-ash-400">
            <span className="font-medium text-flame-400 hover:underline cursor-pointer">
              f/{post.community}
            </span>
            <span>·</span>
            <UserAvatar username={post.author} size="sm" />
            <span className="hover:underline cursor-pointer">
              {post.author}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo(post.createdAt)}
            </span>
            {post.moderation && (
              <ModBadge
                action={post.moderation.action}
                confidence={post.moderation.confidence}
              />
            )}
          </div>

          <h3 className="mt-1 text-sm font-medium leading-snug text-ash-100 group-hover:text-white cursor-pointer">
            {post.title}
          </h3>

          {!compact && post.body && (
            <p className="mt-1 text-xs text-ash-400 line-clamp-3">
              {post.body}
            </p>
          )}

          <div className="mt-2 flex items-center gap-4 text-xs text-ash-500">
            <button className="flex items-center gap-1.5 transition-colors hover:text-ash-300">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{post.commentCount} comments</span>
            </button>
            <button className="flex items-center gap-1.5 transition-colors hover:text-ash-300">
              <Share2 className="h-3.5 w-3.5" />
              <span>Share</span>
            </button>
            <button className="flex items-center gap-1.5 transition-colors hover:text-ash-300">
              <Flag className="h-3.5 w-3.5" />
              <span>Report</span>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
