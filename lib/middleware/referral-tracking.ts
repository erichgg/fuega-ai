import { cookies } from "next/headers";
import { processReferral } from "@/lib/services/referrals.service";

const REFERRAL_COOKIE_NAME = "fuega_ref";
const REFERRAL_COOKIE_MAX_AGE = 2592000; // 30 days in seconds

// ─── Set referral cookie (on GET /join?ref=xxx) ──────────────

export async function setReferralCookie(referralCode: string): Promise<void> {
  // Validate format: 8 alphanumeric chars
  if (!/^[a-f0-9]{8}$/i.test(referralCode)) {
    return; // Silently ignore invalid codes
  }

  const cookieStore = await cookies();
  cookieStore.set(REFERRAL_COOKIE_NAME, referralCode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: REFERRAL_COOKIE_MAX_AGE,
    path: "/",
  });
}

// ─── Read and clear referral cookie (on signup) ──────────────

export async function readAndClearReferralCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(REFERRAL_COOKIE_NAME);
  if (!cookie?.value) return null;

  // Clear the cookie
  cookieStore.set(REFERRAL_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return cookie.value;
}

// ─── Handle referral on signup ───────────────────────────────

export async function handleReferralOnSignup(
  newUserId: string,
  newUserIpHash: string
): Promise<void> {
  const referralCode = await readAndClearReferralCookie();
  if (!referralCode) return;

  // Process referral — all failures are silent (user still signs up)
  const result = await processReferral({
    referralCode,
    newUserId,
    newUserIpHash,
  });

  if (result.processed) {
    console.log(`[referral-tracking] Referral processed for user ${newUserId} via code ${referralCode}`);
  } else {
    console.log(`[referral-tracking] Referral skipped for user ${newUserId}: ${result.reason}`);
  }
}
