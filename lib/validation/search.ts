import { z } from "zod";

export const searchSchema = z.object({
  q: z.string().min(1, "Search query is required").max(200, "Search query too long"),
  type: z.enum(["all", "posts", "campfires", "users"]).default("all"),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export type SearchInput = z.infer<typeof searchSchema>;
