import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import {
  joinCampfire,
  ServiceError,
} from "@/lib/services/campfires.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/campfires/:id/join
 * Join a campfire. Auth required.
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const membership = await joinCampfire(id, user.userId);

    return NextResponse.json({ membership }, { status: 201 });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("Join campfire error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
