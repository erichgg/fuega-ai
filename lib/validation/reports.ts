import { z } from "zod";

export const REPORT_REASONS = [
  "Spam",
  "Harassment",
  "Hate speech",
  "Misinformation",
  "Off-topic",
  "Other",
] as const;

export const createReportSchema = z
  .object({
    post_id: z.string().uuid("Invalid post ID").optional(),
    comment_id: z.string().uuid("Invalid comment ID").optional(),
    reason: z.enum(REPORT_REASONS, {
      errorMap: () => ({ message: "Invalid report reason" }),
    }),
    details: z
      .string()
      .max(2000, "Details must be at most 2,000 characters")
      .optional(),
  })
  .refine(
    (data) => data.post_id || data.comment_id,
    {
      message: "Must report either a post or a comment",
      path: ["post_id"],
    },
  );

export const listReportsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateReportBody = z.infer<typeof createReportSchema>;
export type ListReportsParams = z.infer<typeof listReportsSchema>;
