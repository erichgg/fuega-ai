"use client";

import { Calendar, FileText, Link2, ImageIcon, Filter } from "lucide-react";
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
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
];

const postTypeOptions: { value: PostType; label: string; icon: typeof Filter }[] = [
  { value: "all", label: "All", icon: Filter },
  { value: "text", label: "Text", icon: FileText },
  { value: "link", label: "Links", icon: Link2 },
  { value: "image", label: "Images", icon: ImageIcon },
];

export function FeedFilters({
  timeRange,
  onTimeRangeChange,
  postType,
  onPostTypeChange,
  className,
}: FeedFiltersProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Time range row */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        <span className="text-[10px] text-smoke font-mono uppercase tracking-wider mr-2 shrink-0 flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Time
        </span>
        {timeRangeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onTimeRangeChange(opt.value)}
            aria-pressed={timeRange === opt.value}
            className={cn(
              "px-2.5 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer whitespace-nowrap",
              timeRange === opt.value
                ? "bg-charcoal text-flame-400"
                : "text-smoke hover:text-ash",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Post type row */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        <span className="text-[10px] text-smoke font-mono uppercase tracking-wider mr-2 shrink-0 flex items-center gap-1">
          <Filter className="h-3 w-3" />
          Type
        </span>
        {postTypeOptions.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              onClick={() => onPostTypeChange(opt.value)}
              aria-pressed={postType === opt.value}
              className={cn(
                "px-2.5 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1",
                postType === opt.value
                  ? "bg-charcoal text-flame-400"
                  : "text-smoke hover:text-ash",
              )}
            >
              <Icon className="h-3 w-3" />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
