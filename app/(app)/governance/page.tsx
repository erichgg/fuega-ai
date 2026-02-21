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

type ProposalStatus = "discussion" | "voting" | "passed" | "rejected" | "executed";

interface Proposal {
  id: string;
  title: string;
  description: string;
  community: string;
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

// TEST_DATA - DELETE BEFORE PRODUCTION
const MOCK_PROPOSALS: Proposal[] = [
  {
    id: "prop_1",
    title: "Update f/tech moderation to allow more technical debates",
    description:
      "Current prompt is too aggressive in flagging technical disagreements. Proposed change would recognize technical debates as healthy discourse.",
    community: "tech",
    proposalType: "modify_prompt",
    status: "voting",
    votesFor: 156,
    votesAgainst: 34,
    commentCount: 45,
    author: "tech_advocate",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    endsAt: new Date(Date.now() + 432000000).toISOString(),
  },
  {
    id: "prop_2",
    title: "Add misinformation detection addendum to f/science prompt",
    description:
      "Propose adding an addendum specifically targeting scientific misinformation while still allowing speculative discussion.",
    community: "science",
    proposalType: "addendum_prompt",
    status: "discussion",
    votesFor: 0,
    votesAgainst: 0,
    commentCount: 23,
    author: "science_nerd_42",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    endsAt: new Date(Date.now() + 86400000).toISOString(),
  },
  {
    id: "prop_3",
    title: "Reduce voting period from 7 days to 5 days for f/gaming",
    description:
      "The gaming community moves fast. 7 days is too long for governance decisions. Proposing 5-day voting period.",
    community: "gaming",
    proposalType: "change_settings",
    status: "passed",
    votesFor: 89,
    votesAgainst: 12,
    commentCount: 15,
    author: "gamer_gov",
    createdAt: new Date(Date.now() - 604800000).toISOString(),
    endsAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "prop_4",
    title: "Stricter hate speech detection in f/politics",
    description:
      "Proposing updated moderation prompt with better hate speech detection while preserving political debate.",
    community: "politics",
    proposalType: "modify_prompt",
    status: "rejected",
    votesFor: 45,
    votesAgainst: 67,
    commentCount: 89,
    author: "policy_wonk",
    createdAt: new Date(Date.now() - 1209600000).toISOString(),
    endsAt: new Date(Date.now() - 604800000).toISOString(),
  },
];

function timeRemaining(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
}

export default function GovernancePage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const communityFilter = searchParams.get("community");

  const [proposals, setProposals] = React.useState<Proposal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<
    ProposalStatus | "all"
  >("all");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      let filtered = [...MOCK_PROPOSALS];
      if (communityFilter) {
        filtered = filtered.filter((p) => p.community === communityFilter);
      }
      setProposals(filtered);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [communityFilter]);

  const filteredProposals =
    statusFilter === "all"
      ? proposals
      : proposals.filter((p) => p.status === statusFilter);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ash-100">Governance</h1>
          <p className="mt-1 text-sm text-ash-400">
            {communityFilter
              ? `Proposals for f/${communityFilter}`
              : "Active proposals across all communities"}
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
        <Filter className="h-4 w-4 text-ash-500" />
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
                : "text-ash-500 hover:text-ash-300",
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
        ) : filteredProposals.length === 0 ? (
          <div className="py-16 text-center">
            <Vote className="mx-auto h-12 w-12 text-ash-700" />
            <p className="mt-4 text-ash-400">No proposals found</p>
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
                className="block rounded-lg border border-ash-800 bg-ash-900/50 p-4 transition-colors hover:border-ash-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-ash-500">
                      <span className="font-medium text-flame-400">
                        f/{proposal.community}
                      </span>
                      <span>·</span>
                      <span>{proposal.author}</span>
                      <span>·</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] text-ash-400 border-ash-700"
                      >
                        {typeLabels[proposal.proposalType]}
                      </Badge>
                    </div>
                    <h3 className="mt-1 text-sm font-medium text-ash-100">
                      {proposal.title}
                    </h3>
                    <p className="mt-1 text-xs text-ash-400 line-clamp-2">
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
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-ash-800">
                      <div
                        className="bg-green-500 transition-all"
                        style={{ width: `${forPercent}%` }}
                      />
                      <div
                        className="bg-red-500 transition-all"
                        style={{ width: `${100 - forPercent}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-ash-500">
                      <span className="text-green-400">
                        {proposal.votesFor} for ({forPercent}%)
                      </span>
                      <span className="text-red-400">
                        {proposal.votesAgainst} against
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-2 flex items-center gap-4 text-[10px] text-ash-600">
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
