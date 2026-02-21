"use client";

import { TrendingUp, Clock, Flame, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type SortOption = "hot" | "new" | "top" | "rising";

interface FeedSortProps {
  active: SortOption;
  onChange: (sort: SortOption) => void;
  className?: string;
}

const options: { value: SortOption; label: string; icon: typeof Flame }[] = [
  { value: "hot", label: "Hot", icon: Flame },
  { value: "new", label: "New", icon: Clock },
  { value: "top", label: "Top", icon: TrendingUp },
  { value: "rising", label: "Rising", icon: Zap },
];

export function FeedSort({ active, onChange, className }: FeedSortProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-lg border border-ash-800 bg-ash-900/50 p-1",
        className,
      )}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active === opt.value
                ? "bg-ash-800 text-flame-400"
                : "text-ash-500 hover:text-ash-300",
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
