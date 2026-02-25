import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { checkGeneralRateLimit } from "@/lib/auth/rate-limit";
import {
  getRooms,
  createRoom,
  getOrCreateDefaultRoom,
} from "@/lib/services/chat.service";
import { ServiceError } from "@/lib/services/posts.service";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/campfires/:id/chat/rooms
 * List all rooms for a campfire. Auto-creates #general if none exist.
 */
export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id: campfireId } = await context.params;
    let rooms = await getRooms(campfireId);

    // Auto-create default room if none exist
    if (rooms.length === 0) {
      await getOrCreateDefaultRoom(campfireId);
      rooms = await getRooms(campfireId);
    }

    return NextResponse.json({ rooms });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("Get chat rooms error:", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * POST /api/campfires/:id/chat/rooms
 * Create a new room. Auth required. Only campfire creator can create rooms.
 * Body: { name: string, description?: string }
 */
export async function POST(req: Request, context: RouteContext) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: "Authentication required", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const rateLimit = await checkGeneralRateLimit(user.userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const { id: campfireId } = await context.params;
    const body = await req.json();

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "Room name is required", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const room = await createRoom(
      campfireId,
      user.userId,
      body.name,
      body.description
    );

    return NextResponse.json({ room }, { status: 201 });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("Create chat room error:", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
