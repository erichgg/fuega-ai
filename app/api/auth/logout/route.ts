import { NextResponse } from "next/server";
import { clearAuthCookie, authenticate } from "@/lib/auth/jwt";

export async function POST(req: Request) {
  try {
    const auth = await authenticate(req);

    // Clear the cookie regardless of auth state
    await clearAuthCookie();

    if (auth) {
      console.log(`User logged out: ${auth.username} (${auth.userId})`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
