import { z } from "zod";

const PROPOSAL_TYPES = [
  "modify_prompt",
  "addendum_prompt",
  "change_settings",
] as const;

export const createProposalSchema = z.object({
  community_id: z.string().uuid("Invalid community ID"),
  proposal_type: z.enum(PROPOSAL_TYPES, {
    errorMap: () => ({
      message: `Proposal type must be one of: ${PROPOSAL_TYPES.join(", ")}`,
    }),
  }),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(5000, "Description must be at most 5,000 characters"),
  proposed_changes: z.record(z.unknown()).refine(
    (val) => Object.keys(val).length > 0,
    { message: "Proposed changes cannot be empty" }
  ),
});

export const listProposalsSchema = z.object({
  community_id: z.string().uuid("Invalid community ID"),
  status: z
    .enum(["discussion", "voting", "passed", "failed", "implemented"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export const voteProposalSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1)], {
    errorMap: () => ({ message: "Vote value must be 1 (for) or -1 (against)" }),
  }),
});

export type CreateProposalInput = z.infer<typeof createProposalSchema>;
export type ListProposalsInput = z.infer<typeof listProposalsSchema>;
export type VoteProposalInput = z.infer<typeof voteProposalSchema>;
