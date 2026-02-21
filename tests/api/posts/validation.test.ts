import { describe, it, expect } from "vitest";
import { createPostSchema, updatePostSchema, listPostsSchema } from "@/lib/validation/posts";
import { createCommentSchema, updateCommentSchema } from "@/lib/validation/comments";
import { voteSchema } from "@/lib/validation/votes";

// ─── Post Validation ─────────────────────────────────────────

describe("createPostSchema", () => {
  it("accepts a valid text post", () => {
    const result = createPostSchema.safeParse({
      community_id: "30000000-0000-0000-0000-000000000001",
      title: "Test Post Title",
      body: "This is the body of the post.",
      post_type: "text",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid link post", () => {
    const result = createPostSchema.safeParse({
      community_id: "30000000-0000-0000-0000-000000000001",
      title: "Check out this link",
      post_type: "link",
      url: "https://example.com/article",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid image post", () => {
    const result = createPostSchema.safeParse({
      community_id: "30000000-0000-0000-0000-000000000001",
      title: "Cool image",
      post_type: "image",
      image_url: "https://cdn.example.com/image.png",
    });
    expect(result.success).toBe(true);
  });

  it("rejects link post without url", () => {
    const result = createPostSchema.safeParse({
      community_id: "30000000-0000-0000-0000-000000000001",
      title: "Missing URL",
      post_type: "link",
    });
    expect(result.success).toBe(false);
  });

  it("rejects image post without image_url", () => {
    const result = createPostSchema.safeParse({
      community_id: "30000000-0000-0000-0000-000000000001",
      title: "Missing image",
      post_type: "image",
    });
    expect(result.success).toBe(false);
  });

  it("rejects http URL (requires https)", () => {
    const result = createPostSchema.safeParse({
      community_id: "30000000-0000-0000-0000-000000000001",
      title: "HTTP link",
      post_type: "link",
      url: "http://insecure.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = createPostSchema.safeParse({
      community_id: "30000000-0000-0000-0000-000000000001",
      title: "",
      post_type: "text",
      body: "Body text",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title over 300 chars", () => {
    const result = createPostSchema.safeParse({
      community_id: "30000000-0000-0000-0000-000000000001",
      title: "x".repeat(301),
      post_type: "text",
    });
    expect(result.success).toBe(false);
  });

  it("rejects body over 40,000 chars", () => {
    const result = createPostSchema.safeParse({
      community_id: "30000000-0000-0000-0000-000000000001",
      title: "Long body test",
      post_type: "text",
      body: "x".repeat(40001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid post type", () => {
    const result = createPostSchema.safeParse({
      community_id: "30000000-0000-0000-0000-000000000001",
      title: "Bad type",
      post_type: "video",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid community_id format", () => {
    const result = createPostSchema.safeParse({
      community_id: "not-a-uuid",
      title: "Test",
      post_type: "text",
    });
    expect(result.success).toBe(false);
  });
});

describe("updatePostSchema", () => {
  it("accepts partial update with title only", () => {
    const result = updatePostSchema.safeParse({ title: "Updated Title" });
    expect(result.success).toBe(true);
  });

  it("accepts partial update with body only", () => {
    const result = updatePostSchema.safeParse({ body: "Updated body" });
    expect(result.success).toBe(true);
  });

  it("accepts null body (clearing body)", () => {
    const result = updatePostSchema.safeParse({ body: null });
    expect(result.success).toBe(true);
  });

  it("rejects title over 300 chars", () => {
    const result = updatePostSchema.safeParse({ title: "x".repeat(301) });
    expect(result.success).toBe(false);
  });
});

describe("listPostsSchema", () => {
  it("applies defaults", () => {
    const result = listPostsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sort).toBe("hot");
      expect(result.data.limit).toBe(25);
      expect(result.data.offset).toBe(0);
    }
  });

  it("accepts valid sort values", () => {
    for (const sort of ["hot", "new", "top", "rising", "controversial"]) {
      const result = listPostsSchema.safeParse({ sort });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid sort value", () => {
    const result = listPostsSchema.safeParse({ sort: "invalid" });
    expect(result.success).toBe(false);
  });

  it("coerces limit from string to number", () => {
    const result = listPostsSchema.safeParse({ limit: "50" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.limit).toBe(50);
  });

  it("rejects limit over 100", () => {
    const result = listPostsSchema.safeParse({ limit: "200" });
    expect(result.success).toBe(false);
  });
});

// ─── Comment Validation ──────────────────────────────────────

describe("createCommentSchema", () => {
  it("accepts a valid comment", () => {
    const result = createCommentSchema.safeParse({ body: "Great post!" });
    expect(result.success).toBe(true);
  });

  it("accepts a reply with parent_id", () => {
    const result = createCommentSchema.safeParse({
      body: "Reply text",
      parent_id: "50000000-0000-0000-0000-000000000001",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty body", () => {
    const result = createCommentSchema.safeParse({ body: "" });
    expect(result.success).toBe(false);
  });

  it("rejects body over 10,000 chars", () => {
    const result = createCommentSchema.safeParse({ body: "x".repeat(10001) });
    expect(result.success).toBe(false);
  });

  it("rejects invalid parent_id format", () => {
    const result = createCommentSchema.safeParse({
      body: "Test",
      parent_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateCommentSchema", () => {
  it("accepts valid body update", () => {
    const result = updateCommentSchema.safeParse({ body: "Updated comment" });
    expect(result.success).toBe(true);
  });

  it("rejects empty body", () => {
    const result = updateCommentSchema.safeParse({ body: "" });
    expect(result.success).toBe(false);
  });
});

// ─── Vote Validation ─────────────────────────────────────────

describe("voteSchema", () => {
  it("accepts spark (1)", () => {
    const result = voteSchema.safeParse({ value: 1 });
    expect(result.success).toBe(true);
  });

  it("accepts douse (-1)", () => {
    const result = voteSchema.safeParse({ value: -1 });
    expect(result.success).toBe(true);
  });

  it("rejects 0", () => {
    const result = voteSchema.safeParse({ value: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects 2", () => {
    const result = voteSchema.safeParse({ value: 2 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer", () => {
    const result = voteSchema.safeParse({ value: 1.5 });
    expect(result.success).toBe(false);
  });
});
