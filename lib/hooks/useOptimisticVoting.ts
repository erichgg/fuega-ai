"use client";

import * as React from "react";
import { useVoting } from "@/lib/hooks/useVoting";

type VoteState = "sparked" | "doused" | null;

export function useOptimisticVoting() {
  const { vote } = useVoting();
  const [votes, setVotes] = React.useState<Record<string, VoteState>>({});
  const [sparkDeltas, setSparkDeltas] = React.useState<Record<string, number>>({});

  const handleVote = React.useCallback(
    async (postId: string, voteType: "spark" | "douse") => {
      const current = votes[postId] ?? null;
      const newState: VoteState = voteType === "spark" ? "sparked" : "doused";

      if (current === newState) {
        setVotes((prev) => ({ ...prev, [postId]: null }));
        setSparkDeltas((prev) => ({ ...prev, [postId]: 0 }));
      } else {
        setVotes((prev) => ({ ...prev, [postId]: newState }));
        setSparkDeltas((prev) => ({
          ...prev,
          [postId]: voteType === "spark" ? 1 : -1,
        }));
      }

      try {
        await vote("post", postId, voteType);
      } catch {
        setVotes((prev) => ({ ...prev, [postId]: current }));
        setSparkDeltas((prev) => ({ ...prev, [postId]: 0 }));
      }
    },
    [votes, vote],
  );

  const getVote = React.useCallback(
    (postId: string): VoteState => votes[postId] ?? null,
    [votes],
  );

  const getDelta = React.useCallback(
    (postId: string): number => sparkDeltas[postId] ?? 0,
    [sparkDeltas],
  );

  return { handleVote, getVote, getDelta };
}
