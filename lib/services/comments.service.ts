import { query, queryOne, queryAll } from "@/lib/db";
import type { CreateCommentInput, UpdateCommentInput } from "@/lib/validation/comments";
import { moderateContent, logModerationDecision, type ModerationDecision } from "@/lib/moderation/moderate";
import { ServiceError } from "@/lib/services/posts.service";
import { createNotification } from "@/lib/services/notifications.service";

// ─── Types ───────────────────────────────────────────────────

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  depth: number;
  sparks: number;
  douses: number;
  is_approved: boolean;
  is_removed: boolean;
  removal_reason: string | null;
  deleted_at: string | null;
  author_username?: string;
  children?: Comment[];
}

export interface CommentWithModeration extends Comment {
  moderation: ModerationDecision;
}

const MAX_COMMENT_DEPTH = 10;

// ─── Create ──────────────────────────────────────────────────

export async function createComment(
  postId: string,
  input: CreateCommentInput,
  authorId: string
): Promise<CommentWithModeration> {
  // Verify post exists and is not deleted
  const post = await queryOne<{
    id: string; community_id: string; is_removed: boolean;
    author_id: string; title: string; community_name: string;
  }>(
    `SELECT p.id, p.community_id, p.is_removed, p.author_id, p.title,
            c.name AS community_name
     FROM posts p
     JOIN communities c ON c.id = p.community_id
     WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [postId]
  );
  if (!post) {
    throw new ServiceError("Post not found", "POST_NOT_FOUND", 404);
  }
  if (post.is_removed) {
    throw new ServiceError("Cannot comment on a removed post", "POST_REMOVED", 403);
  }

  // Verify user is not banned
  const user = await queryOne<{ id: string; is_banned: boolean; username: string }>(
    `SELECT id, is_banned, username FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [authorId]
  );
  if (!user) {
    throw new ServiceError("User not found", "USER_NOT_FOUND", 404);
  }
  if (user.is_banned) {
    throw new ServiceError("User is banned", "USER_BANNED", 403);
  }

  // If replying to a parent comment, verify it exists and check depth
  let depth = 0;
  if (input.parent_id) {
    const parent = await queryOne<{ id: string; post_id: string; depth: number; deleted_at: string | null }>(
      `SELECT id, post_id, depth, deleted_at FROM comments WHERE id = $1`,
      [input.parent_id]
    );
    if (!parent) {
      throw new ServiceError("Parent comment not found", "PARENT_NOT_FOUND", 404);
    }
    if (parent.post_id !== postId) {
      throw new ServiceError("Parent comment belongs to a different post", "INVALID_PARENT", 400);
    }
    depth = parent.depth + 1;
    if (depth >= MAX_COMMENT_DEPTH) {
      throw new ServiceError(
        `Maximum comment depth of ${MAX_COMMENT_DEPTH} reached`,
        "MAX_DEPTH_REACHED",
        400
      );
    }
  }

  // Run AI moderation
  const moderation = await moderateContent({
    content_type: "comment",
    body: input.body,
    community_id: post.community_id,
    author_id: authorId,
  });

  const isApproved = moderation.decision === "approved";
  const isRemoved = moderation.decision === "removed";

  const comment = await queryOne<Comment>(
    `INSERT INTO comments
     (post_id, author_id, parent_id, body, depth,
      is_approved, is_removed, removal_reason, moderated_at, moderated_by_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
     RETURNING *`,
    [
      postId,
      authorId,
      input.parent_id ?? null,
      input.body,
      depth,
      isApproved,
      isRemoved,
      isRemoved ? moderation.reasoning : null,
      moderation.agent_level,
    ]
  );

  if (!comment) {
    throw new ServiceError("Failed to create comment", "INTERNAL_ERROR", 500);
  }

  // Increment post comment count
  await query(
    `UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1`,
    [postId]
  );

  // Log moderation decision
  await logModerationDecision(
    "comment",
    comment.id,
    post.community_id,
    authorId,
    moderation,
    { query: async (text: string, params?: unknown[]) => query(text, params) }
  );

  // ─── Notification triggers (fire-and-forget, don't block response) ───
  if (isApproved) {
    const commentPreview = input.body.slice(0, 100);
    const actionUrl = `/f/${post.community_name}/posts/${postId}#comment-${comment.id}`;

    if (input.parent_id) {
      // Reply to comment → notify parent comment author
      const parentComment = await queryOne<{ author_id: string }>(
        `SELECT author_id FROM comments WHERE id = $1`,
        [input.parent_id]
      );
      if (parentComment && parentComment.author_id !== authorId) {
        createNotification({
          userId: parentComment.author_id,
          type: "reply_comment",
          title: `${user.username} replied to your comment`,
          body: `${user.username} replied to your comment on '${post.title}'`,
          actionUrl,
          content: {
            post_id: postId,
            post_title: post.title,
            parent_comment_id: input.parent_id,
            reply_comment_id: comment.id,
            replier_username: user.username,
            reply_preview: commentPreview,
          },
        }).catch(() => {}); // Non-blocking
      }
    }

    // Comment on post → notify post author (unless self-comment)
    if (post.author_id !== authorId) {
      createNotification({
        userId: post.author_id,
        type: "reply_post",
        title: `${user.username} commented on your post`,
        body: `${user.username} commented on '${post.title}'`,
        actionUrl,
        content: {
          post_id: postId,
          post_title: post.title,
          comment_id: comment.id,
          commenter_username: user.username,
          comment_preview: commentPreview,
        },
      }).catch(() => {}); // Non-blocking
    }
  }

  return { ...comment, moderation };
}

