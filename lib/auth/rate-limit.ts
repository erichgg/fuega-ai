/**
 * In-memory rate limiter for auth endpoints.
 * Uses rate-limiter-flexible for production-ready limiting.
 *
 * Limits:
 *   - Signup: 1 per hour per IP hash
 *   - Login:  5 per 15 minutes per IP hash
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
 * Reset rate limiters — for testing only.
 */
export async function resetRateLimiters(): Promise<void> {
  await signupLimiter.delete("*");
  await loginLimiter.delete("*");
}

export { signupLimiter, loginLimiter };
