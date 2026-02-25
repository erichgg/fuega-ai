"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Vote,
  ThumbsUp,
  ThumbsDown,
  Send,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/fuega/user-avatar";
import { GovernanceSkeleton } from "@/components/fuega/page-skeleton";
import { useAuth } from "@/lib/contexts/auth-context";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/api/client";

type ProposalStatus = "discussion" | "voting" | "passed" | "rejected" | "executed";

interface ProposalDetail {
  id: string;
  title: string;
  description: string;
  campfire: string;
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
}

interface DiscussionComment {
  id: string;
  body: string;
  author: string;
  createdAt: string;
}

function timeRemaining(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ProposalDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const proposalId = params.proposalId as string;

  const [proposal, setProposal] = React.useState<ProposalDetail | null>(null);
  const [discussion, setDiscussion] = React.useState<DiscussionComment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [userVote, setUserVote] = React.useState<"for" | "against" | null>(
    null,
  );
  const [commentText, setCommentText] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;

    async function fetchProposal() {
      setLoading(true);
      setError(null);
      try {
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

        const res = await api.get<{ proposal: ApiProposalDetail }>(
          `/api/proposals/${proposalId}`,
        );
        if (!cancelled) {
          const p = res.proposal;
          const statusMap: Record<string, ProposalStatus> = {
            failed: "rejected",
            implemented: "executed",
          };
          setProposal({
            id: p.id,
            title: p.title,
            description: p.description,
            campfire: p.campfire_name ?? "unknown",
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
          });
          // API does not return discussion comments yet
          setDiscussion([]);
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
  }, [proposalId]);

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

        {/* Vote bar */}
        <div className="mt-3">
          <div className="flex h-3 overflow-hidden rounded-full bg-charcoal">
            {totalVotes > 0 && (
              <>
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${forPercent}%` }}
                />
                <div
                  className="bg-red-500 transition-all"
                  style={{ width: `${100 - forPercent}%` }}
                />
              </>
            )}
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-green-400">
              {proposal.votesFor} for ({forPercent}%)
            </span>
            <span className="text-smoke">
              {totalVotes} total · Quorum: {proposal.quorum}
              {quorumReached ? (
                <CheckCircle2 className="ml-1 inline h-3 w-3 text-green-400" />
              ) : (
                <XCircle className="ml-1 inline h-3 w-3 text-smoke" />
              )}
            </span>
            <span className="text-red-400">
              {proposal.votesAgainst} against ({totalVotes > 0 ? 100 - forPercent : 0}%)
            </span>
          </div>
        </div>

        {/* Vote buttons */}
        {canVote && (
          <div className="mt-4 flex gap-3">
            <Button
              variant={userVote === "for" ? "default" : "outline"}
              size="sm"
              className={cn(
                "flex-1 gap-1.5",
                userVote === "for"
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "border-charcoal text-ash hover:border-green-500/50 hover:text-green-400",
              )}
              onClick={() => setUserVote(userVote === "for" ? null : "for")}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              Vote For
            </Button>
            <Button
              variant={userVote === "against" ? "default" : "outline"}
              size="sm"
              className={cn(
                "flex-1 gap-1.5",
                userVote === "against"
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "border-charcoal text-ash hover:border-red-500/50 hover:text-red-400",
              )}
              onClick={() =>
                setUserVote(userVote === "against" ? null : "against")
              }
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              Vote Against
            </Button>
          </div>
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
      <div className="mt-4">
        <h2 className="text-sm font-medium text-ash">
          Discussion ({discussion.length})
        </h2>

        {user && (
          <div className="mt-3 flex gap-3 rounded-lg border border-charcoal bg-charcoal/50 p-3">
            <UserAvatar username={user.username} size="sm" />
            <div className="flex-1">
              <Textarea
                placeholder="Add to the discussion..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
                className="min-h-[60px] resize-y border-charcoal bg-coal text-sm placeholder:text-smoke focus-visible:ring-flame-500/50"
              />
              <div className="mt-2 flex justify-end">
                <Button
                  variant="spark"
                  size="sm"
                  disabled={!commentText.trim()}
                  className="gap-1.5"
                  onClick={() => {
                    setDiscussion((prev) => [
                      ...prev,
                      {
                        id: `gd-new-${Date.now()}`,
                        body: commentText,
                        author: user.username,
                        createdAt: new Date().toISOString(),
                      },
                    ]);
                    setCommentText("");
                  }}
                >
                  <Send className="h-3.5 w-3.5" />
                  Comment
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 space-y-2">
          {discussion.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-smoke">No discussion yet</p>
            </div>
          )}
          {discussion.map((comment) => (
            <div
              key={comment.id}
              className="rounded-lg border border-charcoal/50 bg-charcoal/30 p-3"
            >
              <div className="flex items-center gap-2 text-xs text-smoke">
                <UserAvatar username={comment.author} size="sm" />
                <span className="font-medium text-ash">
                  {comment.author}
                </span>
                <span>·</span>
                <span>{timeAgo(comment.createdAt)}</span>
              </div>
              <p className="mt-1.5 text-sm text-ash leading-relaxed">
                {comment.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
