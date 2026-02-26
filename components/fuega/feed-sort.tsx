"use client";

import { TrendingUp, Clock, Flame, Zap, Filter, FileText, Link2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SortOption = "hot" | "new" | "top" | "rising";
type TimeRange = "all" | "today" | "week" | "month";
type PostType = "all" | "text" | "link" | "image";

/* ---------- Unified toolbar ---------- */

interface FeedToolbarProps {
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  postType: PostType;
  onPostTypeChange: (type: PostType) => void;
  className?: string;
}

const sortOptions: { value: SortOption; label: string; icon: typeof Flame }[] = [
  { value: "hot", label: "Hot", icon: Flame },
  { value: "new", label: "New", icon: Clock },
  { value: "top", label: "Top", icon: TrendingUp },
  { value: "rising", label: "Rising", icon: Zap },
];

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "all", label: "All" },
];

const postTypeOptions: { value: PostType; label: string; icon: typeof Filter }[] = [
  { value: "all", label: "All", icon: Filter },
  { value: "text", label: "Text", icon: FileText },
  { value: "link", label: "Links", icon: Link2 },
  { value: "image", label: "Images", icon: ImageIcon },
];

const pillClass = "flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-[11px] font-mono rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0";
const activeClass = "bg-coal text-flame-400";
const inactiveClass = "text-smoke hover:text-ash";

export function FeedToolbar({
  sort,
  onSortChange,
  timeRange,
  onTimeRangeChange,
  postType,
  onPostTypeChange,
  className,
}: FeedToolbarProps) {
  return (
    <div
      role="group"
      aria-label="Feed controls"
      className={cn(
        "flex flex-nowrap items-center gap-1 rounded-lg border border-charcoal bg-charcoal/50 p-1 overflow-x-auto scrollbar-hide",
        className,
      )}
    >
      {/* Sort pills */}
      {sortOptions.map((opt) => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            onClick={() => onSortChange(opt.value)}
            aria-pressed={sort === opt.value}
            className={cn(pillClass, sort === opt.value ? activeClass : inactiveClass)}
          >
            <Icon className="h-3 w-3" />
            {opt.label}
          </button>
        );
      })}

      {/* Separator */}
      <div className="h-4 w-px bg-charcoal/80 mx-1 shrink-0 hidden sm:block" />

      {/* Time range pills */}
      {timeRangeOptions.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onTimeRangeChange(opt.value)}
          aria-pressed={timeRange === opt.value}
          className={cn(pillClass, timeRange === opt.value ? activeClass : inactiveClass)}
        >
          {opt.label}
        </button>
      ))}

      {/* Separator */}
      <div className="h-4 w-px bg-charcoal/80 mx-1 shrink-0 hidden sm:block" />

      {/* Post type pills */}
      {postTypeOptions.map((opt) => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            onClick={() => onPostTypeChange(opt.value)}
            aria-pressed={postType === opt.value}
            className={cn(pillClass, postType === opt.value ? activeClass : inactiveClass)}
          >
            <Icon className="h-3 w-3" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Legacy FeedSort (sort-only) ---------- */

interface FeedSortProps {
  active: SortOption;
  onChange: (sort: SortOption) => void;
  className?: string;
}

export function FeedSort({ active, onChange, className }: FeedSortProps) {
  return (
    <div
      role="group"
      aria-label="Sort posts by"
      className={cn(
        "flex flex-nowrap items-center gap-1 rounded-lg border border-charcoal bg-charcoal/50 p-1 overflow-x-auto scrollbar-hide",
        className,
      )}
    >
      {sortOptions.map((opt) => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={active === opt.value}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 min-h-[36px] text-xs font-medium transition-colors shrink-0",
              active === opt.value
                ? "bg-charcoal text-flame-400"
                : "text-smoke hover:text-ash",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
