import { z } from "zod";

export const voteSchema = z.object({
  value: z
    .number()
    .int()
    .refine((v) => v === 1 || v === -1, {
      message: "Vote value must be 1 (spark) or -1 (douse)",
    }),
});

export type VoteInput = z.infer<typeof voteSchema>;
