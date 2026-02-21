import { NextResponse } from "next/server";
import { signupSchema } from "@/lib/auth/validation";
import { hashPassword } from "@/lib/auth/password";
import { signToken, setAuthCookie } from "@/lib/auth/jwt";
import { hashIp, getClientIp } from "@/lib/auth/ip-hash";
import { checkSignupRateLimit } from "@/lib/auth/rate-limit";
import { queryOne } from "@/lib/db";

const FOUNDER_BADGE_LIMIT = 5000;

export async function POST(req: Request) {
  try {
    // Parse and validate input
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Invalid input";
      return NextResponse.json(
        { error: firstError, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { username, password, email } = parsed.data;

    // Rate limit by IP hash
    const ip = getClientIp(req);
    const ipHash = hashIp(ip);
    const rateLimit = await checkSignupRateLimit(ipHash);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many signup attempts. Try again later.",
          code: "RATE_LIMITED",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    // Check if username already taken
    const existing = await queryOne(
      "SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND deleted_at IS NULL",
      [username]
    );
    if (existing) {
      return NextResponse.json(
        { error: "Username already taken", code: "USERNAME_TAKEN" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Determine founder badge number
    const countResult = await queryOne<{ count: string }>(
      "SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL AND id != '00000000-0000-0000-0000-000000000001'"
    );
    const userCount = parseInt(countResult?.count ?? "0", 10);
    const founderBadgeNumber =
      userCount < FOUNDER_BADGE_LIMIT ? userCount + 1 : null;

    // Insert user
    const user = await queryOne<{
      id: string;
      username: string;
      founder_badge_number: number | null;
      created_at: string;
    }>(
      `INSERT INTO users (username, password_hash, ip_address_hash, ip_last_seen, founder_badge_number)
       VALUES ($1, $2, $3, NOW(), $4)
       RETURNING id, username, founder_badge_number, created_at`,
      [username, passwordHash, ipHash, founderBadgeNumber]
    );

    if (!user) {
      return NextResponse.json(
        { error: "Failed to create user", code: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }

    // Generate JWT and set cookie
    const token = signToken({ userId: user.id, username: user.username });
    await setAuthCookie(token);

    return NextResponse.json(
      {
        user: {
          id: user.id,
          username: user.username,
          founderBadgeNumber: user.founder_badge_number,
          createdAt: user.created_at,
        },
        token,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
