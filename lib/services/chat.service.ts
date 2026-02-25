import { query, queryOne, queryAll } from "@/lib/db";
import { ServiceError } from "@/lib/services/posts.service";

// ─── Types ───────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  campfire_id: string;
  author_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  is_approved: boolean;
  is_removed: boolean;
  removal_reason: string | null;
  author_username?: string;
}

// ─── In-memory SSE subscriber registry ───────────────────────

type Subscriber = (msg: ChatMessage) => void;
const subscribers = new Map<string, Set<Subscriber>>();

export function subscribeToCampfire(campfireId: string, cb: Subscriber): () => void {
  if (!subscribers.has(campfireId)) {
    subscribers.set(campfireId, new Set());
  }
  subscribers.get(campfireId)!.add(cb);

  return () => {
    const subs = subscribers.get(campfireId);
    if (subs) {
      subs.delete(cb);
      if (subs.size === 0) subscribers.delete(campfireId);
    }
  };
}

function notifySubscribers(campfireId: string, msg: ChatMessage): void {
  const subs = subscribers.get(campfireId);
  if (subs) {
    for (const cb of Array.from(subs)) {
      try { cb(msg); } catch { /* non-blocking */ }
    }
  }
}

// ─── Send Message ────────────────────────────────────────────

export async function sendMessage(
  campfireId: string,
  authorId: string,
  body: string
): Promise<ChatMessage> {
  // Verify campfire exists
  const campfire = await queryOne<{ id: string; is_banned: boolean }>(
    `SELECT id, is_banned FROM campfires WHERE id = $1 AND deleted_at IS NULL`,
    [campfireId]
  );
  if (!campfire) throw new ServiceError("Campfire not found", "CAMPFIRE_NOT_FOUND", 404);
  if (campfire.is_banned) throw new ServiceError("Campfire is banned", "CAMPFIRE_BANNED", 403);

  // Verify user exists and is not banned
  const user = await queryOne<{ id: string; username: string; is_banned: boolean }>(
    `SELECT id, username, is_banned FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [authorId]
  );
  if (!user) throw new ServiceError("User not found", "USER_NOT_FOUND", 404);
  if (user.is_banned) throw new ServiceError("User is banned", "USER_BANNED", 403);

  // Validate body
  const trimmed = body.trim();
  if (trimmed.length === 0) throw new ServiceError("Message cannot be empty", "EMPTY_MESSAGE", 400);
  if (trimmed.length > 2000) throw new ServiceError("Message too long (max 2000 chars)", "MESSAGE_TOO_LONG", 400);

  // Insert message
  const msg = await queryOne<ChatMessage>(
    `INSERT INTO chat_messages (campfire_id, author_id, body)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [campfireId, authorId, trimmed]
  );

  if (!msg) throw new ServiceError("Failed to send message", "INTERNAL_ERROR", 500);

  const enriched = { ...msg, author_username: user.username };

  // Notify SSE subscribers
  notifySubscribers(campfireId, enriched);

  return enriched;
}

// ─── Get Recent Messages ─────────────────────────────────────

export async function getRecentMessages(
  campfireId: string,
  limit: number = 50,
  before?: string
): Promise<ChatMessage[]> {
  const conditions = ["m.campfire_id = $1", "m.deleted_at IS NULL"];
  const params: unknown[] = [campfireId];
  let paramIdx = 2;

  if (before) {
    conditions.push(`m.created_at < $${paramIdx}`);
    params.push(before);
    paramIdx++;
  }

  params.push(limit);

  const messages = await queryAll<ChatMessage>(
    `SELECT m.*, u.username AS author_username
     FROM chat_messages m
     JOIN users u ON u.id = m.author_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY m.created_at DESC
     LIMIT $${paramIdx}`,
    params
  );

  // Return in chronological order
  return messages.reverse();
}

// ─── Delete Message (soft) ───────────────────────────────────

export async function deleteMessage(
  messageId: string,
  userId: string,
  isAdmin: boolean = false
): Promise<void> {
  const msg = await queryOne<ChatMessage>(
    `SELECT * FROM chat_messages WHERE id = $1 AND deleted_at IS NULL`,
    [messageId]
  );
  if (!msg) throw new ServiceError("Message not found", "MESSAGE_NOT_FOUND", 404);
  if (msg.author_id !== userId && !isAdmin) {
    throw new ServiceError("Not authorized", "FORBIDDEN", 403);
  }

  await query(`UPDATE chat_messages SET deleted_at = NOW() WHERE id = $1`, [messageId]);
}