// ─── Read (threaded) ─────────────────────────────────────────

export async function getCommentsForPost(
  postId: string,
  sort: "top" | "new" | "controversial" = "top"
): Promise<Comment[]> {
  let orderBy: string;
  switch (sort) {
    case "new":
      orderBy = "c.created_at DESC";
      break;
    case "controversial":
      orderBy = `CASE WHEN (c.sparks + c.douses) = 0 THEN 0
        ELSE (c.sparks + c.douses)::float *
          (1.0 - ABS(c.sparks - c.douses)::float / (c.sparks + c.douses)::float) END DESC,
        c.created_at DESC`;
      break;
    case "top":
    default:
      orderBy = "(c.sparks - c.douses) DESC, c.created_at ASC";
      break;
  }

  const rows = await queryAll<Comment>(
    `SELECT c.*, u.username AS author_username
     FROM comments c
     JOIN users u ON u.id = c.author_id
     WHERE c.post_id = $1 AND c.deleted_at IS NULL
     ORDER BY ${orderBy}`,
    [postId]
  );

  return buildCommentTree(rows);
}

/**
 * Build a nested comment tree from flat rows.
 * Preserves thread structure even when parent comments are soft-deleted.
 */
function buildCommentTree(flatComments: Comment[]): Comment[] {
  const map = new Map<string, Comment>();
  const roots: Comment[] = [];

  // First pass: create map entries with empty children
  for (const comment of flatComments) {
    map.set(comment.id, { ...comment, children: [] });
  }

  // Second pass: build tree
  for (const comment of flatComments) {
    const node = map.get(comment.id)!;
    if (comment.parent_id && map.has(comment.parent_id)) {
      map.get(comment.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// ─── Update ──────────────────────────────────────────────────

export async function updateComment(
  commentId: string,
  authorId: string,
  input: UpdateCommentInput,
  isAdmin: boolean = false
): Promise<Comment> {
  const existing = await queryOne<Comment & { community_id: string }>(
    `SELECT c.*, p.community_id
     FROM comments c
     JOIN posts p ON p.id = c.post_id
     WHERE c.id = $1 AND c.deleted_at IS NULL`,
    [commentId]
  );
  if (!existing) {
    throw new ServiceError("Comment not found", "COMMENT_NOT_FOUND", 404);
  }
  if (existing.author_id !== authorId && !isAdmin) {
    throw new ServiceError("Not authorized to edit this comment", "FORBIDDEN", 403);
  }

  // Re-run moderation
  const moderation = await moderateContent({
    content_type: "comment",
    body: input.body,
    community_id: existing.community_id,
    author_id: authorId,
  });

  const updated = await queryOne<Comment>(
    `UPDATE comments
     SET body = $1,
         edited_at = NOW(),
         is_approved = $2,
         is_removed = $3,
         removal_reason = $4,
         moderated_at = NOW(),
         moderated_by_agent = $5
     WHERE id = $6
     RETURNING *`,
    [
      input.body,
      moderation.decision === "approved",
      moderation.decision === "removed",
      moderation.decision === "removed" ? moderation.reasoning : null,
      moderation.agent_level,
      commentId,
    ]
  );

  if (!updated) {
    throw new ServiceError("Failed to update comment", "INTERNAL_ERROR", 500);
  }

  // Log moderation decision for the edit
  await logModerationDecision(
    "comment",
    commentId,
    existing.community_id,
    authorId,
    moderation,
    { query: async (text: string, params?: unknown[]) => query(text, params) }
  );

  return updated;
}

// ─── Delete (soft) ───────────────────────────────────────────

export async function deleteComment(
  commentId: string,
  userId: string,
  isAdmin: boolean = false
): Promise<void> {
  const existing = await queryOne<Comment>(
    `SELECT * FROM comments WHERE id = $1 AND deleted_at IS NULL`,
    [commentId]
  );
  if (!existing) {
    throw new ServiceError("Comment not found", "COMMENT_NOT_FOUND", 404);
  }
  if (existing.author_id !== userId && !isAdmin) {
    throw new ServiceError("Not authorized to delete this comment", "FORBIDDEN", 403);
  }

  // Soft delete — preserves thread structure
  await query(
    `UPDATE comments SET deleted_at = NOW() WHERE id = $1`,
    [commentId]
  );

  // Decrement post comment count
  await query(
    `UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = $1`,
    [existing.post_id]
  );
}
