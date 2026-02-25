import { NextResponse } from "next/server";
import { checkSearchRateLimit } from "@/lib/auth/rate-limit";
import { hashIp, getClientIp } from "@/lib/auth/ip-hash";
import { searchSchema } from "@/lib/validation/search";
import {
  searchAll,
  searchPosts,
  searchCampfires,
  searchUsers,
} from "@/lib/services/search.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/search?q=term&type=all|posts|campfires|users&limit=25&offset=0
 * Sitewide search across posts, campfires, and users.
 */
export async function GET(req: Request) {
  try {
    const ipHash = hashIp(getClientIp(req));
    const rateLimit = await checkSearchRateLimit(ipHash);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const url = new URL(req.url);
    const parsed = searchSchema.safeParse({
      q: url.searchParams.get("q") ?? "",
      type: url.searchParams.get("type") ?? "all",
      limit: url.searchParams.get("limit") ?? "25",
      offset: url.searchParams.get("offset") ?? "0",
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.errors[0]?.message ?? "Invalid input",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    const { q, type, limit, offset } = parsed.data;

    let response;
    switch (type) {
      case "posts":
        response = await searchPosts(q, limit, offset);
        break;
      case "campfires":
        response = await searchCampfires(q, limit, offset);
        break;
      case "users":
        response = await searchUsers(q, limit, offset);
        break;
      default:
        response = await searchAll(q, limit, offset);
        break;
    }

    return NextResponse.json({
      results: response.results,
      total: response.total,
      query: response.query,
    });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
