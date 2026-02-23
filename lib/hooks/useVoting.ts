"use client";

import { useCallback, useState } from "react";
import { api, type VoteResult, ApiError } from "@/lib/api/client";

type VoteType = "spark" | "douse";
type ContentType = "post" | "comment";

interface UseVotingReturn {
  vote: (contentType: ContentType, contentId: string, voteType: VoteType) => Promise<VoteResult>;
  removeVote: (contentType: ContentType, contentId: string) => Promise<VoteResult>;
  voting: boolean;
  error: string | null;
}

export function useVoting(): UseVotingReturn {
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vote = useCallback(
    async (contentType: ContentType, contentId: string, voteType: VoteType) => {
      setVoting(true);
      setError(null);

      const path =
        contentType === "post"
          ? `/api/posts/${contentId}/vote`
          : `/api/comments/${contentId}/vote`;

      try {
        const result = await api.post<VoteResult>(path, { value: voteType === "spark" ? 1 : -1 });
        return result;
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to vote";
        setError(msg);
        throw err;
      } finally {
        setVoting(false);
      }
    },
    [],
  );

  const removeVote = useCallback(
    async (contentType: ContentType, contentId: string) => {
      setVoting(true);
      setError(null);

      const path =
        contentType === "post"
          ? `/api/posts/${contentId}/vote`
          : `/api/comments/${contentId}/vote`;

      try {
        const result = await api.delete<VoteResult>(path);
        return result;
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to remove vote";
        setError(msg);
        throw err;
      } finally {
        setVoting(false);
      }
    },
    [],
  );

  return { vote, removeVote, voting, error };
}
