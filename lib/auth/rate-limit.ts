/**
 * In-memory rate limiter for fuega.ai endpoints.
 * Uses rate-limiter-flexible for production-ready limiting.
 *
 * Limits:
 *   - Signup:   1 per hour per IP hash
 *   - Login:    5 per 15 minutes per IP hash
 *   - Posts:   10 per hour per user
 *   - Comments: 30 per hour per user
 *   - Votes:  100 per hour per user
 *   - AI mod:  50 per hour per IP hash
 *   - Password: 3 per hour per user (brute-force protection)
 *   - General: 20 per minute per user (catch-all for settings/actions)
 */

import { RateLimiterMemory } from "rate-limiter-flexible";

const signupLimiter = new RateLimiterMemory({
  points: 1,
  duration: 60 * 60, // 1 hour
  keyPrefix: "signup",
});

const loginLimiter = new RateLimiterMemory({
  points: 5,
  duration: 15 * 60, // 15 minutes
  keyPrefix: "login",
});

const postLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60 * 60, // 1 hour
  keyPrefix: "post_create",
});

const commentLimiter = new RateLimiterMemory({
  points: 30,
  duration: 60 * 60, // 1 hour
  keyPrefix: "comment_create",
});

const voteLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60 * 60, // 1 hour
  keyPrefix: "vote",
});

const moderationLimiter = new RateLimiterMemory({
  points: 50,
  duration: 60 * 60, // 1 hour
  keyPrefix: "ai_mod",
});

const passwordChangeLimiter = new RateLimiterMemory({
  points: 3,
  duration: 60 * 60, // 1 hour
  keyPrefix: "password_change",
});

const generalActionLimiter = new RateLimiterMemory({
  points: 20,
  duration: 60, // 1 minute
  keyPrefix: "general_action",
});

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Check signup rate limit for an IP hash.
 */
export async function checkSignupRateLimit(
  ipHash: string
): Promise<RateLimitResult> {
  try {
    await signupLimiter.consume(ipHash);
    return { allowed: true, retryAfterSeconds: 0 };
  } catch (err: unknown) {
    const rlErr = err as { msBeforeNext?: number };
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((rlErr.msBeforeNext ?? 3600000) / 1000),
    };
  }
}

/**
 * Check login rate limit for an IP hash.
 */
export async function checkLoginRateLimit(
  ipHash: string
): Promise<RateLimitResult> {
  try {
    await loginLimiter.consume(ipHash);
    return { allowed: true, retryAfterSeconds: 0 };
  } catch (err: unknown) {
    const rlErr = err as { msBeforeNext?: number };
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((rlErr.msBeforeNext ?? 900000) / 1000),
    };
  }
}

/**
 * Check post creation rate limit for a user ID.
 */
export async function checkPostRateLimit(
  userId: string
): Promise<RateLimitResult> {
  try {
    await postLimiter.consume(userId);
    return { allowed: true, retryAfterSeconds: 0 };
  } catch (err: unknown) {
    const rlErr = err as { msBeforeNext?: number };
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((rlErr.msBeforeNext ?? 3600000) / 1000),
    };
  }
}

/**
 * Check comment creation rate limit for a user ID.
 */
export async function checkCommentRateLimit(
  userId: string
): Promise<RateLimitResult> {
  try {
    await commentLimiter.consume(userId);
    return { allowed: true, retryAfterSeconds: 0 };
  } catch (err: unknown) {
    const rlErr = err as { msBeforeNext?: number };
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((rlErr.msBeforeNext ?? 3600000) / 1000),
    };
  }
}

/**
 * Check vote rate limit for a user ID.
 */
export async function checkVoteRateLimit(
  userId: string
): Promise<RateLimitResult> {
  try {
    await voteLimiter.consume(userId);
    return { allowed: true, retryAfterSeconds: 0 };
  } catch (err: unknown) {
    const rlErr = err as { msBeforeNext?: number };
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((rlErr.msBeforeNext ?? 3600000) / 1000),
    };
  }
}

/**
 * Check AI moderation rate limit for an IP hash.
 */
export async function checkModerationRateLimit(
  ipHash: string
): Promise<RateLimitResult> {
  try {
    await moderationLimiter.consume(ipHash);
    return { allowed: true, retryAfterSeconds: 0 };
  } catch (err: unknown) {
    const rlErr = err as { msBeforeNext?: number };
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((rlErr.msBeforeNext ?? 3600000) / 1000),
    };
  }
}

/**
 * Check password change rate limit for a user ID.
 */
export async function checkPasswordChangeRateLimit(
  userId: string
): Promise<RateLimitResult> {
  try {
    await passwordChangeLimiter.consume(userId);
    return { allowed: true, retryAfterSeconds: 0 };
  } catch (err: unknown) {
    const rlErr = err as { msBeforeNext?: number };
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((rlErr.msBeforeNext ?? 3600000) / 1000),
    };
  }
}

/**
 * Check general action rate limit for a user ID.
 * Used as catch-all for settings, profile updates, etc.
 */
export async function checkGeneralRateLimit(
  userId: string
): Promise<RateLimitResult> {
  try {
    await generalActionLimiter.consume(userId);
    return { allowed: true, retryAfterSeconds: 0 };
  } catch (err: unknown) {
    const rlErr = err as { msBeforeNext?: number };
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((rlErr.msBeforeNext ?? 60000) / 1000),
    };
  }
}

/**
 * Reset rate limiters — for testing only.
 */
export async function resetRateLimiters(): Promise<void> {
  await signupLimiter.delete("*");
  await loginLimiter.delete("*");
  await postLimiter.delete("*");
  await commentLimiter.delete("*");
  await voteLimiter.delete("*");
  await moderationLimiter.delete("*");
  await passwordChangeLimiter.delete("*");
  await generalActionLimiter.delete("*");
}

export {
  signupLimiter,
  loginLimiter,
  postLimiter,
  commentLimiter,
  voteLimiter,
  moderationLimiter,
  passwordChangeLimiter,
  generalActionLimiter,
};
