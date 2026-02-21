import { query, queryOne, queryAll } from "@/lib/db";
import type { CreatePostInput, UpdatePostInput, ListPostsInput } from "@/lib/validation/posts";
import { moderateContent, logModerationDecision, type ModerationDecision } from "@/lib/moderation/moderate";

// ─── Types ───────────────────────────────────────────────────

export interface Post {
  id: string;
  community_id: string;
  author_id: string;
  title: string;
  body: string | null;
  post_type: string;
  url: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  sparks: number;
  douses: number;
  comment_count: number;
  is_approved: boolean;
  is_removed: boolean;
  removal_reason: string | null;
  deleted_at: string | null;
  author_username?: string;
  community_name?: string;
}

export interface PostWithModeration extends Post {
  moderation: ModerationDecision;
}

export interface EditHistoryEntry {
  title: string;
  body: string | null;
  edited_at: string;
}

// ─── Create ──────────────────────────────────────────────────

export async function createPost(
  input: CreatePostInput,
  authorId: string
): Promise<PostWithModeration> {
  // Verify community exists and is not banned/deleted
  const community = await queryOne<{ id: string; name: string }>(
    `SELECT id, name FROM communities
     WHERE id = $1 AND deleted_at IS NULL AND is_banned = FALSE`,
    [input.community_id]
  );
  if (!community) {
    throw new ServiceError("Community not found", "COMMUNITY_NOT_FOUND", 404);
  }

  // Verify user is not banned
  const user = await queryOne<{ id: string; is_banned: boolean }>(
    `SELECT id, is_banned FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [authorId]
  );
  if (!user) {
    throw new ServiceError("User not found", "USER_NOT_FOUND", 404);
  }
  if (user.is_banned) {
    throw new ServiceError("User is banned", "USER_BANNED", 403);
  }

  // Run AI moderation
  const moderation = await moderateContent({
    content_type: "post",
    title: input.title,
    body: input.body ?? "",
    community_id: input.community_id,
    author_id: authorId,
  });

  const isApproved = moderation.decision === "approved";
  const isRemoved = moderation.decision === "removed";

  // Insert the post
  const post = await queryOne<Post>(
    `INSERT INTO posts
     (community_id, author_id, title, body, post_type, url, image_url,
      is_approved, is_removed, removal_reason, moderated_at, moderated_by_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)
     RETURNING *`,
    [
      input.community_id,
      authorId,
      input.title,
      input.body ?? null,
      input.post_type,
      input.url ?? null,
      input.image_url ?? null,
      isApproved,
      isRemoved,
      isRemoved ? moderation.reasoning : null,
      moderation.agent_level,
    ]
  );

  if (!post) {
    throw new ServiceError("Failed to create post", "INTERNAL_ERROR", 500);
  }

  // Log moderation decision
  await logModerationDecision(
    "post",
    post.id,
    input.community_id,
    authorId,
    moderation,
    { query: async (text: string, params?: unknown[]) => query(text, params) }
  );

  // Increment community post count
  await query(
    `UPDATE communities SET post_count = post_count + 1 WHERE id = $1`,
    [input.community_id]
  );

  return { ...post, moderation };
}

// ─── Read ────────────────────────────────────────────────────

export async function getPostById(postId: string): Promise<Post | null> {
  return queryOne<Post>(
    `SELECT p.*,
            u.username AS author_username,
            c.name AS community_name
     FROM posts p
     JOIN users u ON u.id = p.author_id
     JOIN communities c ON c.id = p.community_id
     WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [postId]
  );
}

