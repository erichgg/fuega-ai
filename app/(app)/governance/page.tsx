"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Vote,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GovernanceSkeleton } from "@/components/fuega/page-skeleton";
import { useAuth } from "@/lib/contexts/auth-context";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/api/client";
import type { Campfire, Proposal as ApiProposal } from "@/lib/api/client";

type ProposalStatus = "discussion" | "voting" | "passed" | "rejected" | "executed";

interface Proposal {
  id: string;
  title: string;
  description: string;
  campfire: string;
  proposalType: "modify_prompt" | "addendum_prompt" | "change_settings";
  status: ProposalStatus;
  votesFor: number;
  votesAgainst: number;
  commentCount: number;
  author: string;
  createdAt: string;
  endsAt: string;
}

const statusConfig: Record<
  ProposalStatus,
  { label: string; color: string; icon: typeof Clock }
> = {
  discussion: {
    label: "Discussion",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: MessageSquare,
  },
  voting: {
    label: "Voting",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: Vote,
  },
  passed: {
    label: "Passed",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: XCircle,
  },
  executed: {
    label: "Executed",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    icon: CheckCircle2,
  },
};

const typeLabels: Record<string, string> = {
  modify_prompt: "Modify Prompt",
  addendum_prompt: "Addendum",
  change_settings: "Settings Change",
};


function timeRemaining(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
}

export default function GovernancePage() {
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto max-w-2xl py-16 text-center text-ash">
          Loading...
        </div>
      }
    >
      <GovernancePageInner />
    </React.Suspense>
  );
}

function GovernancePageInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const campfireFilter = searchParams.get("campfire");

  const [proposals, setProposals] = React.useState<Proposal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<
    ProposalStatus | "all"
  >("all");

  React.useEffect(() => {
    let cancelled = false;

    async function fetchProposals() {
      if (!campfireFilter) {
        // No campfire selected -- cross-campfire listing is not supported
        setProposals([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Resolve campfire name to ID
        const campfireRes = await api.get<{ campfires: Campfire[] }>(
          "/api/campfires",
          { limit: 100 },
        );
        const campfire = campfireRes.campfires.find(
          (c) => c.name === campfireFilter,
        );
        if (!campfire) {
          if (!cancelled) {
            setProposals([]);
            setLoading(false);
          }
          return;
        }

        const res = await api.get<{ proposals: ApiProposal[] }>(
          "/api/proposals",
          { campfire_id: campfire.id },
        );
        if (!cancelled) {
          // Map API proposal shape to page Proposal shape
          setProposals(
            res.proposals.map((p): Proposal => ({
              id: p.id,
              title: p.title,
              description: p.description,
              campfire: campfireFilter,
              proposalType: (p.proposed_changes?.type as Proposal["proposalType"]) ?? "change_settings",
              status: (p.status === "failed" ? "rejected" : p.status === "implemented" ? "executed" : p.status) as ProposalStatus,
              votesFor: p.votes_for,
              votesAgainst: p.votes_against,
              commentCount: 0,
              author: (p as Record<string, unknown>).creator_username as string ?? "unknown",
              createdAt: p.created_at,
              endsAt: p.voting_ends_at ?? p.created_at,
            })),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Failed to load proposals",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProposals();
    return () => { cancelled = true; };
  }, [campfireFilter]);

  const filteredProposals =
    statusFilter === "all"
      ? proposals
      : proposals.filter((p) => p.status === statusFilter);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Governance</h1>
          <p className="mt-1 text-sm text-ash">
            {campfireFilter
              ? `Proposals for f | ${campfireFilter}`
              : "Active proposals across all campfires"}
          </p>
        </div>
        {user && (
          <Button variant="spark" size="sm" className="gap-1.5 self-start">
            <Plus className="h-4 w-4" />
            Create Proposal
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-smoke" />
        {(
          ["all", "discussion", "voting", "passed", "rejected", "executed"] as const
        ).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              statusFilter === status
                ? "bg-flame-500/20 text-flame-400"
                : "text-smoke hover:text-ash",
            )}
          >
            {status === "all" ? "All" : statusConfig[status].label}
          </button>
        ))}
      </div>

      {/* Proposals list */}
      <div className="mt-6 space-y-3">
        {loading ? (
          <GovernanceSkeleton />
        ) : error ? (
          <div className="py-16 text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-400/60" />
            <p className="mt-4 text-ash">{error}</p>
          </div>
        ) : !campfireFilter ? (
          <div className="py-16 text-center">
            <Vote className="mx-auto h-12 w-12 text-smoke/60" />
            <p className="mt-4 text-ash">Select a campfire to view its proposals</p>
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="py-16 text-center">
            <Vote className="mx-auto h-12 w-12 text-smoke/60" />
            <p className="mt-4 text-ash">No proposals found</p>
          </div>
        ) : (
          filteredProposals.map((proposal) => {
            const config = statusConfig[proposal.status];
            const StatusIcon = config.icon;
            const totalVotes = proposal.votesFor + proposal.votesAgainst;
            const forPercent =
              totalVotes > 0
                ? Math.round((proposal.votesFor / totalVotes) * 100)
                : 0;

            return (
              <Link
                key={proposal.id}
                href={`/governance/${proposal.id}`}
                className="block rounded-lg border border-charcoal bg-charcoal/50 p-4 transition-colors hover:border-charcoal"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-smoke">
                      <span className="font-medium text-flame-400">
                        <span className="text-lava-hot">f</span><span className="text-smoke mx-1">|</span><span>{proposal.campfire}</span>
                      </span>
                      <span>·</span>
                      <span>{proposal.author}</span>
                      <span>·</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] text-ash border-charcoal"
                      >
                        {typeLabels[proposal.proposalType]}
                      </Badge>
                    </div>
                    <h3 className="mt-1 text-sm font-medium text-foreground">
                      {proposal.title}
                    </h3>
                    <p className="mt-1 text-xs text-ash line-clamp-2">
                      {proposal.description}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("shrink-0 gap-1 text-[10px]", config.color)}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                </div>

                {/* Vote bar */}
                {totalVotes > 0 && (
                  <div className="mt-3">
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-charcoal">
                      <div
                        className="bg-green-500 transition-all"
                        style={{ width: `${forPercent}%` }}
                      />
                      <div
                        className="bg-red-500 transition-all"
                        style={{ width: `${100 - forPercent}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-smoke">
                      <span className="text-green-400">
                        {proposal.votesFor} for ({forPercent}%)
                      </span>
                      <span className="text-red-400">
                        {proposal.votesAgainst} against
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-2 flex items-center gap-4 text-[10px] text-smoke">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {proposal.commentCount} comments
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeRemaining(proposal.endsAt)}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
