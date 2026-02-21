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
  className?: string;
}

export function SparkButton({
  sparkCount,
  userVote,
  onVote,
  disabled = false,
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
          userVote !== "sparked" && "text-ash-500 hover:text-flame-400",
          disabled && "cursor-not-allowed opacity-50",
        )}
        aria-label="Spark"
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
        className={cn(
          "text-xs font-semibold tabular-nums min-w-[2ch] text-center",
          userVote === "sparked" && "text-flame-400",
          userVote === "doused" && "text-blue-400",
          userVote === null && "text-ash-400",
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
          userVote !== "doused" && "text-ash-500 hover:text-blue-400",
          disabled && "cursor-not-allowed opacity-50",
        )}
        aria-label="Douse"
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
