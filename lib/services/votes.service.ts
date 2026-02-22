import { query, queryOne } from "@/lib/db";
import { ServiceError } from "@/lib/services/posts.service";
import { createNotification } from "@/lib/services/notifications.service";

// ─── Types ───────────────────────────────────────────────────

export interface Vote {
  id: string;
  user_id: string;
  votable_type: "post" | "comment";
  votable_id: string;
  vote_value: number;
  created_at: string;
  anonymized: boolean;
}

export interface VoteResult {
  vote: Vote | null;
  sparks: number;
  douses: number;
  action: "created" | "updated" | "removed";
}

// ─── Vote on Post ────────────────────────────────────────────

export async function voteOnPost(
  postId: string,
  userId: string,
  value: 1 | -1
): Promise<VoteResult> {
  // Verify post exists
  const post = await queryOne<{ id: string; sparks: number; douses: number; author_id: string; title: string; community_name: string }>(
    `SELECT p.id, p.sparks, p.douses, p.author_id, p.title,
            c.name AS community_name
     FROM posts p
     JOIN communities c ON c.id = p.community_id
     WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [postId]
  );
  if (!post) {
    throw new ServiceError("Post not found", "POST_NOT_FOUND", 404);
  }

  // Can't vote on own post
  if (post.author_id === userId) {
    throw new ServiceError("Cannot vote on your own post", "SELF_VOTE", 400);
  }

  const result = await castVote("post", postId, userId, value);

  // Send spark notification (only for sparks, not douses; only for new/switched votes)
  if (value === 1 && result.action !== "removed") {
    sendSparkNotification(post.author_id, userId, "post", postId, post.title, `/f/${post.community_name}/posts/${postId}`);
  }

  return result;
}

// ─── Vote on Comment ─────────────────────────────────────────

export async function voteOnComment(
  commentId: string,
  userId: string,
  value: 1 | -1
): Promise<VoteResult> {
  // Verify comment exists
  const comment = await queryOne<{ id: string; sparks: number; douses: number; author_id: string; post_id: string }>(
    `SELECT id, sparks, douses, author_id, post_id FROM comments WHERE id = $1 AND deleted_at IS NULL`,
    [commentId]
  );
  if (!comment) {
    throw new ServiceError("Comment not found", "COMMENT_NOT_FOUND", 404);
  }

  // Can't vote on own comment
  if (comment.author_id === userId) {
    throw new ServiceError("Cannot vote on your own comment", "SELF_VOTE", 400);
  }

  const result = await castVote("comment", commentId, userId, value);

  // Send spark notification (only for sparks, not douses; only for new/switched votes)
  if (value === 1 && result.action !== "removed") {
    const postInfo = await queryOne<{ title: string; community_name: string }>(
      `SELECT p.title, c.name AS community_name
       FROM posts p
       JOIN communities c ON c.id = p.community_id
       WHERE p.id = $1`,
      [comment.post_id]
    );
    if (postInfo) {
      sendSparkNotification(
        comment.author_id, userId, "comment", commentId,
        postInfo.title,
        `/f/${postInfo.community_name}/posts/${comment.post_id}#comment-${commentId}`
      );
    }
  }

  return result;
}

// ─── Core Vote Logic ─────────────────────────────────────────

