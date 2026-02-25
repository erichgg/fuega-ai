/**
 * In-memory password reset token store (V1).
 *
 * In a multi-instance deployment this won't work — migrate to a DB table
 * with `password_reset_token` / `password_reset_expires` columns.
 */

interface ResetEntry {
  userId: string;
  expiresAt: number; // epoch ms
}

export const resetTokenStore = new Map<string, ResetEntry>();

export const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Cleanup expired tokens periodically (every 10 minutes)
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    Array.from(resetTokenStore.entries()).forEach(([token, entry]) => {
      if (entry.expiresAt < now) {
        resetTokenStore.delete(token);
      }
    });
  }, 10 * 60 * 1000);
}
