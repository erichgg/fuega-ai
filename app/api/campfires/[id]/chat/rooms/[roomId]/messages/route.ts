import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "@/lib/auth/jwt";
import {
  sendMessage,
  getRecentMessages,
  subscribeToRoom,
  type ChatMessage,
} from "@/lib/services/chat.service";
import { ServiceError } from "@/lib/services/posts.service";
import { checkPostRateLimit } from "@/lib/auth/rate-limit";

const roomMessageSchema = z.object({
  body: z.string().min(1).max(2000),
});

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string; roomId: string }>;
}

/**
 * GET /api/campfires/:id/chat/rooms/:roomId/messages
 * Get recent messages for a room OR open SSE stream.
 * - ?stream=true → Server-Sent Events
 * - Otherwise → JSON array of recent messages
 */
export async function GET(req: Request, context: RouteContext) {
  const { id: campfireId, roomId } = await context.params;
  const url = new URL(req.url);
  const stream = url.searchParams.get("stream") === "true";
  const before = url.searchParams.get("before") ?? undefined;
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 100);

  if (stream) {
    // SSE stream — require authentication
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(": heartbeat\n\n"));

        const unsubscribe = subscribeToRoom(campfireId, roomId, (msg: ChatMessage) => {
          const data = JSON.stringify(msg);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        });

        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch {
            clearInterval(heartbeat);
          }
        }, 30000);

        req.signal.addEventListener("abort", () => {
          unsubscribe();
          clearInterval(heartbeat);
          try { controller.close(); } catch { /* already closed */ }
        });
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  // Regular fetch
  try {
    const messages = await getRecentMessages(campfireId, limit, before, roomId);
    return NextResponse.json({ messages });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("Get room messages error:", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * POST /api/campfires/:id/chat/rooms/:roomId/messages
 * Send a message to a specific room. Auth required.
 * Body: { body: string }
 */
export async function POST(req: Request, context: RouteContext) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: "Authentication required", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const rateLimit = await checkPostRateLimit(user.userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many messages. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const { id: campfireId, roomId } = await context.params;
    const body = await req.json();
    const parsed = roomMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const message = await sendMessage(campfireId, user.userId, parsed.data.body, roomId);

    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("Send room message error:", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
