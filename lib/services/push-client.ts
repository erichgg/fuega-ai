/**
 * Client-side Web Push registration utilities.
 * Handles browser permission requests and subscription management.
 */

// ---------------------------------------------------------------------------
// Permission check
// ---------------------------------------------------------------------------

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

// ---------------------------------------------------------------------------
// Request permission
// ---------------------------------------------------------------------------

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported in this browser");
  }

  const permission = await Notification.requestPermission();
  return permission;
}

// ---------------------------------------------------------------------------
// Subscribe to push
// ---------------------------------------------------------------------------

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function subscribeToPush(): Promise<PushSubscriptionJSON> {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported in this browser");
  }

  const permission = await requestPushPermission();
  if (permission !== "granted") {
    throw new Error("Push notification permission denied");
  }

  const registration = await navigator.serviceWorker.ready;

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    throw new Error("VAPID public key not configured");
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
  });

  const json = subscription.toJSON();

  if (!json.endpoint || !json.keys) {
    throw new Error("Invalid push subscription");
  }

  return {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh ?? "",
      auth: json.keys.auth ?? "",
    },
  };
}

// ---------------------------------------------------------------------------
// Unsubscribe from push
// ---------------------------------------------------------------------------

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await subscription.unsubscribe();
  }
}

// ---------------------------------------------------------------------------
// Get existing subscription
// ---------------------------------------------------------------------------

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// VAPID key conversion helper
// ---------------------------------------------------------------------------

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
