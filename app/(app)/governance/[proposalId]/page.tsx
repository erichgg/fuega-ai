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
  MessageSquare,
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

type ProposalStatus = "discussion" | "voting" | "passed" | "rejected" | "executed";

// TEST_DATA - DELETE BEFORE PRODUCTION
function getMockProposal(id: string) {
  return {
    id,
    title: "Update f/tech moderation to allow more technical debates",
    description:
      "The current AI moderation prompt for f/tech is too aggressive when it comes to flagging technical disagreements and debates. Technical discussions often involve strong opinions and pointed critiques — this is healthy and should be encouraged.\n\nProposed changes:\n1. Recognize technical debates as constructive discourse\n2. Only flag personal attacks, not technical criticism\n3. Allow stronger language when discussing technical trade-offs\n4. Keep existing protections against harassment\n\nThis change would make f/tech a better place for genuine technical discussion while maintaining our standards against personal attacks.",
    community: "tech",
    proposalType: "modify_prompt" as const,
    status: "voting" as ProposalStatus,
    votesFor: 156,
    votesAgainst: 34,
    commentCount: 12,
    quorum: 100,
    author: "tech_advocate",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    discussionEndsAt: new Date(Date.now() - 86400000).toISOString(),
    votingEndsAt: new Date(Date.now() + 432000000).toISOString(),
    currentPrompt:
      "Moderate content for quality and relevance. Remove personal attacks and harassment. Flag misinformation.",
    proposedPrompt:
      "Moderate content for quality and relevance. Recognize technical debates as constructive — only flag personal attacks, not technical criticism. Allow strong language when discussing technical trade-offs. Remove harassment. Flag misinformation.",
  };
}

// TEST_DATA - DELETE BEFORE PRODUCTION
function getMockDiscussion() {
  return [
    {
      id: "gd1",
      body: "Strong support for this. The current prompt flags too many legitimate technical debates.",
      author: "dev_daily",
      createdAt: new Date(Date.now() - 100000000).toISOString(),
    },
    {
      id: "gd2",
      body: "I worry this might open the door to toxic behavior disguised as 'technical criticism'. How do we draw the line?",
      author: "safety_first",
      createdAt: new Date(Date.now() - 80000000).toISOString(),
    },
    {
      id: "gd3",
      body: "Good point. The proposed prompt still keeps protections against personal attacks. The key distinction is: criticize the code/architecture, not the person.",
      author: "tech_advocate",
      createdAt: new Date(Date.now() - 60000000).toISOString(),
    },
  ];
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

  const [proposal, setProposal] = React.useState<ReturnType<
    typeof getMockProposal
  > | null>(null);
  const [discussion, setDiscussion] = React.useState<
    ReturnType<typeof getMockDiscussion>
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [userVote, setUserVote] = React.useState<"for" | "against" | null>(
    null,
  );
  const [commentText, setCommentText] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setProposal(getMockProposal(proposalId));
      setDiscussion(getMockDiscussion());
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [proposalId]);

  if (loading) return <GovernanceSkeleton />;
  if (!proposal)
    return (
      <div className="py-16 text-center">
        <p className="text-ash-400">Proposal not found</p>
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
        className="inline-flex items-center gap-1.5 text-sm text-ash-500 transition-colors hover:text-ash-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All proposals
      </Link>

      {/* Proposal header */}
      <div className="mt-4 rounded-lg border border-ash-800 bg-ash-900/50 p-5">
        <div className="flex items-center gap-2 text-xs text-ash-500">
          <Link
            href={`/f/${proposal.community}`}
            className="font-medium text-flame-400 hover:underline"
          >
            f/{proposal.community}
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

        <h1 className="mt-2 text-xl font-bold text-ash-100">
          {proposal.title}
        </h1>

        <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ash-300">
          {proposal.description}
        </div>

        {/* Prompt diff */}
        {proposal.currentPrompt && proposal.proposedPrompt && (
          <div className="mt-6 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-medium text-ash-300">
              <Bot className="h-4 w-4" />
              Prompt Changes
            </h3>
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-red-400/70">
                Current Prompt
              </span>
              <p className="mt-1 text-xs text-ash-400 italic">
                &quot;{proposal.currentPrompt}&quot;
              </p>
            </div>
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-green-400/70">
                Proposed Prompt
              </span>
              <p className="mt-1 text-xs text-ash-300 italic">
                &quot;{proposal.proposedPrompt}&quot;
              </p>
            </div>
          </div>
        )}

        {/* Time remaining */}
        <div className="mt-4 flex items-center gap-2 text-xs text-ash-500">
          <Clock className="h-3.5 w-3.5" />
          {proposal.status === "voting"
            ? `Voting ends: ${timeRemaining(proposal.votingEndsAt)}`
            : proposal.status === "discussion"
              ? `Discussion ends: ${timeRemaining(proposal.discussionEndsAt)}`
              : `Ended ${timeAgo(proposal.votingEndsAt)}`}
        </div>
      </div>

      {/* Vote section */}
      <div className="mt-4 rounded-lg border border-ash-800 bg-ash-900/50 p-5">
        <h2 className="text-sm font-medium text-ash-300">Votes</h2>

        {/* Vote bar */}
        <div className="mt-3">
          <div className="flex h-3 overflow-hidden rounded-full bg-ash-800">
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
            <span className="text-ash-500">
              {totalVotes} total · Quorum: {proposal.quorum}
              {quorumReached ? (
                <CheckCircle2 className="ml-1 inline h-3 w-3 text-green-400" />
              ) : (
                <XCircle className="ml-1 inline h-3 w-3 text-ash-600" />
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
                  : "border-ash-700 text-ash-400 hover:border-green-500/50 hover:text-green-400",
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
                  : "border-ash-700 text-ash-400 hover:border-red-500/50 hover:text-red-400",
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
          <p className="mt-4 text-center text-xs text-ash-500">
            <Link href="/login" className="text-flame-400 hover:underline">
              Log in
            </Link>{" "}
            to vote on this proposal
          </p>
        )}
      </div>

      {/* Discussion */}
      <div className="mt-4">
        <h2 className="text-sm font-medium text-ash-300">
          Discussion ({discussion.length})
        </h2>

        {user && (
          <div className="mt-3 flex gap-3 rounded-lg border border-ash-800 bg-ash-900/50 p-3">
            <UserAvatar username={user.username} size="sm" />
            <div className="flex-1">
              <Textarea
                placeholder="Add to the discussion..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
                className="min-h-[60px] resize-y border-ash-800 bg-ash-950 text-sm placeholder:text-ash-600 focus-visible:ring-flame-500/50"
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
          {discussion.map((comment) => (
            <div
              key={comment.id}
              className="rounded-lg border border-ash-800/50 bg-ash-900/30 p-3"
            >
              <div className="flex items-center gap-2 text-xs text-ash-500">
                <UserAvatar username={comment.author} size="sm" />
                <span className="font-medium text-ash-300">
                  {comment.author}
                </span>
                <span>·</span>
                <span>{timeAgo(comment.createdAt)}</span>
              </div>
              <p className="mt-1.5 text-sm text-ash-300 leading-relaxed">
                {comment.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
