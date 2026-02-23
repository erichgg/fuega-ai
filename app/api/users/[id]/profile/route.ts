import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  social_links: Record<string, string>;
  profile_visible: boolean;
  brand_text: string | null;
  brand_style: Record<string, string>;
  post_glow: number;
  comment_glow: number;
  founder_number: number | null;
  created_at: string;
}

/**
 * GET /api/users/:id/profile
 * Public profile view. Accepts UUID or username. Returns profile data if profile_visible = true.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Accept either UUID or username
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const user = await queryOne<ProfileRow>(
      isUuid
        ? `SELECT id, username, display_name, bio, location, website,
                  social_links, profile_visible, brand_text, brand_style,
                  post_glow, comment_glow, founder_number, created_at
           FROM users WHERE id = $1 AND deleted_at IS NULL AND is_banned = false`
        : `SELECT id, username, display_name, bio, location, website,
                  social_links, profile_visible, brand_text, brand_style,
                  post_glow, comment_glow, founder_number, created_at
           FROM users WHERE LOWER(username) = LOWER($1) AND deleted_at IS NULL AND is_banned = false`,
      [id]
    );

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!user.profile_visible) {
      return NextResponse.json({
        profile: {
          username: user.username,
          profileVisible: false,
          glow: user.post_glow + user.comment_glow,
          founderNumber: user.founder_number,
          createdAt: user.created_at,
        },
      });
    }

    return NextResponse.json({
      profile: {
        username: user.username,
        displayName: user.display_name,
        bio: user.bio,
        location: user.location,
        website: user.website,
        socialLinks: user.social_links ?? {},
        profileVisible: true,
        brandText: user.brand_text,
        brandStyle: user.brand_style ?? {},
        glow: user.post_glow + user.comment_glow,
        postGlow: user.post_glow,
        commentGlow: user.comment_glow,
        founderNumber: user.founder_number,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    console.error("Get profile error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
