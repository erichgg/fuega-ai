"use client";

import { Filter, FileText, Link2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type TimeRange = "all" | "today" | "week" | "month";
type PostType = "all" | "text" | "link" | "image";

interface FeedFiltersProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  postType: PostType;
  onPostTypeChange: (type: PostType) => void;
  className?: string;
}

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

const pillClass = "flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded-md transition-colors cursor-pointer whitespace-nowrap";
const activeClass = "bg-coal text-flame-400";
const inactiveClass = "text-smoke hover:text-ash";

export function FeedFilters({
  timeRange,
  onTimeRangeChange,
  postType,
  onPostTypeChange,
  className,
}: FeedFiltersProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-lg border border-charcoal bg-charcoal/50 p-1",
        className,
      )}
    >
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
      <div className="h-4 w-px bg-charcoal/80 mx-1 hidden sm:block" />

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
