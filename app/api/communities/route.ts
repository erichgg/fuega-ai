import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import {
  createCommunitySchema,
  listCommunitiesSchema,
} from "@/lib/validation/communities";
import {
  createCommunity,
  listCommunities,
  ServiceError,
} from "@/lib/services/communities.service";

/**
 * GET /api/communities?category=&sort=&limit=&offset=
 * List all public communities with filtering and pagination.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = listCommunitiesSchema.safeParse({
      category: url.searchParams.get("category") ?? undefined,
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

    const communities = await listCommunities(parsed.data);

    return NextResponse.json({
      communities,
      count: communities.length,
      sort: parsed.data.sort,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });
  } catch (err) {
    console.error("List communities error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/communities
 * Create a new community. Auth required.
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

    const body = await req.json();
    const parsed = createCommunitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: (parsed.error.errors[0]?.message ?? "Invalid input"),
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const community = await createCommunity(parsed.data, user.userId);

    return NextResponse.json({ community }, { status: 201 });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("Create community error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
