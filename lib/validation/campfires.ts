import { z } from "zod";

export const createCampfireSchema = z.object({
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
});

export const updateCampfireSchema = z.object({
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

export const listCampfiresSchema = z.object({
  sort: z.enum(["members", "activity", "created_at"]).default("members"),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateCampfireInput = z.infer<typeof createCampfireSchema>;
export type UpdateCampfireInput = z.infer<typeof updateCampfireSchema>;
export type ListCampfiresInput = z.infer<typeof listCampfiresSchema>;
