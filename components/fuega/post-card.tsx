"use client";

import { MessageSquare, Share2, Flag, Clock } from "lucide-react";
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
    campfire: string;
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
  onClickComments?: () => void;
  onShare?: () => void;
  onReport?: () => void;
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
  onClickComments,
  onShare,
  onReport,
  compact = false,
  className,
}: PostCardProps) {
  return (
    <article
      className={cn(
        "group rounded-md border border-transparent bg-coal p-3 transition-all hover:border-lava-hot/20 hover:bg-coal/80",
        "border-l-2 border-l-transparent hover:border-l-lava-hot/40",
        className,
      )}
    >
      {/* Campfire chip */}
      <div className="flex items-center gap-2 text-xs font-mono text-ash">
        <span className="font-medium text-flame-400 hover:underline cursor-pointer">
          <span className="text-lava-hot">f</span>
          <span className="text-smoke mx-0.5">|</span>
          <span>{post.campfire}</span>
        </span>
        <span className="text-smoke">·</span>
        <UserAvatar username={post.author} size="sm" />
        <span className="hover:underline cursor-pointer">
          {post.author}
        </span>
        <span className="text-smoke">·</span>
        <span className="flex items-center gap-1 text-smoke">
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

      {/* Title */}
      <h3 className={cn("mt-1.5 font-medium leading-snug text-foreground group-hover:text-lava-hot cursor-pointer transition-colors", compact ? "text-sm" : "text-base")}>
        {post.title}
      </h3>

      {/* Body preview */}
      {!compact && post.body && (
        <p className="mt-1 text-sm text-ash line-clamp-3 leading-relaxed">
          {post.body}
        </p>
      )}

      {/* Action bar — inline voting + actions */}
      <div className="mt-2 flex items-center gap-1 text-xs">
        {/* Spark/Douse */}
        <SparkButton
          sparkCount={post.sparkCount}
          userVote={userVote}
          onVote={onVote}
          variant="horizontal"
        />

        <span className="text-lava-hot/20 mx-1">|</span>

        {/* Comments */}
        <button
          onClick={onClickComments}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-ash transition-colors hover:bg-charcoal/50 hover:text-foreground"
          aria-label={`${post.commentCount} comments`}
        >
          <MessageSquare className="h-4 w-4" />
          <span className="font-mono">{post.commentCount}</span>
        </button>

        {/* Share */}
        <button
          onClick={onShare}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-ash transition-colors hover:bg-charcoal/50 hover:text-foreground"
          aria-label="Share post"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        {/* Report */}
        <button
          onClick={onReport}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-ash transition-colors hover:bg-charcoal/50 hover:text-foreground ml-auto"
          aria-label="Report post"
        >
          <Flag className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}
