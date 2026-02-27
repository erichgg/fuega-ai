"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Bot,
  MessageSquare,
  Loader2,
  Settings,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GovernanceSkeleton } from "@/components/fuega/page-skeleton";
import { FlameGauge } from "@/components/fuega/flame-gauge";
import { ProposalTimeline } from "@/components/fuega/proposal-timeline";
import { useSparkStorm, VoteButtonText } from "@/components/fuega/spark-storm";
import { useAuth } from "@/lib/contexts/auth-context";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils/time-ago";
import { api, ApiError } from "@/lib/api/client";
import { useProposalVote } from "@/lib/hooks/useProposals";
import type { GovernanceVariable } from "@/lib/hooks/useGovernanceVariables";

type ProposalStatus = "discussion" | "voting" | "passed" | "rejected" | "executed";

interface ProposalDetail {
  id: string;
  title: string;
  description: string;
  campfire: string;
  campfireId: string;
  proposalType: string;
  status: ProposalStatus;
  votesFor: number;
  votesAgainst: number;
  commentCount: number;
  quorum: number;
  author: string;
  createdAt: string;
  discussionEndsAt: string;
  votingEndsAt: string;
  currentPrompt: string | null;
  proposedPrompt: string | null;
  variableKey: string | null;
  proposedValue: string | null;
}


function timeRemaining(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
}

