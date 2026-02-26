"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { MessageSquare, Share2, Flag, Clock, Link2, ImageIcon } from "lucide-react";
import { SparkButton } from "@/components/fuega/spark-button";
import { UserAvatar } from "@/components/fuega/user-avatar";
import { ModBadge } from "@/components/fuega/mod-badge";
import { MarkdownContent } from "@/components/fuega/markdown-content";
import { VideoEmbed, isVideoUrl } from "@/components/fuega/video-embed";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils/time-ago";

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
    post_type?: "text" | "link" | "image";
    image_url?: string;
    link_url?: string;
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

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
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
  const [expanded, setExpanded] = useState(false);
  const [voteAnim, setVoteAnim] = useState<"spark" | "douse" | null>(null);
  const prevVoteRef = useRef(userVote);

  // Detect vote changes and trigger micro-animation
  useEffect(() => {
    if (prevVoteRef.current === userVote) return;
    prevVoteRef.current = userVote;

    if (userVote === "sparked") {
      setVoteAnim("spark");
    } else if (userVote === "doused") {
      setVoteAnim("douse");
    } else {
      return;
    }

    const timer = setTimeout(() => setVoteAnim(null), 300);
    return () => clearTimeout(timer);
  }, [userVote]);

  const showBody = !compact && post.body;
  const bodyIsLong = (post.body?.length ?? 0) > 200;
  const linkDomain = post.link_url ? extractDomain(post.link_url) : null;
  const hasVideo = post.link_url ? isVideoUrl(post.link_url) : false;

  return (
    <article
      className={cn(
        "group rounded-md border border-transparent bg-coal p-3",
        "transition-all duration-200",
        "hover:border-lava-hot/40 hover:bg-coal/80",
        "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-lava-hot/5",
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
          {post.post_type === "link" && (
            <Link2 className="ml-1 h-3 w-3 text-flame-400" />
          )}
          {post.post_type === "image" && (
            <ImageIcon className="ml-1 h-3 w-3 text-flame-400" />
          )}
        </span>
        {post.moderation && (
          <ModBadge
            action={post.moderation.action}
            confidence={post.moderation.confidence}
          />
        )}
      </div>

      {/* Title */}
      <h3 className={cn(
        "mt-1.5 font-medium leading-snug text-foreground group-hover:text-lava-hot cursor-pointer transition-colors",
        compact ? "text-sm" : "text-base",
      )}>
        {post.title}
      </h3>

      {/* Link domain chip */}
      {linkDomain && (
        <span className="text-xs text-flame-400 font-mono">
          ↗ {linkDomain}
        </span>
      )}

      {/* Body preview + optional image thumbnail */}
      {showBody && (
        <div className="mt-1 flex gap-3">
          <div className="flex-1 min-w-0">
            <MarkdownContent content={post.body!} clamp={!expanded} />
            {bodyIsLong && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); setExpanded(!expanded); }}
                className="text-xs text-lava-hot hover:underline cursor-pointer mt-0.5"
              >
                {expanded ? "show less" : "read more"}
              </button>
            )}
          </div>

          {hasVideo && post.link_url ? (
            <VideoEmbed url={post.link_url} compact className="h-20 w-32 flex-shrink-0" />
          ) : post.image_url ? (
            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded">
              <Image
                src={post.image_url}
                alt=""
                fill
                className="object-cover"
                sizes="80px"
                unoptimized
              />
            </div>
          ) : null}
        </div>
      )}

      {/* Video/image thumbnail when body is absent */}
      {!showBody && hasVideo && post.link_url && (
        <VideoEmbed url={post.link_url} compact className="mt-1 h-20 w-32" />
      )}
      {!showBody && !hasVideo && post.image_url && (
        <div className="relative mt-1 h-20 w-20 overflow-hidden rounded">
          <Image
            src={post.image_url}
            alt=""
            fill
            className="object-cover"
            sizes="80px"
            unoptimized
          />
        </div>
      )}

      {/* Action bar — inline voting + actions */}
      <div className="mt-2 flex items-center gap-1 text-xs">
        {/* Spark/Douse with micro-animation wrapper */}
        <div
          className={cn(
            voteAnim === "spark" && "animate-spark-pop",
            voteAnim === "douse" && "animate-douse-pop",
          )}
        >
          <SparkButton
            sparkCount={post.sparkCount}
            userVote={userVote}
            onVote={onVote}
            variant="horizontal"
          />
        </div>

        <span className="text-lava-hot/20 mx-1">|</span>

        {/* Comments */}
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClickComments?.(); }}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-ash transition-colors hover:bg-charcoal/50 hover:text-foreground"
          aria-label={`${post.commentCount} comments`}
        >
          <MessageSquare className="h-4 w-4" />
          <span className="font-mono">{post.commentCount}</span>
        </button>

        {/* Share */}
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onShare?.(); }}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-ash transition-colors hover:bg-charcoal/50 hover:text-foreground"
          aria-label="Share post"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        {/* Report */}
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onReport?.(); }}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-ash transition-colors hover:bg-charcoal/50 hover:text-foreground ml-auto"
          aria-label="Report post"
        >
          <Flag className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}
