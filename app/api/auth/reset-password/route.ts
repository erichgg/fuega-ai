import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import { queryOne } from "@/lib/db";
import { resetTokenStore } from "@/lib/auth/reset-tokens";

export const dynamic = "force-dynamic";

const resetPasswordSchema = z.object({
  token: z.string().uuid("Invalid reset token"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

/**
 * POST /api/auth/reset-password
 * Validates a reset token and updates the user's password.
 */
export async function POST(req: Request) {
  try {
    // Parse and validate input
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Invalid input";
      return NextResponse.json(
        { error: firstError, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { token, newPassword } = parsed.data;

    // Look up and validate token
    const entry = resetTokenStore.get(token);
    if (!entry || entry.expiresAt < Date.now()) {
      // Clean up expired token if present
      if (entry) resetTokenStore.delete(token);
      return NextResponse.json(
        { error: "Invalid or expired reset token", code: "INVALID_TOKEN" },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update user's password in DB
    const updated = await queryOne<{ id: string }>(
      `UPDATE users SET password_hash = $1, updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [passwordHash, entry.userId]
    );

    if (!updated) {
      resetTokenStore.delete(token);
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Clear the token so it can't be reused
    resetTokenStore.delete(token);

    return NextResponse.json({
      message: "Password has been reset successfully.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
