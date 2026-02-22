/**
 * Tests for the notification system:
 * - Create notification on comment reply
 * - Spark batching (5 sparks = 1 notification, not 5)
 * - Mark as read / mark all as read
 * - Preferences respected (disabled type = no notification)
 * - Push subscription register/unregister
 * - Feature flag off = empty responses
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { getTestDb, closeTestDb, TEST_IDS } from "@/tests/unit/database/helpers";
import type { PGlite } from "@electric-sql/pglite";

let db: PGlite;

// Mock the db module to use PGlite
vi.mock("@/lib/db", async () => {
  return {
    query: async (text: string, params?: unknown[]) => {
      const d = await getTestDb();
      return d.query(text, params);
    },
    queryOne: async (text: string, params?: unknown[]) => {
      const d = await getTestDb();
      const result = await d.query(text, params);
      return result.rows[0] ?? null;
    },
    queryAll: async (text: string, params?: unknown[]) => {
      const d = await getTestDb();
      const result = await d.query(text, params);
      return result.rows;
    },
  };
});

// Feature flag state
let notificationsEnabled = true;

vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: (flag: string) => {
    if (flag === "ENABLE_NOTIFICATIONS") return notificationsEnabled;
    return false;
  },
  getAllFeatureFlags: () => ({
    ENABLE_BADGE_DISTRIBUTION: false,
    ENABLE_COSMETICS_SHOP: false,
    ENABLE_TIP_JAR: false,
    ENABLE_NOTIFICATIONS: notificationsEnabled,
  }),
}));

// Mock push-notifications to avoid web-push dependency in tests
vi.mock("@/lib/services/push-notifications", () => ({
  sendPushToUser: vi.fn().mockResolvedValue(false),
  subscribePush: vi.fn().mockImplementation(async (userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) => {
    const d = await getTestDb();
    const result = await d.query(
      `INSERT INTO user_push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
       RETURNING *`,
      [userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth]
    );
    return result.rows[0];
  }),
  unsubscribePush: vi.fn().mockImplementation(async (userId: string, endpoint?: string) => {
    const d = await getTestDb();
    if (endpoint) {
      await d.query(`DELETE FROM user_push_subscriptions WHERE user_id = $1 AND endpoint = $2`, [userId, endpoint]);
    } else {
      await d.query(`DELETE FROM user_push_subscriptions WHERE user_id = $1`, [userId]);
    }
  }),
}));

// Import after mocks
const {
  createNotification,
  listNotifications,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreferences,
} = await import("@/lib/services/notifications.service");

const { subscribePush, unsubscribePush } = await import("@/lib/services/push-notifications");

describe("Notification System", () => {
  beforeAll(async () => {
    db = await getTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    // Clean notifications and push subscriptions between tests
    await db.exec("DELETE FROM notifications");
    await db.exec("DELETE FROM user_push_subscriptions");
    // Reset user preferences
    await db.query(`UPDATE users SET notification_preferences = '{}' WHERE id = $1`, [TEST_IDS.testUser1]);
    // Reset feature flag
    notificationsEnabled = true;
  });

  // ─── Feature Flag ──────────────────────────────────────────

  describe("Feature flag", () => {
    it("returns null when ENABLE_NOTIFICATIONS is false", async () => {
      notificationsEnabled = false;

      const result = await createNotification({
        userId: TEST_IDS.testUser1,
        type: "reply_post",
        title: "New reply",
        body: "Someone replied to your post",
        actionUrl: "/f/test/posts/123",
      });

      expect(result).toBeNull();
    });

    it("returns empty list when feature is disabled", async () => {
      notificationsEnabled = false;

      const result = await listNotifications(TEST_IDS.testUser1, { page: 1, limit: 20 });

      expect(result.notifications).toEqual([]);
      expect(result.unread_count).toBe(0);
    });
  });

  // ─── Create Notifications ─────────────────────────────────

  describe("Create notifications", () => {
    it("creates a reply_post notification", async () => {
      const notification = await createNotification({
        userId: TEST_IDS.testUser1,
        type: "reply_post",
        title: "New reply on your post",
        body: "user2 commented on 'Test Post'",
        actionUrl: "/f/test/posts/123",
        content: {
          post_id: TEST_IDS.post1,
          post_title: "Test Post",
          comment_id: TEST_IDS.comment1,
          commenter_username: "user2",
          comment_preview: "This is a great post!",
        },
      });

      expect(notification).not.toBeNull();
      expect(notification!.type).toBe("reply_post");
      expect(notification!.read).toBe(false);
      expect(notification!.push_sent).toBe(false);
    });

    it("does not create notification when user disables the type", async () => {
      await updatePreferences(TEST_IDS.testUser1, { reply_post: false });

      const notification = await createNotification({
        userId: TEST_IDS.testUser1,
        type: "reply_post",
        title: "New reply",
        body: "Someone replied",
      });

      expect(notification).toBeNull();
    });
  });

  // ─── Spark Batching ────────────────────────────────────────

  describe("Spark batching", () => {
    it("batches 5 sparks into 1 notification", async () => {
      const contentId = TEST_IDS.post1;

      // First spark — creates new notification
      const first = await createNotification({
        userId: TEST_IDS.testUser1,
        type: "spark",
        title: "user2 sparked your post 'Test Post'",
        body: "user2 sparked your post",
        actionUrl: "/f/test/posts/123",
        content: {
          content_type: "post",
          content_id: contentId,
          content_title: "Test Post",
          spark_count: 1,
          latest_sparker: "user2",
        },
      });
      expect(first).not.toBeNull();
      const firstId = first!.id;

      // Sparks 2-5 should batch into the same notification
      for (let i = 2; i <= 5; i++) {
        await createNotification({
          userId: TEST_IDS.testUser1,
          type: "spark",
          title: `user${i + 1} sparked your post 'Test Post'`,
          body: `user${i + 1} sparked your post`,
          actionUrl: "/f/test/posts/123",
          content: {
            content_type: "post",
            content_id: contentId,
            content_title: "Test Post",
            spark_count: 1,
            latest_sparker: `user${i + 1}`,
          },
        });
      }

      // Should only be 1 notification, not 5
      const list = await listNotifications(TEST_IDS.testUser1, { page: 1, limit: 20 });
      expect(list.notifications.length).toBe(1);

      // Should show correct spark count
      const batched = list.notifications[0];
      expect(batched.id).toBe(firstId);
      const batchedContent = batched.content as { spark_count: number; latest_sparker: string };
      expect(batchedContent.spark_count).toBe(5);
      expect(batchedContent.latest_sparker).toBe("user6");

      // Title should reflect batch format
      expect(batched.title).toContain("others");
    });

    it("creates new notification after existing one is read", async () => {
      const contentId = TEST_IDS.post1;

      // Create first spark notification
      const first = await createNotification({
        userId: TEST_IDS.testUser1,
        type: "spark",
        title: "user2 sparked your post",
        body: "user2 sparked your post",
        content: {
          content_type: "post",
          content_id: contentId,
          content_title: "Test Post",
          spark_count: 1,
          latest_sparker: "user2",
        },
      });
      expect(first).not.toBeNull();

      // Mark it as read
      await markAsRead(first!.id, TEST_IDS.testUser1);

      // New spark should create a new notification (not batch into read one)
      const second = await createNotification({
        userId: TEST_IDS.testUser1,
        type: "spark",
        title: "user3 sparked your post",
        body: "user3 sparked your post",
        content: {
          content_type: "post",
          content_id: contentId,
          content_title: "Test Post",
          spark_count: 1,
          latest_sparker: "user3",
        },
      });
      expect(second).not.toBeNull();
      expect(second!.id).not.toBe(first!.id);

      const list = await listNotifications(TEST_IDS.testUser1, { page: 1, limit: 20 });
      expect(list.notifications.length).toBe(2);
    });
  });

  // ─── Mark as Read ──────────────────────────────────────────

  describe("Mark as read", () => {
    it("marks a single notification as read", async () => {
      const notification = await createNotification({
        userId: TEST_IDS.testUser1,
        type: "mention",
        title: "You were mentioned",
        body: "user2 mentioned you",
      });
      expect(notification).not.toBeNull();
      expect(notification!.read).toBe(false);

      const updated = await markAsRead(notification!.id, TEST_IDS.testUser1);
      expect(updated.read).toBe(true);
      expect(updated.read_at).not.toBeNull();
    });

    it("rejects marking another user's notification as read", async () => {
      const notification = await createNotification({
        userId: TEST_IDS.testUser1,
        type: "mention",
        title: "You were mentioned",
        body: "user2 mentioned you",
      });

      await expect(
        markAsRead(notification!.id, TEST_IDS.testUser2)
      ).rejects.toThrow("Notification not found");
    });

    it("marks all notifications as read", async () => {
      // Create 3 notifications
      for (let i = 0; i < 3; i++) {
        await createNotification({
          userId: TEST_IDS.testUser1,
          type: "governance",
          title: `Proposal ${i}`,
          body: `New governance proposal ${i}`,
        });
      }

      const count = await markAllAsRead(TEST_IDS.testUser1);
      expect(count).toBe(3);

      const list = await listNotifications(TEST_IDS.testUser1, { page: 1, limit: 20 });
      expect(list.unread_count).toBe(0);
      expect(list.notifications.every((n) => n.read === true)).toBe(true);
    });
  });

  // ─── List & Pagination ────────────────────────────────────

  describe("List and pagination", () => {
    it("returns paginated notifications newest first", async () => {
      for (let i = 0; i < 5; i++) {
        await createNotification({
          userId: TEST_IDS.testUser1,
          type: "governance",
          title: `Notification ${i}`,
          body: `Body ${i}`,
        });
      }

      const page1 = await listNotifications(TEST_IDS.testUser1, { page: 1, limit: 2 });
      expect(page1.notifications.length).toBe(2);
      expect(page1.total).toBe(5);
      expect(page1.unread_count).toBe(5);

      const page2 = await listNotifications(TEST_IDS.testUser1, { page: 2, limit: 2 });
      expect(page2.notifications.length).toBe(2);

      const page3 = await listNotifications(TEST_IDS.testUser1, { page: 3, limit: 2 });
      expect(page3.notifications.length).toBe(1);
    });

    it("filters by type", async () => {
      await createNotification({
        userId: TEST_IDS.testUser1,
        type: "mention",
        title: "Mention",
        body: "You were mentioned",
      });
      await createNotification({
        userId: TEST_IDS.testUser1,
        type: "governance",
        title: "Proposal",
        body: "New proposal",
      });

      const mentions = await listNotifications(TEST_IDS.testUser1, { page: 1, limit: 20, type: "mention" });
      expect(mentions.notifications.length).toBe(1);
      expect(mentions.notifications[0].type).toBe("mention");
    });
  });

  // ─── Preferences ──────────────────────────────────────────

  describe("Preferences", () => {
    it("returns defaults when no preferences are set", async () => {
      const prefs = await getPreferences(TEST_IDS.testUser1);
      expect(prefs.reply_post).toBe(true);
      expect(prefs.push_enabled).toBe(false);
      expect(prefs.push_spark).toBe(false);
    });

    it("updates and merges preferences", async () => {
      const updated = await updatePreferences(TEST_IDS.testUser1, {
        spark: false,
        push_enabled: true,
      });

      expect(updated.spark).toBe(false);
      expect(updated.push_enabled).toBe(true);
      // Unchanged defaults preserved
      expect(updated.reply_post).toBe(true);
      expect(updated.mention).toBe(true);
    });

    it("prevents notification when type is disabled", async () => {
      await updatePreferences(TEST_IDS.testUser1, { spark: false });

      const result = await createNotification({
        userId: TEST_IDS.testUser1,
        type: "spark",
        title: "Spark",
        body: "Someone sparked",
        content: { content_type: "post", content_id: "abc", spark_count: 1 },
      });

      expect(result).toBeNull();
    });
  });

  // ─── Push Subscriptions ───────────────────────────────────

  describe("Push subscriptions", () => {
    it("registers a push subscription", async () => {
      const result = await subscribePush(TEST_IDS.testUser1, {
        endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint",
        keys: { p256dh: "test-p256dh-key", auth: "test-auth-key" },
      });

      expect(result).toBeDefined();
      expect(result.endpoint).toBe("https://fcm.googleapis.com/fcm/send/test-endpoint");
    });

    it("removes a push subscription by endpoint", async () => {
      const endpoint = "https://fcm.googleapis.com/fcm/send/test-remove";
      await subscribePush(TEST_IDS.testUser1, {
        endpoint,
        keys: { p256dh: "key1", auth: "key2" },
      });

      await unsubscribePush(TEST_IDS.testUser1, endpoint);

      // Verify it's gone
      const result = await db.query(
        `SELECT * FROM user_push_subscriptions WHERE user_id = $1 AND endpoint = $2`,
        [TEST_IDS.testUser1, endpoint]
      );
      expect(result.rows.length).toBe(0);
    });

    it("removes all push subscriptions for user", async () => {
      await subscribePush(TEST_IDS.testUser1, {
        endpoint: "https://endpoint-1",
        keys: { p256dh: "k1", auth: "a1" },
      });
      await subscribePush(TEST_IDS.testUser1, {
        endpoint: "https://endpoint-2",
        keys: { p256dh: "k2", auth: "a2" },
      });

      await unsubscribePush(TEST_IDS.testUser1);

      const result = await db.query(
        `SELECT * FROM user_push_subscriptions WHERE user_id = $1`,
        [TEST_IDS.testUser1]
      );
      expect(result.rows.length).toBe(0);
    });
  });
});
