/**
 * Adapters that convert API/DB response shapes into the UI component shapes.
 * Keeps backend snake_case → frontend camelCase conversion in one place.
 */

import type { Post as ApiPost, Comment as ApiComment } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// PostCard shape (what the UI components expect)
// ---------------------------------------------------------------------------

export interface PostCardData {
  id: string;
  title: string;
  body?: string;
  author: string;
  campfire: string;
  campfireId: string;
  sparkCount: number;
  commentCount: number;
  createdAt: string;
  post_type?: "text" | "link" | "image";
  image_url?: string;
  link_url?: string;
  moderation?: {
    action: "approved" | "flagged" | "removed";
    confidence?: number;
  };
}

export interface CommentCardData {
  id: string;
  postId: string;
  parentId: string | null;
  author: string;
  body: string;
  sparkCount: number;
  createdAt: string;
  moderation?: {
    action: "approved" | "flagged" | "removed";
  };
  replies: CommentCardData[];
}

// ---------------------------------------------------------------------------
// Post adapter
// ---------------------------------------------------------------------------

export function toPostCardData(post: ApiPost): PostCardData {
  // Map moderation state to the UI shape.
  // DB uses is_approved/is_removed booleans; client type also has moderation_status.
  let moderation: PostCardData["moderation"] = undefined;
  if (post.is_removed) {
    moderation = { action: "removed" };
  } else if (post.is_approved === false && !post.is_removed) {
    moderation = { action: "flagged" };
  } else if (post.is_approved) {
    moderation = { action: "approved" };
  } else if (post.moderation_status) {
    moderation = {
      action: post.moderation_status === "pending" ? "approved" : post.moderation_status,
    };
  }

  return {
    id: post.id,
    title: post.title,
    body: post.body || undefined,
    author: post.author_username ?? "anonymous",
    campfire: post.campfire_name ?? "",
    campfireId: post.campfire_id,
    sparkCount: (post.sparks ?? post.spark_count ?? 0) - (post.douses ?? post.douse_count ?? 0),
    commentCount: post.comment_count ?? 0,
    createdAt: post.created_at,
    post_type: post.post_type ?? "text",
    image_url: post.image_url ?? undefined,
    link_url: post.url ?? undefined,
    moderation,
  };
}

// ---------------------------------------------------------------------------
// Comment adapter
// ---------------------------------------------------------------------------

export function toCommentCardData(comment: ApiComment): CommentCardData {
  // Handle both DB booleans and client enum for moderation
  let moderation: CommentCardData["moderation"] = undefined;
  if (comment.is_removed) {
    moderation = { action: "removed" };
  } else if (comment.is_approved === false && !comment.is_removed) {
    moderation = { action: "flagged" };
  } else if (comment.is_approved) {
    moderation = { action: "approved" };
  } else if (comment.moderation_status) {
    moderation = {
      action: comment.moderation_status === "pending" ? "approved" : comment.moderation_status,
    };
  }

  return {
    id: comment.id,
    postId: comment.post_id,
    parentId: comment.parent_id,
    author: comment.author_username ?? "anonymous",
    body: comment.body,
    sparkCount: (comment.sparks ?? comment.spark_count ?? 0) - (comment.douses ?? comment.douse_count ?? 0),
    createdAt: comment.created_at,
    moderation,
    replies: (comment.children ?? comment.replies ?? []).map(toCommentCardData),
  };
}

// ---------------------------------------------------------------------------
// Flatten a nested comment tree into a list (for rendering)
// ---------------------------------------------------------------------------

/**
 * Shape expected by CommentCard component (flat list with depth).
 */
export interface CommentDisplayData {
  id: string;
  parentId: string | null;
  body: string;
  author: string;
  sparkCount: number;
  replyCount: number;
  totalDescendants: number;
  createdAt: string;
  depth: number;
  moderation?: {
    action: "approved" | "flagged" | "removed";
    confidence?: number;
  };
}

/**
 * Flatten a threaded comment tree into a depth-annotated list for rendering.
 */
export function flattenCommentsForDisplay(
  comments: ApiComment[],
): CommentDisplayData[] {
  const tree = buildCommentTree(comments);
  const result: CommentDisplayData[] = [];

  function countDescendants(node: CommentCardData): number {
    let count = 0;
    for (const r of node.replies) {
      count += 1 + countDescendants(r);
    }
    return count;
  }

  function walk(nodes: CommentCardData[], depth: number, parentId: string | null) {
    for (const node of nodes) {
      result.push({
        id: node.id,
        parentId,
        body: node.body,
        author: node.author,
        sparkCount: node.sparkCount,
        replyCount: node.replies.length,
        totalDescendants: countDescendants(node),
        createdAt: node.createdAt,
        depth,
        moderation: node.moderation,
      });
      if (node.replies.length > 0) {
        walk(node.replies, depth + 1, node.id);
      }
    }
  }

  walk(tree, 0, null);
  return result;
}

export function flattenCommentTree(comments: CommentCardData[]): CommentCardData[] {
  const result: CommentCardData[] = [];

  function walk(list: CommentCardData[]) {
    for (const c of list) {
      result.push(c);
      if (c.replies.length > 0) {
        walk(c.replies);
      }
    }
  }

  walk(comments);
  return result;
}

// ---------------------------------------------------------------------------
// Build threaded comment tree from flat list
// ---------------------------------------------------------------------------

export function buildCommentTree(comments: ApiComment[]): CommentCardData[] {
  const map = new Map<string, CommentCardData>();
  const roots: CommentCardData[] = [];

  // First pass: convert all to CommentCardData
  for (const c of comments) {
    map.set(c.id, { ...toCommentCardData(c), replies: [] });
  }

  // Second pass: link children to parents
  for (const c of comments) {
    const card = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.replies.push(card);
    } else {
      roots.push(card);
    }
  }

  return roots;
}
