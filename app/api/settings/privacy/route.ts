import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { queryOne } from "@/lib/db";
import { updatePrivacySchema } from "@/lib/auth/profile-validation";

/**
 * PUT /api/settings/privacy
 * Update profile visibility.
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

    const body = await req.json();
    const parsed = updatePrivacySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const updated = await queryOne<{ username: string }>(
      `UPDATE users SET profile_visible = $2, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING username`,
      [auth.userId, parsed.data.profileVisible]
    );

    if (!updated) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Update privacy error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
