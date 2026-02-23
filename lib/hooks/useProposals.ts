"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Proposal, ApiError } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// List proposals for a campfire
// ---------------------------------------------------------------------------

interface UseProposalsOptions {
  campfireId: string;
  status?: "discussion" | "voting" | "passed" | "failed" | "implemented";
  limit?: number;
}

interface UseProposalsReturn {
  proposals: Proposal[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useProposals(opts: UseProposalsOptions): UseProposalsReturn {
  const { campfireId, status, limit = 25 } = opts;
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchProposals = useCallback(
    async (reset: boolean) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const currentOffset = reset ? 0 : offset;
      setLoading(true);
      setError(null);

      try {
        const data = await api.get<{ proposals: Proposal[]; count: number }>(
          "/api/proposals",
          { campfire_id: campfireId, status, limit, offset: currentOffset },
          controller.signal,
        );

        if (reset) {
          setProposals(data.proposals);
        } else {
          setProposals((prev) => [...prev, ...data.proposals]);
        }

        setHasMore(data.count >= limit);
        setOffset(currentOffset + data.count);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof ApiError ? err.message : "Failed to load proposals");
      } finally {
        setLoading(false);
      }
    },
    [campfireId, status, limit, offset],
  );

  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    fetchProposals(true);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campfireId, status, limit]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchProposals(false);
  }, [hasMore, loading, fetchProposals]);

  const refresh = useCallback(async () => {
    setOffset(0);
    setHasMore(true);
    await fetchProposals(true);
  }, [fetchProposals]);

  return { proposals, loading, error, hasMore, loadMore, refresh };
}

// ---------------------------------------------------------------------------
// Single proposal
// ---------------------------------------------------------------------------

interface UseProposalReturn {
  proposal: Proposal | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProposal(proposalId: string | undefined): UseProposalReturn {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!proposalId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ proposal: Proposal }>(`/api/proposals/${proposalId}`);
      setProposal(data.proposal);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load proposal");
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { proposal, loading, error, refresh };
}

// ---------------------------------------------------------------------------
// Create proposal
// ---------------------------------------------------------------------------

interface CreateProposalInput {
  campfire_id: string;
  proposal_type: "modify_prompt" | "addendum_prompt" | "change_settings";
  title: string;
  description: string;
  proposed_changes: Record<string, unknown>;
}

interface UseCreateProposalReturn {
  createProposal: (input: CreateProposalInput) => Promise<{ proposal: Proposal }>;
  creating: boolean;
  error: string | null;
}

export function useCreateProposal(): UseCreateProposalReturn {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProposal = useCallback(async (input: CreateProposalInput) => {
    setCreating(true);
    setError(null);
    try {
      const data = await api.post<{ proposal: Proposal }>("/api/proposals", input);
      return data;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create proposal";
      setError(msg);
      throw err;
    } finally {
      setCreating(false);
    }
  }, []);

  return { createProposal, creating, error };
}

// ---------------------------------------------------------------------------
// Vote on proposal
// ---------------------------------------------------------------------------

type ProposalVote = "for" | "against";

interface UseProposalVoteReturn {
  voteOnProposal: (proposalId: string, vote: ProposalVote) => Promise<void>;
  voting: boolean;
  error: string | null;
}

export function useProposalVote(): UseProposalVoteReturn {
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const voteOnProposal = useCallback(async (proposalId: string, vote: ProposalVote) => {
    setVoting(true);
    setError(null);
    try {
      await api.post(`/api/proposals/${proposalId}/vote`, {
        value: vote === "for" ? 1 : -1,
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to vote on proposal";
      setError(msg);
      throw err;
    } finally {
      setVoting(false);
    }
  }, []);

  return { voteOnProposal, voting, error };
}
