import { query, queryOne, queryAll } from "@/lib/db";
import { ServiceError } from "@/lib/services/posts.service";
import { isFeatureEnabled } from "@/lib/feature-flags";
import webpush from "web-push";

// ─── Types ───────────────────────────────────────────────────

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface StoredPushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export interface PushPayload {
  title: string;
  body: string;
  icon: string;
  badge: string;
  tag: string;
  data: { url: string };
}

// ─── Rate Limiting (in-memory) ───────────────────────────────

const pushRateMap = new Map<string, number>();
const PUSH_RATE_LIMIT_MS = 60_000; // 1 push per minute per user

function isRateLimited(userId: string): boolean {
  const lastPush = pushRateMap.get(userId);
  if (!lastPush) return false;
  return Date.now() - lastPush < PUSH_RATE_LIMIT_MS;
}

function recordPush(userId: string): void {
  pushRateMap.set(userId, Date.now());
  // Clean up old entries periodically (keep map size manageable)
  if (pushRateMap.size > 10_000) {
    const cutoff = Date.now() - PUSH_RATE_LIMIT_MS;
    pushRateMap.forEach((time, key) => {
      if (time < cutoff) pushRateMap.delete(key);
    });
  }
}

// ─── Subscribe / Unsubscribe ─────────────────────────────────

export async function subscribePush(
  userId: string,
  subscription: PushSubscriptionData
): Promise<StoredPushSubscription> {
  if (!isFeatureEnabled("ENABLE_NOTIFICATIONS")) {
    throw new ServiceError("Notifications are not enabled", "FEATURE_DISABLED", 403);
  }

  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    throw new ServiceError("Invalid push subscription", "INVALID_SUBSCRIPTION", 400);
  }

  const result = await queryOne<StoredPushSubscription>(
    `INSERT INTO user_push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, endpoint) DO UPDATE
       SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
     RETURNING *`,
    [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
  );

  if (!result) {
    throw new ServiceError("Failed to save push subscription", "INTERNAL_ERROR", 500);
  }

  return result;
}

export async function unsubscribePush(userId: string, endpoint?: string): Promise<void> {
  if (!isFeatureEnabled("ENABLE_NOTIFICATIONS")) {
    throw new ServiceError("Notifications are not enabled", "FEATURE_DISABLED", 403);
  }

  if (endpoint) {
    await query(
      `DELETE FROM user_push_subscriptions WHERE user_id = $1 AND endpoint = $2`,
      [userId, endpoint]
    );
  } else {
    // Remove all subscriptions for this user
    await query(
      `DELETE FROM user_push_subscriptions WHERE user_id = $1`,
      [userId]
    );
  }
}

// ─── Send Push ───────────────────────────────────────────────

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<boolean> {
  if (isRateLimited(userId)) {
    return false;
  }

  const subscriptions = await queryAll<StoredPushSubscription>(
    `SELECT * FROM user_push_subscriptions WHERE user_id = $1`,
    [userId]
  );

  if (subscriptions.length === 0) return false;

  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("VAPID keys not configured — skipping push notifications");
    return false;
  }

  let anySent = false;

  webpush.setVapidDetails(
    "mailto:noreply@fuega.ai",
    vapidPublicKey,
    vapidPrivateKey
  );

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
      anySent = true;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 410 || statusCode === 404) {
        // Subscription expired — clean up
        await query(
          `DELETE FROM user_push_subscriptions WHERE id = $1`,
          [sub.id]
        );
      } else {
        console.error(`Push send failed for subscription ${sub.id}:`, err);
      }
    }
  }

  if (anySent) {
    recordPush(userId);
  }

  return anySent;
}
