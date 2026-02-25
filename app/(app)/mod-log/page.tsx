"use client";

import * as React from "react";
import {
  Bot,
  Shield,
  Eye,
  AlertTriangle,
  XCircle,
  Filter,
  Search,
  Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ModLogSkeleton } from "@/components/fuega/page-skeleton";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils/time-ago";

type Decision = "approved" | "flagged" | "removed";
type Tier = "campfire" | "platform";

interface ModLogEntry {
  id: string;
  contentSnippet: string;
  contentType: "post" | "comment";
  campfire: string;
  decision: Decision;
  confidence: number;
  reasoning: string;
  tier: Tier;
  createdAt: string;
}

const decisionConfig: Record<
  Decision,
  { label: string; icon: typeof Shield; color: string }
> = {
  approved: {
    label: "Approved",
    icon: Shield,
    color: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  flagged: {
    label: "Flagged",
    icon: Eye,
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  removed: {
    label: "Removed",
    icon: XCircle,
    color: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

const tierLabels: Record<Tier, string> = {
  campfire: "Campfire",
  platform: "Platform",
};


export default function ModLogPage() {
  const [entries, setEntries] = React.useState<ModLogEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [decisionFilter, setDecisionFilter] = React.useState<Decision | "all">(
    "all",
  );
  const [campfireFilter, setCampfireFilter] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    // No mod-log API endpoint yet — show empty state.
    // Once /api/campfires/:id/moderation is built, fetch real entries here.
    setEntries([]);
    setLoading(false);
  }, []);

  const filteredEntries = entries.filter((entry) => {
    if (decisionFilter !== "all" && entry.decision !== decisionFilter)
      return false;
    if (
      campfireFilter &&
      !entry.campfire
        .toLowerCase()
        .includes(campfireFilter.toLowerCase())
    )
      return false;
    if (
      searchQuery &&
      !entry.contentSnippet
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) &&
      !entry.reasoning.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="max-w-5xl">
      <div>
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-flame-400" />
          <h1 className="text-2xl font-bold text-foreground">
            Public Moderation Log
          </h1>
        </div>
        <p className="mt-1 text-sm text-ash">
          Every AI moderation decision is logged here with full transparency.
          See exactly what was moderated, why, and at what tier.
        </p>
      </div>

      {/* Filters */}
      <div className="mt-6 space-y-3 opacity-50 pointer-events-none">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-smoke" />
            <Input
              placeholder="Search content or reasoning..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search moderation log content or reasoning"
              className="h-9 border-charcoal bg-coal pl-9 text-sm placeholder:text-smoke focus-visible:ring-flame-500/50"
            />
          </div>
          <Input
            placeholder="Filter by campfire..."
            value={campfireFilter}
            onChange={(e) => setCampfireFilter(e.target.value)}
            aria-label="Filter by campfire name"
            className="h-9 w-full border-charcoal bg-coal text-sm placeholder:text-smoke focus-visible:ring-flame-500/50 sm:w-48"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by decision">
          <Filter className="h-4 w-4 text-smoke" />
          {(["all", "approved", "flagged", "removed"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDecisionFilter(d)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                decisionFilter === d
                  ? "bg-flame-500/20 text-flame-400"
                  : "text-smoke hover:text-ash",
              )}
            >
              {d === "all" ? "All" : decisionConfig[d].label}
            </button>
          ))}
        </div>
      </div>

      {/* Entries */}
      <div className="mt-6 space-y-2">
        {loading ? (
          <ModLogSkeleton />
        ) : filteredEntries.length === 0 ? (
          <div className="py-16 text-center">
            <Shield className="mx-auto h-12 w-12 text-smoke/40" />
            <h3 className="mt-4 text-lg font-medium text-ash">Mod Log — Coming Soon</h3>
            <p className="mt-2 text-sm text-smoke max-w-md mx-auto">
              Every AI moderation decision will be logged here publicly.
              This feature is under development.
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const config = decisionConfig[entry.decision];
            const Icon = config.icon;

            return (
              <details
                key={entry.id}
                className="group rounded-lg border border-charcoal bg-charcoal/50 transition-colors hover:border-charcoal"
              >
                <summary className="flex cursor-pointer items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-charcoal">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      {entry.contentSnippet}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-smoke">
                      <span className="text-flame-400">
                        <span className="text-lava-hot">f</span><span className="text-smoke mx-1">|</span><span>{entry.campfire}</span>
                      </span>
                      <span>·</span>
                      <span>{entry.contentType}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {timeAgo(entry.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-medium",
                        config.color,
                      )}
                    >
                      {config.label}
                    </Badge>
                    <span className="text-[10px] tabular-nums text-smoke">
                      {Math.round(entry.confidence * 100)}%
                    </span>
                  </div>
                </summary>

                <div className="border-t border-charcoal px-3 pb-3 pt-3">
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-smoke">
                        AI Reasoning
                      </span>
                      <p className="mt-1 text-sm leading-relaxed text-ash">
                        {entry.reasoning}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-smoke">
                      <span>
                        Tier:{" "}
                        <span className="text-ash">
                          {tierLabels[entry.tier]}
                        </span>
                      </span>
                      <span>
                        Confidence:{" "}
                        <span
                          className={cn(
                            entry.confidence >= 0.9 && "text-green-400",
                            entry.confidence >= 0.7 &&
                              entry.confidence < 0.9 &&
                              "text-amber-400",
                            entry.confidence < 0.7 && "text-red-400",
                          )}
                        >
                          {Math.round(entry.confidence * 100)}%
                        </span>
                      </span>
                      {entry.confidence < 0.8 && (
                        <span className="flex items-center gap-1 text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          Low confidence — flagged for review
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </details>
            );
          })
        )}
      </div>
    </div>
  );
}
