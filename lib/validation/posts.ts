import { z } from "zod";

export const createPostSchema = z
  .object({
    community_id: z.string().uuid("Invalid community ID"),
    title: z
      .string()
      .min(1, "Title is required")
      .max(300, "Title must be at most 300 characters"),
    body: z
      .string()
      .max(40000, "Body must be at most 40,000 characters")
      .optional()
      .nullable(),
    post_type: z.enum(["text", "link", "image"], {
      errorMap: () => ({ message: "Post type must be text, link, or image" }),
    }),
    url: z
      .string()
      .url("Invalid URL")
      .refine((u) => u.startsWith("https://"), {
        message: "URL must use HTTPS",
      })
      .optional()
      .nullable(),
    image_url: z.string().url("Invalid image URL").optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.post_type === "text") return true;
      if (data.post_type === "link") return !!data.url;
      if (data.post_type === "image") return !!data.image_url;
      return false;
    },
    {
      message:
        "Link posts require a URL, image posts require an image_url",
      path: ["url"],
    }
  );

export const updatePostSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(300, "Title must be at most 300 characters")
    .optional(),
  body: z
    .string()
    .max(40000, "Body must be at most 40,000 characters")
    .optional()
    .nullable(),
});

export const listPostsSchema = z.object({
  community: z.string().optional(),
  sort: z
    .enum(["hot", "new", "top", "rising", "controversial"])
    .default("hot"),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type ListPostsInput = z.infer<typeof listPostsSchema>;