export async function listPosts(input: ListPostsInput): Promise<Post[]> {
  const conditions: string[] = ["p.deleted_at IS NULL", "p.is_approved = TRUE", "p.is_removed = FALSE"];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (input.community) {
    conditions.push(`c.name = $${paramIdx}`);
    params.push(input.community);
    paramIdx++;
  }

  const whereClause = conditions.join(" AND ");

  let orderBy: string;
  switch (input.sort) {
    case "new":
      orderBy = "p.created_at DESC";
      break;
    case "top":
      orderBy = "(p.sparks - p.douses) DESC, p.created_at DESC";
      break;
    case "rising":
      // Rising: high vote rate in recent time window
      orderBy = `(p.sparks - p.douses)::float /
        GREATEST(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600, 0.1) DESC`;
      break;
    case "controversial":
      // Controversial: many votes but close to even split
      orderBy = `CASE WHEN (p.sparks + p.douses) = 0 THEN 0
        ELSE (p.sparks + p.douses)::float *
          (1.0 - ABS(p.sparks - p.douses)::float / (p.sparks + p.douses)::float) END DESC,
        p.created_at DESC`;
      break;
    case "hot":
    default:
      // Hot: (sparks - douses) / (hours_old + 2)^1.5
      orderBy = `(p.sparks - p.douses)::float /
        POWER(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 + 2, 1.5) DESC`;
      break;
  }

  const sql = `
    SELECT p.*,
           u.username AS author_username,
           c.name AS community_name
    FROM posts p
    JOIN users u ON u.id = p.author_id
    JOIN communities c ON c.id = p.community_id
    WHERE ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;
  params.push(input.limit, input.offset);

  return queryAll<Post>(sql, params);
}

// ─── Update ──────────────────────────────────────────────────

export async function updatePost(
  postId: string,
  authorId: string,
  input: UpdatePostInput,
  isAdmin: boolean = false
): Promise<Post> {
  // Verify post exists and belongs to author (or is admin)
  const existing = await queryOne<Post>(
    `SELECT * FROM posts WHERE id = $1 AND deleted_at IS NULL`,
    [postId]
  );
  if (!existing) {
    throw new ServiceError("Post not found", "POST_NOT_FOUND", 404);
  }
  if (existing.author_id !== authorId && !isAdmin) {
    throw new ServiceError("Not authorized to edit this post", "FORBIDDEN", 403);
  }

  // Store edit history as JSONB in a separate approach:
  // We use the posts table's edited_at + store old values
  // For V1, we store edit history inline via a JSON column approach
  // But the schema doesn't have an edit_history column, so we track via moderation_log

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (input.title !== undefined) {
    updates.push(`title = $${paramIdx}`);
    params.push(input.title);
    paramIdx++;
  }
  if (input.body !== undefined) {
    updates.push(`body = $${paramIdx}`);
    params.push(input.body);
    paramIdx++;
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push(`edited_at = NOW()`);

  // Re-run moderation on edited content
  const newTitle = input.title ?? existing.title;
  const newBody = input.body ?? existing.body ?? "";

  const moderation = await moderateContent({
    content_type: "post",
    title: newTitle,
    body: newBody,
    community_id: existing.community_id,
    author_id: authorId,
  });

  updates.push(`is_approved = $${paramIdx}`);
  params.push(moderation.decision === "approved");
  paramIdx++;

  updates.push(`is_removed = $${paramIdx}`);
  params.push(moderation.decision === "removed");
  paramIdx++;

  if (moderation.decision === "removed") {
    updates.push(`removal_reason = $${paramIdx}`);
    params.push(moderation.reasoning);
    paramIdx++;
  }

  updates.push(`moderated_at = NOW()`);
  updates.push(`moderated_by_agent = $${paramIdx}`);
  params.push(moderation.agent_level);
  paramIdx++;

  params.push(postId);

  const updated = await queryOne<Post>(
    `UPDATE posts SET ${updates.join(", ")} WHERE id = $${paramIdx} RETURNING *`,
    params
  );

  if (!updated) {
    throw new ServiceError("Failed to update post", "INTERNAL_ERROR", 500);
  }

  // Log moderation decision for the edit
  await logModerationDecision(
    "post",
    postId,
    existing.community_id,
    authorId,
    moderation,
    { query: async (text: string, p?: unknown[]) => query(text, p) }
  );

  return updated;
}

// ─── Delete (soft) ───────────────────────────────────────────

export async function deletePost(
  postId: string,
  userId: string,
  isAdmin: boolean = false
): Promise<void> {
  const existing = await queryOne<Post>(
    `SELECT * FROM posts WHERE id = $1 AND deleted_at IS NULL`,
    [postId]
  );
  if (!existing) {
    throw new ServiceError("Post not found", "POST_NOT_FOUND", 404);
  }
  if (existing.author_id !== userId && !isAdmin) {
    throw new ServiceError("Not authorized to delete this post", "FORBIDDEN", 403);
  }

  await query(
    `UPDATE posts SET deleted_at = NOW() WHERE id = $1`,
    [postId]
  );

  // Decrement community post count
  await query(
    `UPDATE communities SET post_count = GREATEST(post_count - 1, 0) WHERE id = $1`,
    [existing.community_id]
  );
}

// ─── Service Error ───────────────────────────────────────────

export class ServiceError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.status = status;
  }
}
