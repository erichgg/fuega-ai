import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { getReferralHistory } from "@/lib/services/referrals.service";
import { ServiceError } from "@/lib/services/posts.service";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const history = await getReferralHistory(user.userId);

    return NextResponse.json({ referrals: history });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("Referral history error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