export default function ProposalDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const proposalId = params.proposalId as string;

  const [proposal, setProposal] = React.useState<ProposalDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [userVote, setUserVote] = React.useState<"for" | "against" | null>(
    null,
  );
  const [voteError, setVoteError] = React.useState<string | null>(null);
  const { voteOnProposal, voting } = useProposalVote();

  // Governance variable details for change_settings proposals
  const [variableDetail, setVariableDetail] = React.useState<GovernanceVariable | null>(null);
  const [currentSettingValue, setCurrentSettingValue] = React.useState<string | null>(null);
  const [variableLoading, setVariableLoading] = React.useState(false);

  interface ApiProposalDetail {
    id: string;
    campfire_id: string;
    proposal_type: string;
    title: string;
    description: string;
    proposed_changes: Record<string, unknown>;
    status: string;
    votes_for: number;
    votes_against: number;
    votes_abstain: number;
    discussion_ends_at: string;
    voting_ends_at: string;
    created_at: string;
    creator_username?: string;
    campfire_name?: string;
  }

  const mapProposal = React.useCallback((p: ApiProposalDetail): ProposalDetail => {
    const statusMap: Record<string, ProposalStatus> = {
      failed: "rejected",
      implemented: "executed",
    };
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      campfire: p.campfire_name ?? "unknown",
      campfireId: p.campfire_id,
      proposalType: p.proposal_type,
      status: (statusMap[p.status] ?? p.status) as ProposalStatus,
      votesFor: p.votes_for,
      votesAgainst: p.votes_against,
      commentCount: 0,
      quorum: 100,
      author: p.creator_username ?? "unknown",
      createdAt: p.created_at,
      discussionEndsAt: p.discussion_ends_at,
      votingEndsAt: p.voting_ends_at,
      currentPrompt: (p.proposed_changes?.current_prompt as string) ?? null,
      proposedPrompt: (p.proposed_changes?.proposed_prompt as string) ?? null,
      variableKey: (p.proposed_changes?.variable_key as string) ?? null,
      proposedValue: (p.proposed_changes?.proposed_value as string) ?? null,
    };
  }, []);

  const refreshProposal = React.useCallback(async () => {
    try {
      const res = await api.get<{ proposal: ApiProposalDetail }>(
        `/api/proposals/${proposalId}`,
      );
      setProposal(mapProposal(res.proposal));
    } catch {
      // Silently fail on refresh — stale data is still visible
    }
  }, [proposalId, mapProposal]);

  React.useEffect(() => {
    let cancelled = false;

    async function fetchProposal() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<{ proposal: ApiProposalDetail }>(
          `/api/proposals/${proposalId}`,
        );
        if (!cancelled) {
          setProposal(mapProposal(res.proposal));
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) {
            setProposal(null);
          } else {
            setError(
              err instanceof ApiError ? err.message : "Failed to load proposal",
            );
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProposal();
    return () => { cancelled = true; };
  }, [proposalId, mapProposal]);

  // Fetch governance variable details when proposal is a settings change
  React.useEffect(() => {
    if (!proposal?.variableKey) return;
    let cancelled = false;
    setVariableLoading(true);

    async function fetchVariableDetails() {
      try {
        const varsRes = await api.get<{ variables: GovernanceVariable[] }>(
          "/api/governance-variables",
        );
        if (cancelled) return;
        const match = varsRes.variables.find((v) => v.key === proposal?.variableKey);
        if (match) setVariableDetail(match);

        // Try to fetch current campfire setting value
        if (proposal?.campfireId) {
          try {
            const settingsRes = await api.get<{
              settings: Array<{ key: string; value: string }>;
            }>(`/api/campfires/${proposal.campfireId}/settings`);
            if (cancelled) return;
            const setting = settingsRes.settings.find(
              (s) => s.key === proposal?.variableKey,
            );
            if (setting) setCurrentSettingValue(setting.value);
          } catch {
            // Fall back to variable default — currentSettingValue stays null
          }
        }
      } catch {
        // Non-critical — the proposal still renders without variable details
      } finally {
        if (!cancelled) setVariableLoading(false);
      }
    }

    fetchVariableDetails();
    return () => { cancelled = true; };
  }, [proposal?.variableKey, proposal?.campfireId]);

  const { triggerSpark, triggerDouse, triggerQuorum, SparkStormOverlay } = useSparkStorm();

  const handleVote = React.useCallback(async (vote: "for" | "against") => {
    if (voting) return;
    setVoteError(null);
    try {
      const prevTotal = (proposal?.votesFor ?? 0) + (proposal?.votesAgainst ?? 0);
      await voteOnProposal(proposalId, vote);
      setUserVote(vote);

      // Trigger celebration animation
      if (vote === "for") {
        triggerSpark();
      } else {
        triggerDouse();
      }

      await refreshProposal();

      // Check if quorum was just reached
      const newTotal = prevTotal + 1;
      if (proposal && newTotal >= proposal.quorum && prevTotal < proposal.quorum) {
        setTimeout(() => triggerQuorum(), 600);
      }
    } catch (err) {
      setVoteError(
        err instanceof ApiError ? err.message : "Failed to cast vote",
      );
    }
  }, [proposalId, voteOnProposal, voting, refreshProposal, proposal, triggerSpark, triggerDouse, triggerQuorum]);

  if (loading) return <GovernanceSkeleton />;
  if (error)
    return (
      <div className="py-16 text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-400/60" />
        <p className="mt-4 text-ash">{error}</p>
      </div>
    );
  if (!proposal)
    return (
      <div className="py-16 text-center">
        <p className="text-ash">Proposal not found</p>
      </div>
    );

  const totalVotes = proposal.votesFor + proposal.votesAgainst;
  const forPercent =
    totalVotes > 0
      ? Math.round((proposal.votesFor / totalVotes) * 100)
      : 0;
  const quorumReached = totalVotes >= proposal.quorum;
  const canVote = user && proposal.status === "voting";

  return (
    <div>
      <Link
        href="/governance"
        className="inline-flex items-center gap-1.5 text-sm text-smoke transition-colors hover:text-ash"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All proposals
      </Link>

      {/* Proposal lifecycle timeline */}
      <div className="mt-4 rounded-lg border border-charcoal bg-charcoal/50 p-4">
        <ProposalTimeline
          status={proposal.status}
          createdAt={proposal.createdAt}
          discussionEndsAt={proposal.discussionEndsAt}
          votingEndsAt={proposal.votingEndsAt}
        />
      </div>

      {/* Proposal header */}
      <div className="mt-4 rounded-lg border border-charcoal bg-charcoal/50 p-5">
        <div className="flex items-center gap-2 text-xs text-smoke">
          <Link
            href={`/f/${proposal.campfire}`}
            className="font-medium text-flame-400 hover:underline"
          >
            <span className="text-lava-hot">f</span><span className="text-smoke mx-1">|</span><span>{proposal.campfire}</span>
          </Link>
          <span>·</span>
          <span>by {proposal.author}</span>
          <span>·</span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              proposal.status === "voting" &&
                "bg-amber-500/20 text-amber-400 border-amber-500/30",
              proposal.status === "discussion" &&
                "bg-blue-500/20 text-blue-400 border-blue-500/30",
              proposal.status === "passed" &&
                "bg-green-500/20 text-green-400 border-green-500/30",
              proposal.status === "rejected" &&
                "bg-red-500/20 text-red-400 border-red-500/30",
              proposal.status === "executed" &&
                "bg-purple-500/20 text-purple-400 border-purple-500/30",
            )}
          >
            {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
          </Badge>
          <span>·</span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] gap-1",
              proposal.proposalType === "change_settings"
                ? "bg-flame-400/10 text-flame-400 border-flame-400/30"
                : proposal.proposalType === "addendum"
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                  : "bg-violet-500/10 text-violet-400 border-violet-500/30",
            )}
          >
            {proposal.proposalType === "change_settings" && (
              <Settings className="h-2.5 w-2.5" />
            )}
            {proposal.proposalType === "modify_prompt" && (
              <Bot className="h-2.5 w-2.5" />
            )}
            {proposal.proposalType === "change_settings"
              ? "Settings Change"
              : proposal.proposalType === "addendum"
                ? "Addendum"
                : "Modify Prompt"}
          </Badge>
        </div>

        <h1 className="mt-2 text-xl font-bold text-foreground">
          {proposal.title}
        </h1>

        <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ash">
          {proposal.description}
        </div>

        {/* Prompt diff */}
        {proposal.currentPrompt && proposal.proposedPrompt && (
          <div className="mt-6 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-medium text-ash">
              <Bot className="h-4 w-4" />
              Prompt Changes
            </h3>
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-red-400/70">
                Current Prompt
              </span>
              <p className="mt-1 text-xs text-ash italic">
                &quot;{proposal.currentPrompt}&quot;
              </p>
            </div>
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-green-400/70">
                Proposed Prompt
              </span>
              <p className="mt-1 text-xs text-ash italic">
                &quot;{proposal.proposedPrompt}&quot;
              </p>
            </div>
          </div>
        )}

        {/* Settings change */}
        {proposal.variableKey && proposal.proposedValue !== null && (
          <div className="mt-6 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-medium text-ash">
              <Settings className="h-4 w-4" />
              Settings Change
            </h3>

            {variableLoading ? (
              <div className="flex items-center gap-2 py-4 text-xs text-smoke">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading variable details...
              </div>
            ) : variableDetail ? (
              <div className="space-y-3">
                {/* Variable info */}
                <div className="rounded-lg border border-charcoal bg-coal/50 p-3">
                  <p className="text-sm font-medium text-foreground">
                    {variableDetail.display_name}
                  </p>
                  <p className="mt-1 text-xs text-smoke">
                    {variableDetail.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-md bg-charcoal px-2 py-0.5 text-[10px] font-medium text-smoke">
                      Type: {variableDetail.data_type}
                    </span>
                    {variableDetail.min_value !== null && (
                      <span className="inline-flex items-center rounded-md bg-charcoal px-2 py-0.5 text-[10px] font-medium text-smoke">
                        Min: {variableDetail.min_value}
                      </span>
                    )}
                    {variableDetail.max_value !== null && (
                      <span className="inline-flex items-center rounded-md bg-charcoal px-2 py-0.5 text-[10px] font-medium text-smoke">
                        Max: {variableDetail.max_value}
                      </span>
                    )}
                    {variableDetail.allowed_values && variableDetail.allowed_values.length > 0 && (
                      <span className="inline-flex items-center rounded-md bg-charcoal px-2 py-0.5 text-[10px] font-medium text-smoke">
                        Options: {variableDetail.allowed_values.join(", ")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Current vs Proposed */}
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-red-400/70">
                    Current
                  </span>
                  <p className="mt-1 text-sm font-mono text-ash">
                    {currentSettingValue ?? variableDetail.default_value}
                    {!currentSettingValue && (
                      <span className="ml-2 text-[10px] font-sans text-smoke">(default)</span>
                    )}
                  </p>
                </div>
                <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-green-400/70">
                    Proposed
                  </span>
                  <p className="mt-1 text-sm font-mono text-ash">
                    {proposal.proposedValue}
                  </p>
                </div>

                {/* Bounds validation indicator */}
                {(() => {
                  const isWithinBounds = (() => {
                    if (variableDetail.data_type === "integer") {
                      const num = Number(proposal.proposedValue);
                      if (isNaN(num)) return false;
                      if (variableDetail.min_value !== null && num < Number(variableDetail.min_value)) return false;
                      if (variableDetail.max_value !== null && num > Number(variableDetail.max_value)) return false;
                      return true;
                    }
                    if (variableDetail.data_type === "enum" || variableDetail.data_type === "multi_enum") {
                      if (!variableDetail.allowed_values) return true;
                      return variableDetail.allowed_values.includes(proposal.proposedValue ?? "");
                    }
                    return true;
                  })();
                  return (
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-xs",
                        isWithinBounds
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400",
                      )}
                    >
                      {isWithinBounds ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Proposed value is within allowed bounds
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Proposed value is outside allowed bounds
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* Fallback when variable details couldn't be loaded */
              <div className="space-y-3">
                <div className="rounded-lg border border-charcoal bg-coal/50 p-3">
                  <p className="text-sm font-mono text-ash">
                    {proposal.variableKey}
                  </p>
                </div>
                <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-green-400/70">
                    Proposed Value
                  </span>
                  <p className="mt-1 text-sm font-mono text-ash">
                    {proposal.proposedValue}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Time remaining */}
        <div className="mt-4 flex items-center gap-2 text-xs text-smoke">
          <Clock className="h-3.5 w-3.5" />
          {proposal.status === "voting"
            ? `Voting ends: ${timeRemaining(proposal.votingEndsAt)}`
            : proposal.status === "discussion"
              ? `Discussion ends: ${timeRemaining(proposal.discussionEndsAt)}`
              : `Ended ${timeAgo(proposal.votingEndsAt)}`}
        </div>
      </div>

      {/* Vote section */}
      <div className="mt-4 rounded-lg border border-charcoal bg-charcoal/50 p-5">
        <h2 className="text-sm font-medium text-ash">Votes</h2>

        {/* Flame gauge + vote summary */}
        <div className="mt-4 flex flex-col sm:flex-row items-center gap-6">
          <FlameGauge
            sparkVotes={proposal.votesFor}
            douseVotes={proposal.votesAgainst}
            quorum={proposal.quorum}
            totalMembers={proposal.quorum * 2}
            size="lg"
          />
          <div className="flex-1 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-flame-400 font-medium">
                <ThumbsUp className="h-3.5 w-3.5" />
                {proposal.votesFor} spark{proposal.votesFor !== 1 ? "s" : ""}
              </span>
              <span className="text-xs text-smoke">{forPercent}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-teal font-medium">
                <ThumbsDown className="h-3.5 w-3.5" />
                {proposal.votesAgainst} douse{proposal.votesAgainst !== 1 ? "s" : ""}
              </span>
              <span className="text-xs text-smoke">{totalVotes > 0 ? 100 - forPercent : 0}%</span>
            </div>
            <div className="border-t border-charcoal pt-2 flex items-center justify-between text-xs text-smoke">
              <span>{totalVotes} total votes</span>
              <span className="flex items-center gap-1">
                Quorum: {proposal.quorum}
                {quorumReached ? (
                  <CheckCircle2 className="h-3 w-3 text-flame-400" />
                ) : (
                  <XCircle className="h-3 w-3 text-smoke" />
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Vote buttons */}
        {canVote && !userVote && (
          <div className="mt-4 flex gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={voting}
              className="flex-1 gap-1.5 border-charcoal text-ash hover:border-flame-500/50 hover:text-flame-400 transition-all"
              onClick={() => handleVote("for")}
            >
              {voting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ThumbsUp className="h-3.5 w-3.5" />
              )}
              Vote For
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={voting}
              className="flex-1 gap-1.5 border-charcoal text-ash hover:border-teal/50 hover:text-teal transition-all"
              onClick={() => handleVote("against")}
            >
              {voting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ThumbsDown className="h-3.5 w-3.5" />
              )}
              Vote Against
            </Button>
          </div>
        )}

        {canVote && userVote && (
          <div className={cn(
            "mt-4 rounded-md border p-3 text-center",
            userVote === "for"
              ? "border-flame-500/30 bg-flame-500/10"
              : "border-teal/30 bg-teal/10",
          )}>
            <p className="text-sm text-ash">
              <VoteButtonText voted type={userVote === "for" ? "spark" : "douse"}>
                {userVote}
              </VoteButtonText>
            </p>
          </div>
        )}

        {voteError && (
          <p className="mt-2 text-center text-xs text-red-400">{voteError}</p>
        )}

        {!user && proposal.status === "voting" && (
          <p className="mt-4 text-center text-xs text-smoke">
            <Link href="/login" className="text-flame-400 hover:underline">
              Log in
            </Link>{" "}
            to vote on this proposal
          </p>
        )}
      </div>

      {/* Discussion */}
      <div className="mt-4 rounded-lg border border-charcoal bg-charcoal/50 p-5">
        <h2 className="flex items-center gap-2 text-sm font-medium text-ash">
          <MessageSquare className="h-4 w-4" />
          Discussion
        </h2>
        <p className="mt-3 text-center text-sm text-smoke py-4">
          Discussion comments coming soon. Proposal discussion will be available in a future update.
        </p>
      </div>

      {/* Spark storm celebration overlay */}
      <SparkStormOverlay />
    </div>
  );
}
