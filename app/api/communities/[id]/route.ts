import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { updateCommunitySchema } from "@/lib/validation/communities";
import {
  getCommunityById,
  updateCommunity,
  ServiceError,
} from "@/lib/services/communities.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/communities/:id
 * Get full community details.
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const community = await getCommunityById(id);
    if (!community) {
      return NextResponse.json(
        { error: "Community not found", code: "COMMUNITY_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ community });
  } catch (err) {
    console.error("Get community error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/communities/:id
 * Update community settings. Admin only.
 * Cannot directly update AI prompt (must use proposal).
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const body = await req.json();
    const parsed = updateCommunitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: (parsed.error.errors[0]?.message ?? "Invalid input"),
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const community = await updateCommunity(id, user.userId, parsed.data);

    return NextResponse.json({ community });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("Update community error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
