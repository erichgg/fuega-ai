import { NextResponse } from "next/server";
import { z } from "zod";
import { hashIp, getClientIp } from "@/lib/auth/ip-hash";
import { checkForgotPasswordRateLimit } from "@/lib/auth/rate-limit";
import { queryOne } from "@/lib/db";
import crypto from "crypto";
import { resetTokenStore, TOKEN_TTL_MS } from "@/lib/auth/reset-tokens";

export const dynamic = "force-dynamic";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

/**
 * POST /api/auth/forgot-password
 * Initiates a password reset flow. Always returns success to avoid leaking
 * whether an email exists. Heavily rate-limited (3/hour per IP).
 */
export async function POST(req: Request) {
  try {
    // Rate limit by IP hash
    const ip = getClientIp(req);
    const ipHash = hashIp(ip);
    const rateLimit = await checkForgotPasswordRateLimit(ipHash);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Try again later.",
          code: "RATE_LIMITED",
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    // Parse and validate input
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Invalid input";
      return NextResponse.json(
        { error: firstError, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Look up user by email — but ALWAYS return success regardless
    const user = await queryOne<{ id: string; username: string }>(
      `SELECT id, username FROM users
       WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`,
      [email]
    );

    if (user) {
      // Generate reset token
      const token = crypto.randomUUID();
      resetTokenStore.set(token, {
        userId: user.id,
        expiresAt: Date.now() + TOKEN_TTL_MS,
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const resetUrl = `${appUrl}/reset-password?token=${token}`;

      // V1: Log to server console. Replace with email sending in production.
      console.log(`\n[forgot-password] Reset link for ${user.username}: ${resetUrl}\n`);
    }

    // Always return success — do not leak whether the email exists
    return NextResponse.json({
      message: "If an account with that email exists, a reset link has been sent.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
