"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { MessageSquare, Share2, Check, Flag, Clock, Link2, ImageIcon } from "lucide-react";
import { SparkButton } from "@/components/fuega/spark-button";
import { CampfirePrefix } from "@/components/fuega/campfire-prefix";
import { UserAvatar } from "@/components/fuega/user-avatar";
import { ModBadge } from "@/components/fuega/mod-badge";
import { MarkdownContent } from "@/components/fuega/markdown-content";
import { VideoEmbed, isVideoUrl } from "@/components/fuega/video-embed";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils/time-ago";
import { toast } from "sonner";
import { useAuth } from "@/lib/contexts/auth-context";

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
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
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

  // Guard votes behind authentication
  const handleGuardedVote = (vote: "spark" | "douse") => {
    if (!user) {
      toast.error("Log in to vote");
      return;
    }
    onVote(vote);
  };

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
        "border-l-2 hover:border-l-lava-hot/40",
        post.post_type === "link"
          ? "border-l-flame-400/50"
          : post.post_type === "image"
            ? "border-l-ember-500/50"
            : "border-l-transparent",
        className,
      )}
    >
      {/* Campfire chip */}
      <div className="flex items-center gap-2 text-xs font-mono text-ash">
        <Link
          href={`/f/${post.campfire}`}
          onClick={(e) => e.stopPropagation()}
          className="font-medium text-flame-400 hover:underline"
        >
          <CampfirePrefix name={post.campfire} className="text-xs" />
        </Link>
        <span className="text-smoke">·</span>
        <Link
          href={`/u/${post.author}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 hover:underline"
        >
          <UserAvatar username={post.author} size="sm" />
          <span>{post.author}</span>
        </Link>
        <span className="text-smoke">·</span>
        <span className="flex items-center gap-1 text-smoke">
          <Clock className="h-3 w-3" />
          {timeAgo(post.createdAt)}
        </span>
        {post.post_type === "link" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-flame-400/10 px-1.5 py-0.5 text-[10px] text-flame-400">
            <Link2 className="h-2.5 w-2.5" /> link
          </span>
        )}
        {post.post_type === "image" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-ember-500/10 px-1.5 py-0.5 text-[10px] text-ember-500">
            <ImageIcon className="h-2.5 w-2.5" /> image
          </span>
        )}
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

      {/* Link preview */}
      {linkDomain && !hasVideo && (
        <a
          href={post.link_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-1 flex items-center gap-2 rounded-md border border-charcoal bg-charcoal/30 px-2.5 py-1.5 text-xs text-ash hover:border-lava-hot/30 transition-colors group/link"
        >
          <Link2 className="h-3.5 w-3.5 text-flame-400 shrink-0" />
          <span className="truncate group-hover/link:text-flame-400 transition-colors">{linkDomain}</span>
          <span className="text-smoke ml-auto shrink-0">↗</span>
        </a>
      )}
      {linkDomain && hasVideo && (
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
            <VideoEmbed url={post.link_url} compact className="h-24 w-40 flex-shrink-0" />
          ) : post.image_url ? (
            <div className="relative h-24 w-32 flex-shrink-0 overflow-hidden rounded">
              <Image
                src={post.image_url}
                alt=""
                fill
                className="object-cover"
                sizes="128px"
                unoptimized
              />
            </div>
          ) : null}
        </div>
      )}

      {/* Video/image thumbnail when body is absent */}
      {!showBody && hasVideo && post.link_url && (
        <VideoEmbed url={post.link_url} compact className="mt-1 h-24 w-40" />
      )}
      {!showBody && !hasVideo && post.image_url && (
        <div className="relative mt-1 h-32 w-full max-w-xs overflow-hidden rounded">
          <Image
            src={post.image_url}
            alt=""
            fill
            className="object-cover"
            sizes="320px"
            unoptimized
          />
        </div>
      )}

      {/* Action bar — inline voting + actions */}
      <div className="mt-2 flex items-center gap-1 text-xs">
        {/* Spark/Douse with micro-animation wrapper */}
        <div
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
          className={cn(
            voteAnim === "spark" && "animate-spark-pop",
            voteAnim === "douse" && "animate-douse-pop",
          )}
        >
          <SparkButton
            sparkCount={post.sparkCount}
            userVote={userVote}
            onVote={handleGuardedVote}
            variant="horizontal"
          />
        </div>

        <span className="text-lava-hot/20 mx-1">|</span>

        {/* Comments */}
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClickComments?.(); }}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-2 min-h-[44px] min-w-[44px] transition-colors hover:bg-charcoal/50 hover:text-foreground",
            post.commentCount > 0
              ? "text-foreground font-medium"
              : "text-ash",
          )}
          aria-label={`${post.commentCount} comments`}
        >
          <MessageSquare className="h-4 w-4" />
          <span className={cn("font-mono", post.commentCount > 0 && "text-[13px]")}>{post.commentCount}</span>
        </button>

        {/* Share */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            const url = `${window.location.origin}/f/${post.campfire}/${post.id}`;
            const onCopySuccess = () => {
              setCopied(true);
              toast.success("Link copied!");
              setTimeout(() => setCopied(false), 2000);
            };
            const fallbackCopy = (text: string) => {
              try {
                const textarea = document.createElement("textarea");
                textarea.value = text;
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand("copy");
                document.body.removeChild(textarea);
                onCopySuccess();
              } catch {
                toast.error("Could not copy link");
              }
            };
            if (navigator.clipboard?.writeText) {
              navigator.clipboard.writeText(url).then(onCopySuccess).catch(() => fallbackCopy(url));
            } else {
              fallbackCopy(url);
            }
            onShare?.();
          }}
          className="flex items-center gap-1.5 rounded-md px-3 py-2 min-h-[44px] min-w-[44px] text-ash transition-colors hover:bg-charcoal/50 hover:text-foreground"
          aria-label="Share post"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
        </button>

        {/* Report */}
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onReport?.(); }}
          className="flex items-center gap-1.5 rounded-md px-3 py-2 min-h-[44px] min-w-[44px] text-ash transition-colors hover:bg-charcoal/50 hover:text-foreground ml-auto"
          aria-label="Report post"
        >
          <Flag className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}
