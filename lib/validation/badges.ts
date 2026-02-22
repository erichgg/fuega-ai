import { z } from "zod";

export const setPrimaryBadgeSchema = z.object({
  badge_id: z
    .string()
    .min(1, "Badge ID is required")
    .max(50, "Badge ID too long")
    .regex(/^[a-z0-9_]+$/, "Invalid badge ID format"),
});

export type SetPrimaryBadgeInput = z.infer<typeof setPrimaryBadgeSchema>;
