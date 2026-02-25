import { query, queryOne, queryAll } from "@/lib/db";
import { ServiceError } from "@/lib/services/posts.service";

// ─── Types ───────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  campfire_id: string;
  room_id: string | null;
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

export interface ChatRoom {
  id: string;
  campfire_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  position: number;
  created_by: string;
  created_at: string;
}

// ─── In-memory SSE subscriber registry ───────────────────────
// Keyed by "campfireId:roomId" for room-scoped streams

type Subscriber = (msg: ChatMessage) => void;
const subscribers = new Map<string, Set<Subscriber>>();

function subKey(campfireId: string, roomId: string): string {
  return `${campfireId}:${roomId}`;
}

export function subscribeToRoom(campfireId: string, roomId: string, cb: Subscriber): () => void {
  const key = subKey(campfireId, roomId);
  if (!subscribers.has(key)) {
    subscribers.set(key, new Set());
  }
  subscribers.get(key)!.add(cb);

  return () => {
    const subs = subscribers.get(key);
    if (subs) {
      subs.delete(cb);
      if (subs.size === 0) subscribers.delete(key);
    }
  };
}

// Legacy: subscribe to all rooms in a campfire (for backward compat)
export function subscribeToCampfire(campfireId: string, cb: Subscriber): () => void {
  const key = `campfire:${campfireId}`;
  if (!subscribers.has(key)) {
    subscribers.set(key, new Set());
  }
  subscribers.get(key)!.add(cb);

  return () => {
    const subs = subscribers.get(key);
    if (subs) {
      subs.delete(cb);
      if (subs.size === 0) subscribers.delete(key);
    }
  };
}

function notifySubscribers(campfireId: string, roomId: string | null, msg: ChatMessage): void {
  // Notify room-specific subscribers
  if (roomId) {
    const roomSubs = subscribers.get(subKey(campfireId, roomId));
    if (roomSubs) {
      for (const cb of Array.from(roomSubs)) {
        try { cb(msg); } catch { /* non-blocking */ }
      }
    }
  }

  // Notify campfire-wide subscribers (legacy)
  const campfireSubs = subscribers.get(`campfire:${campfireId}`);
  if (campfireSubs) {
    for (const cb of Array.from(campfireSubs)) {
      try { cb(msg); } catch { /* non-blocking */ }
    }
  }
}

// ─── Room Management ─────────────────────────────────────────

/** Get all rooms for a campfire */
export async function getRooms(campfireId: string): Promise<ChatRoom[]> {
  return queryAll<ChatRoom>(
    `SELECT * FROM chat_rooms
     WHERE campfire_id = $1 AND deleted_at IS NULL
     ORDER BY position ASC, created_at ASC`,
    [campfireId]
  );
}

/** Get or create the default room for a campfire */
export async function getOrCreateDefaultRoom(campfireId: string): Promise<ChatRoom> {
  // Try to find existing default
  const existing = await queryOne<ChatRoom>(
    `SELECT * FROM chat_rooms
     WHERE campfire_id = $1 AND is_default = TRUE AND deleted_at IS NULL`,
    [campfireId]
  );
  if (existing) return existing;

  // Create default #general room
  const room = await queryOne<ChatRoom>(
    `INSERT INTO chat_rooms (campfire_id, name, description, is_default, position, created_by)
     VALUES ($1, 'general', 'General chat', TRUE, 0, '00000000-0000-0000-0000-000000000001')
     ON CONFLICT (campfire_id, name) DO UPDATE SET is_default = TRUE
     RETURNING *`,
    [campfireId]
  );
  if (!room) throw new ServiceError("Failed to create default room", "INTERNAL_ERROR", 500);
  return room;
}

/** Create a new room in a campfire */
export async function createRoom(
  campfireId: string,
  creatorId: string,
  name: string,
  description?: string
): Promise<ChatRoom> {
  // Validate name
  const trimmedName = name.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-").slice(0, 64);
  if (trimmedName.length < 2) {
    throw new ServiceError("Room name must be at least 2 characters", "VALIDATION_ERROR", 400);
  }

  // Check room count limit (default 5 per campfire)
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM chat_rooms
     WHERE campfire_id = $1 AND deleted_at IS NULL`,
    [campfireId]
  );
  const roomCount = parseInt(countResult?.count ?? "0", 10);
  if (roomCount >= 10) {
    throw new ServiceError("Maximum rooms reached for this campfire", "ROOM_LIMIT", 400);
  }

  const room = await queryOne<ChatRoom>(
    `INSERT INTO chat_rooms (campfire_id, name, description, position, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [campfireId, trimmedName, description?.trim() || null, roomCount, creatorId]
  );

  if (!room) throw new ServiceError("Failed to create room", "INTERNAL_ERROR", 500);
  return room;
}

/** Delete a room (soft delete). Cannot delete default room. */
export async function deleteRoom(roomId: string, userId: string): Promise<void> {
  const room = await queryOne<ChatRoom>(
    `SELECT * FROM chat_rooms WHERE id = $1 AND deleted_at IS NULL`,
    [roomId]
  );
  if (!room) throw new ServiceError("Room not found", "ROOM_NOT_FOUND", 404);
  if (room.is_default) throw new ServiceError("Cannot delete the default room", "CANNOT_DELETE_DEFAULT", 400);

  // Only campfire creator can delete rooms
  const campfire = await queryOne<{ created_by: string }>(
    `SELECT created_by FROM campfires WHERE id = $1`,
    [room.campfire_id]
  );
  if (!campfire || campfire.created_by !== userId) {
    throw new ServiceError("Only the campfire creator can delete rooms", "FORBIDDEN", 403);
  }

  await query(`UPDATE chat_rooms SET deleted_at = NOW() WHERE id = $1`, [roomId]);
}

// ─── Send Message ────────────────────────────────────────────

export async function sendMessage(
  campfireId: string,
  authorId: string,
  body: string,
  roomId?: string
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

  // Resolve room: use provided roomId or get/create default
  let resolvedRoomId = roomId;
  if (!resolvedRoomId) {
    const defaultRoom = await getOrCreateDefaultRoom(campfireId);
    resolvedRoomId = defaultRoom.id;
  }

  // Insert message
  const msg = await queryOne<ChatMessage>(
    `INSERT INTO chat_messages (campfire_id, room_id, author_id, body)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [campfireId, resolvedRoomId, authorId, trimmed]
  );

  if (!msg) throw new ServiceError("Failed to send message", "INTERNAL_ERROR", 500);

  const enriched = { ...msg, author_username: user.username };

  // Notify SSE subscribers
  notifySubscribers(campfireId, resolvedRoomId, enriched);

  return enriched;
}

// ─── Get Recent Messages ─────────────────────────────────────

export async function getRecentMessages(
  campfireId: string,
  limit: number = 50,
  before?: string,
  roomId?: string
): Promise<ChatMessage[]> {
  const conditions = ["m.campfire_id = $1", "m.deleted_at IS NULL"];
  const params: unknown[] = [campfireId];
  let paramIdx = 2;

  if (roomId) {
    conditions.push(`m.room_id = $${paramIdx}`);
    params.push(roomId);
    paramIdx++;
  }

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
