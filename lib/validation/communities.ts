import { z } from "zod";

const VALID_CATEGORIES = [
  "technology",
  "science",
  "politics",
  "entertainment",
  "sports",
] as const;

export const createCommunitySchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(21, "Name must be at most 21 characters")
    .regex(
      /^[a-z0-9_]+$/,
      "Name must be lowercase alphanumeric with underscores only"
    ),
  display_name: z
    .string()
    .min(1, "Display name is required")
    .max(100, "Display name must be at most 100 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be at most 500 characters"),
  category: z.enum(VALID_CATEGORIES, {
    errorMap: () => ({
      message: `Category must be one of: ${VALID_CATEGORIES.join(", ")}`,
    }),
  }),
});

export const updateCommunitySchema = z.object({
  display_name: z
    .string()
    .min(1, "Display name is required")
    .max(100, "Display name must be at most 100 characters")
    .optional(),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be at most 500 characters")
    .optional(),
});

export const listCommunitiesSchema = z.object({
  category: z.string().optional(),
  sort: z.enum(["members", "activity", "created_at"]).default("members"),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
export type UpdateCommunityInput = z.infer<typeof updateCommunitySchema>;
export type ListCommunitiesInput = z.infer<typeof listCommunitiesSchema>;
