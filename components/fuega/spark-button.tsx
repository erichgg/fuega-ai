"use client";

import * as React from "react";
import { Flame, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";

type VoteState = "sparked" | "doused" | null;

interface SparkButtonProps {
  sparkCount: number;
  userVote: VoteState;
  onVote: (vote: "spark" | "douse") => void;
  disabled?: boolean;
  /** "vertical" = stacked column (legacy), "horizontal" = inline action bar */
  variant?: "vertical" | "horizontal";
  className?: string;
}

export function SparkButton({
  sparkCount,
  userVote,
  onVote,
  disabled = false,
  variant = "vertical",
  className,
}: SparkButtonProps) {
  const [animating, setAnimating] = React.useState<"spark" | "douse" | null>(
    null,
  );

  const handleVote = (vote: "spark" | "douse") => {
    if (disabled) return;
    setAnimating(vote);
    onVote(vote);
    setTimeout(() => setAnimating(null), 600);
  };

  if (variant === "horizontal") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {/* Spark */}
        <button
          onClick={() => handleVote("spark")}
          disabled={disabled}
          className={cn(
            "group relative flex items-center gap-1 rounded-md px-3 py-2 min-h-[44px] min-w-[44px] transition-all hover:bg-flame-500/10",
            userVote === "sparked" && "text-flame-400",
            userVote !== "sparked" && "text-ash hover:text-flame-400",
            disabled && "cursor-not-allowed opacity-50",
          )}
          aria-label="Spark this post"
          aria-pressed={userVote === "sparked"}
        >
          <Flame
            className={cn(
              "h-4 w-4 transition-transform group-hover:scale-110",
              userVote === "sparked" && "fill-flame-400",
            )}
          />
          {animating === "spark" && (
            <span className="absolute left-1 top-0 animate-spark-rise">
              <Flame className="h-3 w-3 text-flame-400 fill-flame-400" />
            </span>
          )}
        </button>

        {/* Count */}
        <span
          aria-live="polite"
          aria-label={`Spark count: ${sparkCount}`}
          className={cn(
            "text-xs font-semibold font-mono tabular-nums min-w-[2ch] text-center",
            userVote === "sparked" && "text-flame-400",
            userVote === "doused" && "text-blue-400",
            userVote === null && "text-ash",
          )}
        >
          {sparkCount}
        </span>

        {/* Douse */}
        <button
          onClick={() => handleVote("douse")}
          disabled={disabled}
          className={cn(
            "group relative flex items-center gap-1 rounded-md px-3 py-2 min-h-[44px] min-w-[44px] transition-all hover:bg-blue-500/10",
            userVote === "doused" && "text-blue-400",
            userVote !== "doused" && "text-ash hover:text-blue-400",
            disabled && "cursor-not-allowed opacity-50",
          )}
          aria-label="Douse this post"
          aria-pressed={userVote === "doused"}
        >
          <Droplets
            className={cn(
              "h-4 w-4 transition-transform group-hover:scale-110",
              userVote === "doused" && "fill-blue-400",
            )}
          />
          {animating === "douse" && (
            <span className="absolute left-1 top-0 animate-douse-fall">
              <Droplets className="h-3 w-3 text-blue-400 fill-blue-400" />
            </span>
          )}
        </button>
      </div>
    );
  }

  // Vertical variant (default — kept for detail pages, etc.)
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-0.5",
        className,
      )}
    >
      <button
        onClick={() => handleVote("spark")}
        disabled={disabled}
        className={cn(
          "group relative flex h-8 w-8 items-center justify-center rounded-md transition-all hover:bg-flame-500/10",
          userVote === "sparked" && "text-flame-400",
          userVote !== "sparked" && "text-smoke hover:text-flame-400",
          disabled && "cursor-not-allowed opacity-50",
        )}
        aria-label="Spark this post"
        aria-pressed={userVote === "sparked"}
      >
        <Flame
          className={cn(
            "h-5 w-5 transition-transform group-hover:scale-110",
            userVote === "sparked" && "fill-flame-400",
          )}
        />
        {animating === "spark" && (
          <span className="absolute inset-0 animate-spark-rise">
            <Flame className="h-5 w-5 text-flame-400 fill-flame-400 mx-auto mt-1.5" />
          </span>
        )}
      </button>

      <span
        aria-live="polite"
        aria-label={`${sparkCount} sparks`}
        className={cn(
          "text-xs font-semibold font-mono tabular-nums min-w-[2ch] text-center",
          userVote === "sparked" && "text-flame-400",
          userVote === "doused" && "text-blue-400",
          userVote === null && "text-ash",
        )}
      >
        {sparkCount}
      </span>

      <button
        onClick={() => handleVote("douse")}
        disabled={disabled}
        className={cn(
          "group relative flex h-8 w-8 items-center justify-center rounded-md transition-all hover:bg-blue-500/10",
          userVote === "doused" && "text-blue-400",
          userVote !== "doused" && "text-smoke hover:text-blue-400",
          disabled && "cursor-not-allowed opacity-50",
        )}
        aria-label="Douse this post"
        aria-pressed={userVote === "doused"}
      >
        <Droplets
          className={cn(
            "h-5 w-5 transition-transform group-hover:scale-110",
            userVote === "doused" && "fill-blue-400",
          )}
        />
        {animating === "douse" && (
          <span className="absolute inset-0 animate-douse-fall">
            <Droplets className="h-5 w-5 text-blue-400 fill-blue-400 mx-auto mt-1.5" />
          </span>
        )}
      </button>
    </div>
  );
}
