"use client";

import {
  Flame,
  Search,
  MessageSquare,
  Shield,
  Vote,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateVariant =
  | "feed"
  | "search"
  | "comments"
  | "mod-log"
  | "governance"
  | "generic";

interface EmptyStateProps {
  variant: EmptyStateVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const VARIANT_DEFAULTS: Record<
  EmptyStateVariant,
  {
    icon: typeof Flame;
    title: string;
    description: string;
    actionLabel?: string;
  }
> = {
  feed: {
    icon: Flame,
    title: "No posts yet",
    description: "Be the first to spark a conversation",
    actionLabel: "Create a post",
  },
  search: {
    icon: Search,
    title: "No results found",
    description: "Try a different search term",
  },
  comments: {
    icon: MessageSquare,
    title: "No comments yet",
    description: "Start the discussion below",
  },
  "mod-log": {
    icon: Shield,
    title: "No moderation actions",
    description: "The AI moderator hasn't taken any actions yet",
  },
  governance: {
    icon: Vote,
    title: "No proposals yet",
    description: "Create a proposal to get started",
  },
  generic: {
    icon: ScrollText,
    title: "Nothing here yet",
    description: "Check back later",
  },
};

export function EmptyState({
  variant,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const defaults = VARIANT_DEFAULTS[variant];
  const Icon = defaults.icon;
  const resolvedTitle = title ?? defaults.title;
  const resolvedDescription = description ?? defaults.description;
  const resolvedActionLabel = actionLabel ?? defaults.actionLabel;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12",
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-charcoal/50 flex items-center justify-center">
        <Icon className="h-8 w-8 text-lava-hot/40" />
      </div>
      <h3 className="text-lg font-medium text-foreground mt-4">
        {resolvedTitle}
      </h3>
      <p className="text-sm text-ash mt-1 max-w-xs text-center">
        {resolvedDescription}
      </p>
      {resolvedActionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-lava-hot text-black text-sm font-medium rounded-md hover:bg-lava-hot/90 transition-colors"
        >
          {resolvedActionLabel}
        </button>
      )}
    </div>
  );
}
