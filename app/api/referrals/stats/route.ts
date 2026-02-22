import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { getReferralStats } from "@/lib/services/referrals.service";
import { ServiceError } from "@/lib/services/posts.service";

export async function GET(req: Request) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const stats = await getReferralStats(user.userId);

    return NextResponse.json(stats);
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("Referral stats error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
