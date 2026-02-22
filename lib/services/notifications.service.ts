import { query, queryOne, queryAll } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { ServiceError } from "@/lib/services/posts.service";
import { sendPushToUser } from "@/lib/services/push-notifications";

// ─── Types ───────────────────────────────────────────────────

export type NotificationType =
  | "reply_post"
  | "reply_comment"
  | "spark"
  | "mention"
  | "community_update"
  | "governance"
  | "badge_earned"
  | "tip_received"
  | "referral";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  action_url: string | null;
  content: Record<string, unknown>;
  read: boolean;
  read_at: string | null;
  push_sent: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  reply_post: boolean;
  reply_comment: boolean;
  spark: boolean;
  mention: boolean;
  community_update: boolean;
  governance: boolean;
  badge_earned: boolean;
  tip_received: boolean;
  referral: boolean;
  push_enabled: boolean;
  push_reply_post: boolean;
  push_reply_comment: boolean;
  push_spark: boolean;
  push_mention: boolean;
  push_governance: boolean;
  push_badge_earned: boolean;
  push_referral: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  reply_post: true,
  reply_comment: true,
  spark: true,
  mention: true,
  community_update: true,
  governance: true,
  badge_earned: true,
  tip_received: true,
  referral: true,
  push_enabled: false,
  push_reply_post: true,
  push_reply_comment: true,
  push_spark: false,
  push_mention: true,
  push_governance: false,
  push_badge_earned: true,
  push_referral: true,
};

// ─── Feature Flag Guard ─────────────────────────────────────

function ensureEnabled(): void {
  if (!isFeatureEnabled("ENABLE_NOTIFICATIONS")) {
    throw new ServiceError("Notifications are not enabled", "FEATURE_DISABLED", 403);
  }
}

// ─── Preferences ─────────────────────────────────────────────

export async function getPreferences(userId: string): Promise<NotificationPreferences> {
  ensureEnabled();
  const user = await queryOne<{ notification_preferences: NotificationPreferences }>(
    `SELECT notification_preferences FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  if (!user) {
    throw new ServiceError("User not found", "USER_NOT_FOUND", 404);
  }
  return { ...DEFAULT_PREFERENCES, ...user.notification_preferences };
}

export async function updatePreferences(
  userId: string,
  updates: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  ensureEnabled();
  const current = await getPreferences(userId);
  const merged = { ...current, ...updates };

  // Only keep valid keys
  const clean: NotificationPreferences = { ...DEFAULT_PREFERENCES };
  for (const key of Object.keys(DEFAULT_PREFERENCES) as (keyof NotificationPreferences)[]) {
    if (typeof merged[key] === "boolean") {
      (clean[key] as boolean) = merged[key];
    }
  }

  await query(
    `UPDATE users SET notification_preferences = $1 WHERE id = $2`,
    [JSON.stringify(clean), userId]
  );

  return clean;
}

// ─── List Notifications ──────────────────────────────────────

export interface ListNotificationsInput {
  page: number;
  limit: number;
  type?: NotificationType;
}

export interface ListNotificationsResult {
  notifications: Notification[];
  unread_count: number;
  total: number;
  page: number;
  limit: number;
}

export async function listNotifications(
  userId: string,
  input: ListNotificationsInput
): Promise<ListNotificationsResult> {
  if (!isFeatureEnabled("ENABLE_NOTIFICATIONS")) {
    return { notifications: [], unread_count: 0, total: 0, page: input.page, limit: input.limit };
  }
  const offset = (input.page - 1) * input.limit;

  let whereClause = `WHERE user_id = $1`;
  const params: unknown[] = [userId];
  let paramIdx = 2;

  if (input.type) {
    whereClause += ` AND type = $${paramIdx}`;
    params.push(input.type);
    paramIdx++;
  }

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM notifications ${whereClause}`,
    params
  );

  const unreadResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = FALSE`,
    [userId]
  );

  const notifications = await queryAll<Notification>(
    `SELECT * FROM notifications ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, input.limit, offset]
  );

  return {
    notifications,
    unread_count: parseInt(unreadResult?.count ?? "0", 10),
    total: parseInt(countResult?.count ?? "0", 10),
    page: input.page,
    limit: input.limit,
  };
}

// ─── Mark as Read ────────────────────────────────────────────

