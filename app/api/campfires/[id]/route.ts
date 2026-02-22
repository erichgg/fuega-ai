import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { updateCampfireSchema } from "@/lib/validation/campfires";
import {
  getCampfireById,
  updateCampfire,
  ServiceError,
} from "@/lib/services/campfires.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/campfires/:id
 * Get full campfire details.
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const campfire = await getCampfireById(id);
    if (!campfire) {
      return NextResponse.json(
        { error: "Campfire not found", code: "CAMPFIRE_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ campfire });
  } catch (err) {
    console.error("Get campfire error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/campfires/:id
 * Update campfire settings. Admin only.
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
    const parsed = updateCampfireSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: (parsed.error.errors[0]?.message ?? "Invalid input"),
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const campfire = await updateCampfire(id, user.userId, parsed.data);

    return NextResponse.json({ campfire });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("Update campfire error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
