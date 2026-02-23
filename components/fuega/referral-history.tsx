"use client";

import * as React from "react";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReferralHistoryEntry } from "@/lib/api/client";

interface ReferralHistoryProps {
  history: ReferralHistoryEntry[];
  loading?: boolean;
  className?: string;
}

const PAGE_SIZE = 10;

export function ReferralHistory({
  history,
  loading = false,
  className,
}: ReferralHistoryProps) {
  const [page, setPage] = React.useState(0);

  const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  const pageItems = history.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (loading) {
    return (
      <div className={cn("terminal-card p-4", className)}>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-lava-hot" />
          <p className="text-xs text-ash uppercase tracking-wider font-semibold">
            Referral History
          </p>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 bg-charcoal animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("terminal-card p-4", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-lava-hot" />
        <p className="text-xs text-ash uppercase tracking-wider font-semibold">
          Referral History
        </p>
        <span className="text-[10px] text-smoke ml-auto">
          {history.length} total
        </span>
      </div>

      {history.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-smoke">
            <span className="text-lava-hot font-bold">$ </span>
            no referrals yet
          </p>
          <p className="text-xs text-smoke mt-1">
            Share your link to start earning referral badges
          </p>
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-2 py-1.5 border-b border-lava-hot/20 text-[10px] text-smoke uppercase tracking-wider">
            <span>Username</span>
            <span>Joined</span>
            <span>Status</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-charcoal">
            {pageItems.map((entry) => (
              <div
                key={entry.referee_username}
                className="grid grid-cols-[1fr_auto_auto] gap-3 px-2 py-2 items-center text-xs"
              >
                <span className="text-foreground font-medium truncate">
                  {entry.referee_username}
                </span>
                <span className="text-smoke whitespace-nowrap">
                  {new Date(entry.joined_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border",
                    entry.status === "active"
                      ? "bg-teal/10 text-teal border-teal/20"
                      : "bg-destructive/10 text-destructive border-destructive/20",
                  )}
                >
                  {entry.status === "active" ? "Active" : "Reverted"}
                </span>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-lava-hot/10">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="text-xs text-ash hover:text-lava-hot disabled:text-smoke disabled:cursor-not-allowed transition-colors"
              >
                &larr; Prev
              </button>
              <span className="text-[10px] text-smoke">
                Page {page + 1} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="text-xs text-ash hover:text-lava-hot disabled:text-smoke disabled:cursor-not-allowed transition-colors"
              >
                Next &rarr;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
