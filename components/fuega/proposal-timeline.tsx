"use client";

import * as React from "react";
import {
  FileText,
  MessageSquare,
  Vote,
  CheckCircle2,
  XCircle,
  Zap,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProposalStatus = "discussion" | "voting" | "passed" | "rejected" | "executed";

interface ProposalTimelineProps {
  status: ProposalStatus;
  createdAt: string;
  discussionEndsAt: string;
  votingEndsAt: string;
  executedAt?: string | null;
  className?: string;
}

interface TimelineNode {
  key: string;
  label: string;
  icon: React.ElementType;
  state: "completed" | "active" | "future";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCountdown(targetDate: string): string {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function buildNodes(status: ProposalStatus): TimelineNode[] {
  // Phase order: created -> discussion -> voting -> outcome -> executed
  const phases: Array<{
    key: string;
    label: string;
    icon: React.ElementType;
  }> = [
    { key: "created", label: "Created", icon: FileText },
    { key: "discussion", label: "Discussion", icon: MessageSquare },
    { key: "voting", label: "Voting", icon: Vote },
    {
      key: "outcome",
      label: status === "rejected" ? "Failed" : "Passed",
      icon: status === "rejected" ? XCircle : CheckCircle2,
    },
    { key: "executed", label: "Executed", icon: Zap },
  ];

  const statusIndex: Record<ProposalStatus, number> = {
    discussion: 1,
    voting: 2,
    passed: 3,
    rejected: 3,
    executed: 4,
  };

  const activeIdx = statusIndex[status];

  return phases.map((phase, i): TimelineNode => {
    let state: TimelineNode["state"] = "future";
    if (i < activeIdx) state = "completed";
    else if (i === activeIdx) state = "active";
    return { ...phase, state };
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProposalTimeline({
  status,
  createdAt,
  discussionEndsAt,
  votingEndsAt,
  executedAt,
  className,
}: ProposalTimelineProps) {
  const nodes = React.useMemo(() => buildNodes(status), [status]);

  // Live countdown
  const [countdown, setCountdown] = React.useState("");

  React.useEffect(() => {
    function update() {
      if (status === "discussion") {
        setCountdown(getCountdown(discussionEndsAt));
      } else if (status === "voting") {
        setCountdown(getCountdown(votingEndsAt));
      } else {
        setCountdown("");
      }
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [status, discussionEndsAt, votingEndsAt]);

  // Find the index of the active node for positioning the countdown
  const activeIdx = nodes.findIndex((n) => n.state === "active");

  return (
    <div
      className={cn("w-full", className)}
      role="navigation"
      aria-label="Proposal lifecycle timeline"
    >
      {/* Desktop: horizontal */}
      <div className="hidden sm:block">
        <div className="relative flex items-center justify-between">
          {nodes.map((node, i) => {
            const Icon = node.icon;
            const isLast = i === nodes.length - 1;

            return (
              <React.Fragment key={node.key}>
                {/* Node */}
                <div className="relative z-10 flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all",
                      node.state === "completed" &&
                        "border-flame-500 bg-flame-500/20",
                      node.state === "active" &&
                        "border-flame-400 bg-flame-400/10 timeline-breathe",
                      node.state === "future" &&
                        "border-charcoal bg-coal/50",
                    )}
                    aria-current={node.state === "active" ? "step" : undefined}
                  >
                    {node.state === "completed" ? (
                      <Check className="h-4 w-4 text-flame-400" />
                    ) : (
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          node.state === "active" ? "text-flame-400" : "text-smoke",
                        )}
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-mono font-medium tracking-wide",
                      node.state === "completed" && "text-flame-400",
                      node.state === "active" && "text-foreground",
                      node.state === "future" && "text-smoke",
                    )}
                  >
                    {node.label}
                  </span>
                  {/* Timestamp under completed nodes */}
                  {node.state === "completed" && node.key === "created" && (
                    <span className="text-[9px] text-smoke font-mono">
                      {new Date(createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Connecting line */}
                {!isLast && (
                  <div className="relative flex-1 mx-2">
                    {/* Background track */}
                    <div className="h-0.5 w-full bg-charcoal rounded-full" />
                    {/* Filled portion */}
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 h-0.5 rounded-full transition-all duration-700",
                        (nodes[i + 1]?.state ?? "future") !== "future"
                          ? "bg-flame-500 w-full"
                          : node.state === "active"
                            ? "bg-gradient-to-r from-flame-500 to-flame-500/20 w-1/2"
                            : "w-0",
                      )}
                    />
                    {/* Countdown label on active transition */}
                    {countdown && i === activeIdx && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                        <span className="rounded-full bg-flame-500/15 border border-flame-500/20 px-2 py-0.5 text-[9px] font-mono text-flame-400 whitespace-nowrap">
                          {countdown}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Mobile: vertical compact */}
      <div className="block sm:hidden">
        <div className="flex flex-col">
          {nodes.map((node, i) => {
            const Icon = node.icon;
            const isLast = i === nodes.length - 1;

            return (
              <React.Fragment key={node.key}>
                <div className="flex items-center gap-3">
                  {/* Node dot */}
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                      node.state === "completed" &&
                        "border-flame-500 bg-flame-500/20",
                      node.state === "active" &&
                        "border-flame-400 bg-flame-400/10 timeline-breathe",
                      node.state === "future" &&
                        "border-charcoal bg-coal/50",
                    )}
                    aria-current={node.state === "active" ? "step" : undefined}
                  >
                    {node.state === "completed" ? (
                      <Check className="h-3 w-3 text-flame-400" />
                    ) : (
                      <Icon
                        className={cn(
                          "h-3 w-3",
                          node.state === "active" ? "text-flame-400" : "text-smoke",
                        )}
                      />
                    )}
                  </div>
                  {/* Label + countdown */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "text-xs font-mono font-medium",
                        node.state === "completed" && "text-flame-400",
                        node.state === "active" && "text-foreground",
                        node.state === "future" && "text-smoke",
                      )}
                    >
                      {node.label}
                    </span>
                    {countdown && node.state === "active" && (
                      <span className="rounded-full bg-flame-500/15 border border-flame-500/20 px-1.5 py-0.5 text-[9px] font-mono text-flame-400">
                        {countdown}
                      </span>
                    )}
                  </div>
                </div>
                {/* Vertical line */}
                {!isLast && (
                  <div className="ml-[13px] h-3 w-0.5 rounded-full my-0.5">
                    <div
                      className={cn(
                        "h-full w-full rounded-full",
                        (nodes[i + 1]?.state ?? "future") !== "future"
                          ? "bg-flame-500"
                          : "bg-charcoal",
                      )}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