async function castVote(
  votableType: "post" | "comment",
  votableId: string,
  userId: string,
  value: 1 | -1
): Promise<VoteResult> {
  const table = votableType === "post" ? "posts" : "comments";

  // Check for existing vote
  const existing = await queryOne<Vote>(
    `SELECT * FROM votes
     WHERE user_id = $1 AND votable_type = $2 AND votable_id = $3`,
    [userId, votableType, votableId]
  );

  if (existing) {
    if (existing.vote_value === value) {
      // Same vote — remove it (toggle off)
      await query(
        `DELETE FROM votes WHERE id = $1`,
        [existing.id]
      );

      // Reverse the vote counts
      if (value === 1) {
        await query(`UPDATE ${table} SET sparks = GREATEST(sparks - 1, 0) WHERE id = $1`, [votableId]);
      } else {
        await query(`UPDATE ${table} SET douses = GREATEST(douses - 1, 0) WHERE id = $1`, [votableId]);
      }

      // Update author spark score
      await updateAuthorSparks(votableType, votableId, value === 1 ? -1 : 1);

      const updated = await queryOne<{ sparks: number; douses: number }>(
        `SELECT sparks, douses FROM ${table} WHERE id = $1`,
        [votableId]
      );

      return {
        vote: null,
        sparks: updated?.sparks ?? 0,
        douses: updated?.douses ?? 0,
        action: "removed",
      };
    } else {
      // Different vote — switch it
      await query(
        `UPDATE votes SET vote_value = $1 WHERE id = $2`,
        [value, existing.id]
      );

      // Switch counts: remove old, add new
      if (value === 1) {
        // Switching from douse to spark
        await query(
          `UPDATE ${table} SET sparks = sparks + 1, douses = GREATEST(douses - 1, 0) WHERE id = $1`,
          [votableId]
        );
        await updateAuthorSparks(votableType, votableId, 2); // net +2 (remove douse + add spark)
      } else {
        // Switching from spark to douse
        await query(
          `UPDATE ${table} SET sparks = GREATEST(sparks - 1, 0), douses = douses + 1 WHERE id = $1`,
          [votableId]
        );
        await updateAuthorSparks(votableType, votableId, -2); // net -2 (remove spark + add douse)
      }

      const updatedVote = await queryOne<Vote>(
        `SELECT * FROM votes WHERE id = $1`,
        [existing.id]
      );

      const counts = await queryOne<{ sparks: number; douses: number }>(
        `SELECT sparks, douses FROM ${table} WHERE id = $1`,
        [votableId]
      );

      return {
        vote: updatedVote,
        sparks: counts?.sparks ?? 0,
        douses: counts?.douses ?? 0,
        action: "updated",
      };
    }
  }

  // New vote
  const newVote = await queryOne<Vote>(
    `INSERT INTO votes (user_id, votable_type, votable_id, vote_value)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, votableType, votableId, value]
  );

  // Increment the appropriate counter
  if (value === 1) {
    await query(`UPDATE ${table} SET sparks = sparks + 1 WHERE id = $1`, [votableId]);
  } else {
    await query(`UPDATE ${table} SET douses = douses + 1 WHERE id = $1`, [votableId]);
  }

  // Update author spark score
  await updateAuthorSparks(votableType, votableId, value);

  const counts = await queryOne<{ sparks: number; douses: number }>(
    `SELECT sparks, douses FROM ${table} WHERE id = $1`,
    [votableId]
  );

  return {
    vote: newVote,
    sparks: counts?.sparks ?? 0,
    douses: counts?.douses ?? 0,
    action: "created",
  };
}

// ─── Author Spark Score ──────────────────────────────────────

async function updateAuthorSparks(
  votableType: "post" | "comment",
  votableId: string,
  delta: number
): Promise<void> {
  const table = votableType === "post" ? "posts" : "comments";
  const sparkColumn = votableType === "post" ? "post_sparks" : "comment_sparks";

  const content = await queryOne<{ author_id: string }>(
    `SELECT author_id FROM ${table} WHERE id = $1`,
    [votableId]
  );
  if (!content) return;

  await query(
    `UPDATE users SET ${sparkColumn} = GREATEST(${sparkColumn} + $1, 0) WHERE id = $2`,
    [delta, content.author_id]
  );
}

// ─── Spark Notification Helper ────────────────────────────────

function sendSparkNotification(
  authorId: string,
  sparkerId: string,
  contentType: "post" | "comment",
  contentId: string,
  contentTitle: string,
  actionUrl: string
): void {
  // Look up sparker username, then fire notification (non-blocking)
  queryOne<{ username: string }>(
    `SELECT username FROM users WHERE id = $1`,
    [sparkerId]
  ).then((sparker) => {
    const sparkerName = sparker?.username ?? "Someone";
    return createNotification({
      userId: authorId,
      type: "spark",
      title: `${sparkerName} sparked your ${contentType} '${contentTitle}'`,
      body: `${sparkerName} sparked your ${contentType}`,
      actionUrl,
      content: {
        content_type: contentType,
        content_id: contentId,
        content_title: contentTitle,
        spark_count: 1,
        latest_sparker: sparkerName,
      },
    });
  }).catch(() => {}); // Non-blocking
}

// ─── Get User's Vote ─────────────────────────────────────────

export async function getUserVote(
  userId: string,
  votableType: "post" | "comment",
  votableId: string
): Promise<Vote | null> {
  return queryOne<Vote>(
    `SELECT * FROM votes
     WHERE user_id = $1 AND votable_type = $2 AND votable_id = $3`,
    [userId, votableType, votableId]
  );
}