export async function markAsRead(notificationId: string, userId: string): Promise<Notification> {
  ensureEnabled();
  const notification = await queryOne<Notification>(
    `UPDATE notifications
     SET read = TRUE, read_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [notificationId, userId]
  );
  if (!notification) {
    throw new ServiceError("Notification not found", "NOTIFICATION_NOT_FOUND", 404);
  }
  return notification;
}

export async function markAllAsRead(userId: string): Promise<number> {
  ensureEnabled();

  // Count unread first (PGlite doesn't always return rowCount)
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = FALSE`,
    [userId]
  );
  const unreadCount = parseInt(countResult?.count ?? "0", 10);

  if (unreadCount > 0) {
    await query(
      `UPDATE notifications
       SET read = TRUE, read_at = NOW()
       WHERE user_id = $1 AND read = FALSE`,
      [userId]
    );
  }

  return unreadCount;
}

// ─── Create Notification ─────────────────────────────────────

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string;
  content?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput): Promise<Notification | null> {
  if (!isFeatureEnabled("ENABLE_NOTIFICATIONS")) {
    return null;
  }

  // Check user preferences
  const prefs = await getPreferencesInternal(input.userId);
  const typeKey = input.type as keyof NotificationPreferences;
  if (prefs[typeKey] === false) {
    return null; // User disabled this notification type
  }

  // Handle spark batching
  if (input.type === "spark" && input.content) {
    const batched = await tryBatchSparkNotification(input);
    if (batched) return batched;
  }

  // Create new notification
  const notification = await queryOne<Notification>(
    `INSERT INTO notifications (user_id, type, title, body, action_url, content)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.userId,
      input.type,
      input.title,
      input.body,
      input.actionUrl ?? null,
      JSON.stringify(input.content ?? {}),
    ]
  );

  if (!notification) return null;

  // Send push notification if enabled
  await trySendPush(input.userId, notification, prefs);

  return notification;
}

// ─── Spark Batching ──────────────────────────────────────────

async function tryBatchSparkNotification(
  input: CreateNotificationInput
): Promise<Notification | null> {
  const contentId = input.content?.content_id as string | undefined;
  if (!contentId) return null;

  // Look for an existing unread spark notification for the same content within 1 hour
  const existing = await queryOne<Notification>(
    `SELECT * FROM notifications
     WHERE user_id = $1
       AND type = 'spark'
       AND read = FALSE
       AND content->>'content_id' = $2
       AND created_at > NOW() - INTERVAL '1 hour'
     ORDER BY created_at DESC
     LIMIT 1`,
    [input.userId, contentId]
  );

  if (!existing) return null;

  // Batch: update existing notification
  const existingContent = existing.content as Record<string, unknown>;
  const sparkCount = ((existingContent.spark_count as number) ?? 1) + 1;
  const contentTitle = (input.content?.content_title as string) ?? "";
  const contentType = (input.content?.content_type as string) ?? "post";
  const latestSparker = (input.content?.latest_sparker as string) ?? "";

  // Build batched title
  let newTitle: string;
  if (sparkCount <= 1) {
    newTitle = `${latestSparker} sparked your ${contentType} '${contentTitle}'`;
  } else if (sparkCount <= 5) {
    newTitle = `${latestSparker} and ${sparkCount - 1} others sparked your ${contentType} '${contentTitle}'`;
  } else {
    newTitle = `${sparkCount} people sparked your ${contentType} '${contentTitle}'`;
  }

  const updatedContent = {
    ...existingContent,
    spark_count: sparkCount,
    latest_sparker: latestSparker,
  };

  const updated = await queryOne<Notification>(
    `UPDATE notifications
     SET title = $1, content = $2, created_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [newTitle, JSON.stringify(updatedContent), existing.id]
  );

  // Do NOT send push for batched spark updates
  return updated;
}

// ─── Push Notification Helper ────────────────────────────────

async function trySendPush(
  userId: string,
  notification: Notification,
  prefs: NotificationPreferences
): Promise<void> {
  if (!prefs.push_enabled) return;

  // Check per-type push preference
  const pushKey = `push_${notification.type}` as keyof NotificationPreferences;
  if (pushKey in prefs && prefs[pushKey] === false) return;

  try {
    const sent = await sendPushToUser(userId, {
      title: "fuega.ai",
      body: notification.body,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      tag: notification.id,
      data: { url: notification.action_url ?? "/" },
    });

    if (sent) {
      await query(
        `UPDATE notifications SET push_sent = TRUE WHERE id = $1`,
        [notification.id]
      );
    }
  } catch {
    // Push failure is not critical — log but don't throw
    console.error(`Push notification failed for user ${userId}:`, notification.id);
  }
}

// ─── Internal Preferences (no feature flag check) ────────────

async function getPreferencesInternal(userId: string): Promise<NotificationPreferences> {
  const user = await queryOne<{ notification_preferences: NotificationPreferences }>(
    `SELECT notification_preferences FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  if (!user) return { ...DEFAULT_PREFERENCES };
  return { ...DEFAULT_PREFERENCES, ...user.notification_preferences };
}
