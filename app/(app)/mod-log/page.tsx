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
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModLogSkeleton } from "@/components/fuega/page-skeleton";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils/time-ago";
import { api, ApiError } from "@/lib/api/client";

type Decision = "approved" | "flagged" | "removed" | "warned";

interface ModLogEntry {
  id: string;
  campfire_id: string;
  campfire_name: string;
  content_type: string;
  content_id: string;
  decision: Decision;
  reason: string;
  agent_level: string;
  ai_model: string | null;
  created_at: string;
  injection_detected: boolean;
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
  warned: {
    label: "Warned",
    icon: AlertTriangle,
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
};

const PAGE_SIZE = 50;

export default function ModLogPage() {
  const [entries, setEntries] = React.useState<ModLogEntry[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [offset, setOffset] = React.useState(0);
  const [decisionFilter, setDecisionFilter] = React.useState<Decision | "all">(
    "all",
  );
  const [campfireFilter, setCampfireFilter] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  // Page title
  React.useEffect(() => {
    document.title = "Mod Log - fuega";
  }, []);

  // Debounce campfire filter to avoid excessive API calls
  const [debouncedCampfire, setDebouncedCampfire] = React.useState("");
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedCampfire(campfireFilter), 300);
    return () => clearTimeout(timer);
  }, [campfireFilter]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params: Record<string, string | number | boolean | undefined> = {
      limit: PAGE_SIZE,
      offset,
    };
    if (decisionFilter !== "all") {
      params.action = decisionFilter;
    }
    // Note: campfire_id filter requires a UUID, not a name.
    // Client-side filtering on campfire name is applied below.

    api
      .get<{ entries: ModLogEntry[]; total: number }>("/api/mod-log", params)
      .then((data) => {
        if (!cancelled) {
          setEntries(data.entries);
          setTotal(data.total);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Failed to load mod log",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [offset, decisionFilter]);

  // Reset offset when filter changes
  React.useEffect(() => {
    setOffset(0);
  }, [decisionFilter]);

  // Client-side filtering for campfire name, search query, and date range
  const filteredEntries = React.useMemo(() => {
    return entries.filter((entry) => {
      if (
        debouncedCampfire &&
        !entry.campfire_name
          .toLowerCase()
          .includes(debouncedCampfire.toLowerCase())
      ) {
        return false;
      }
      if (
        searchQuery &&
        !entry.reason.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !entry.content_type.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      if (dateFrom) {
        const entryDate = new Date(entry.created_at);
        const fromDate = new Date(dateFrom);
        if (entryDate < fromDate) return false;
      }
      if (dateTo) {
        const entryDate = new Date(entry.created_at);
        const toDate = new Date(dateTo + "T23:59:59");
        if (entryDate > toDate) return false;
      }
      return true;
    });
  }, [entries, debouncedCampfire, searchQuery, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div>
      <div>
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-flame-400" />
          <h1 className="text-2xl font-bold text-foreground">
            Public Moderation Log
          </h1>
        </div>
        <p className="mt-1 text-sm text-ash">
          Every AI moderation decision is logged here with full transparency.
          See exactly what was moderated, why, and the decision made.
        </p>
      </div>

      {/* Filters */}
      <div className="mt-6 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-smoke" />
            <Input
              placeholder="Search reasoning..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search moderation log reasoning"
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

        {/* Date range */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-smoke shrink-0" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Filter from date"
              className="h-9 w-auto border-charcoal bg-coal text-sm text-ash focus-visible:ring-flame-500/50"
            />
            <span className="text-xs text-smoke">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="Filter to date"
              className="h-9 w-auto border-charcoal bg-coal text-sm text-ash focus-visible:ring-flame-500/50"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="text-xs text-smoke hover:text-ash transition-colors"
            >
              Clear dates
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by decision">
          <Filter className="h-4 w-4 text-smoke" />
          {(["all", "approved", "flagged", "removed", "warned"] as const).map((d) => (
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

      {/* Entry count */}
      {!loading && !error && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-smoke">
            {filteredEntries.length === total
              ? `${total.toLocaleString()} total entries`
              : `${filteredEntries.length} of ${total.toLocaleString()} entries`}
          </p>
        </div>
      )}

      {/* Entries */}
      <div className="mt-3 space-y-2">
        {loading ? (
          <ModLogSkeleton />
        ) : error ? (
          <div className="py-16 text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-400/60" />
            <p className="mt-4 text-ash">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 border-charcoal text-ash"
              onClick={() => setOffset(0)}
            >
              Retry
            </Button>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-16 text-center">
            <Shield className="mx-auto h-12 w-12 text-smoke/40" />
            <h3 className="mt-4 text-lg font-medium text-ash">
              {total === 0 ? "No moderation entries yet" : "No matching entries"}
            </h3>
            <p className="mt-2 text-sm text-smoke max-w-md mx-auto">
              {total === 0
                ? "Moderation decisions will appear here as content is reviewed by the AI."
                : "Try adjusting your filters to see more results."}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const config = decisionConfig[entry.decision] ?? decisionConfig.flagged;
            const Icon = config.icon;

            return (
              <details
                key={entry.id}
                className="group rounded-lg border border-charcoal bg-charcoal/50 transition-colors hover:border-charcoal"
                aria-label={`${config.label} — ${entry.content_type} in ${entry.campfire_name}`}
              >
                <summary className="flex cursor-pointer items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-charcoal">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      {entry.content_type === "post" ? "Post" : "Comment"} moderated
                      {entry.injection_detected && (
                        <span className="ml-2 text-[10px] text-red-400 font-medium">
                          INJECTION DETECTED
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-smoke">
                      <span className="text-flame-400">
                        <span className="text-lava-hot">f</span>
                        <span className="text-smoke mx-1">|</span>
                        <span>{entry.campfire_name}</span>
                      </span>
                      <span>·</span>
                      <span>{entry.content_type}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {timeAgo(entry.created_at)}
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
                  </div>
                </summary>

                <div className="border-t border-charcoal px-3 pb-3 pt-3">
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-smoke">
                        AI Reasoning
                      </span>
                      <p className="mt-1 text-sm leading-relaxed text-ash">
                        {entry.reason}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded border border-charcoal/50 bg-void/30 px-3 py-2 text-xs text-smoke">
                      <span>
                        Campfire:{" "}
                        <Link
                          href={`/f/${entry.campfire_name}`}
                          className="text-flame-400 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          f/{entry.campfire_name}
                        </Link>
                      </span>
                      <span>
                        Level:{" "}
                        <span className="text-ash capitalize">
                          {entry.agent_level}
                        </span>
                      </span>
                      {entry.ai_model && (
                        <span>
                          Model:{" "}
                          <span className="text-ash">{entry.ai_model}</span>
                        </span>
                      )}
                      <span>
                        Type:{" "}
                        <span className="text-ash capitalize">
                          {entry.content_type}
                        </span>
                      </span>
                      {entry.injection_detected && (
                        <span className="flex items-center gap-1 text-red-400">
                          <AlertTriangle className="h-3 w-3" />
                          Injection attempt detected
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

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="mt-6 flex items-center justify-between text-xs text-smoke">
          <span>
            Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of{" "}
            {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              className="h-7 border-charcoal text-ash"
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </Button>
            <span className="text-ash">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + PAGE_SIZE >= total}
              className="h-7 border-charcoal text-ash"
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
