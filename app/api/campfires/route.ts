import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { checkGeneralRateLimit } from "@/lib/auth/rate-limit";
import {
  createCampfireSchema,
  listCampfiresSchema,
} from "@/lib/validation/campfires";
import {
  createCampfire,
  listCampfires,
  ServiceError,
} from "@/lib/services/campfires.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/campfires?sort=&limit=&offset=
 * List all public campfires with filtering and pagination.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = listCampfiresSchema.safeParse({
      sort: url.searchParams.get("sort") ?? "members",
      limit: url.searchParams.get("limit") ?? "25",
      offset: url.searchParams.get("offset") ?? "0",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: (parsed.error.errors[0]?.message ?? "Invalid input"), code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const campfires = await listCampfires(parsed.data);

    return NextResponse.json({
      campfires,
      count: campfires.length,
      sort: parsed.data.sort,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });
  } catch (err) {
    console.error("List campfires error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/campfires
 * Create a new campfire. Auth required.
 */
export async function POST(req: Request) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const rateLimit = await checkGeneralRateLimit(user.userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const body = await req.json();
    const parsed = createCampfireSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: (parsed.error.errors[0]?.message ?? "Invalid input"),
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const campfire = await createCampfire(parsed.data, user.userId);

    return NextResponse.json({ campfire }, { status: 201 });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("Create campfire error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
