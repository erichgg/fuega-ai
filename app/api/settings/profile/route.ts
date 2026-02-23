import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { queryOne } from "@/lib/db";
import { updateProfileSchema } from "@/lib/auth/profile-validation";

interface ProfileRow {
  display_name: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  social_links: Record<string, string>;
  profile_visible: boolean;
  brand_text: string | null;
  brand_style: Record<string, string>;
}

/**
 * GET /api/settings/profile
 * Get current user's profile data for editing.
 */
export async function GET(req: Request) {
  try {
    const auth = await authenticate(req);
    if (!auth) {
      return NextResponse.json(
        { error: "Not authenticated", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const user = await queryOne<ProfileRow>(
      `SELECT display_name, bio, location, website, social_links,
              profile_visible, brand_text, brand_style
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [auth.userId]
    );

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      profile: {
        displayName: user.display_name,
        bio: user.bio,
        location: user.location,
        website: user.website,
        socialLinks: user.social_links ?? {},
        profileVisible: user.profile_visible,
        brandText: user.brand_text,
        brandStyle: user.brand_style ?? {},
      },
    });
  } catch (err) {
    console.error("Get settings profile error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/profile
 * Update current user's profile fields.
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
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { displayName, bio, location, website, socialLinks, brandText } = parsed.data;

    const updated = await queryOne<{ username: string }>(
      `UPDATE users SET
        display_name = $2,
        bio = $3,
        location = $4,
        website = CASE WHEN $5 = '' THEN NULL ELSE $5 END,
        social_links = $6,
        brand_text = $7,
        updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING username`,
      [
        auth.userId,
        displayName ?? null,
        bio ?? null,
        location ?? null,
        website ?? null,
        JSON.stringify(socialLinks ?? {}),
        brandText ?? null,
      ]
    );

    if (!updated) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Update profile error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
