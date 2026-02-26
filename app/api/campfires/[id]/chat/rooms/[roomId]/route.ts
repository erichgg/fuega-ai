import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { checkGeneralRateLimit } from "@/lib/auth/rate-limit";
import { deleteRoom } from "@/lib/services/chat.service";
import { isAdmin } from "@/lib/services/campfires.service";
import { hashIp, getClientIp } from "@/lib/auth/ip-hash";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string; roomId: string }>;
}

/**
 * DELETE /api/campfires/:id/chat/rooms/:roomId
 * Deletes a chat room. Only campfire admins can delete rooms.
 */
export async function DELETE(req: Request, context: RouteContext) {
  try {
    const { id: campfireId, roomId } = await context.params;

    // Rate limit
    const ip = getClientIp(req);
    const ipHash = hashIp(ip);
    const rateLimit = await checkGeneralRateLimit(ipHash);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    // Authenticate
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Only admins can delete rooms
    const admin = await isAdmin(user.userId, campfireId);
    if (!admin) {
      return NextResponse.json(
        { error: "Only campfire admins can delete rooms", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    await deleteRoom(roomId, campfireId);

    return NextResponse.json({ message: "Room deleted" });
  } catch (error) {
    console.error("Delete room error:", error);
    return NextResponse.json(
      { error: "Failed to delete room", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
