import { NextResponse } from "next/server";
import { authenticate, clearAuthCookie } from "@/lib/auth/jwt";
import { queryOne } from "@/lib/db";
import { changePasswordSchema } from "@/lib/auth/profile-validation";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { checkPasswordChangeRateLimit, checkGeneralRateLimit } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

/**
 * PUT /api/settings/account
 * Change password.
 */
export async function PUT(req: Request) {
  try {
    const auth = await authenticate(req);
    if (!auth) {
      return NextResponse.json(
        { error: "Not authenticated", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const rateLimit = await checkPasswordChangeRateLimit(auth.userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many password change attempts. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const user = await queryOne<{ password_hash: string }>(
      `SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [auth.userId]
    );

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const valid = await verifyPassword(parsed.data.currentPassword, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect", code: "INVALID_PASSWORD" },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(parsed.data.newPassword);
    await queryOne(
      `UPDATE users SET password_hash = $2, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [auth.userId, newHash]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/account
 * Soft-delete account.
 */
export async function DELETE(req: Request) {
  try {
    const auth = await authenticate(req);
    if (!auth) {
      return NextResponse.json(
        { error: "Not authenticated", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const rateLimit = await checkGeneralRateLimit(auth.userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    await queryOne(
      `UPDATE users SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [auth.userId]
    );

    await clearAuthCookie();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete account error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
