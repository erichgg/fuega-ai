import { createHash } from "crypto";

function getIpSalt(): string {
  return process.env.IP_SALT ?? "";
}

/**
 * Hash an IP address using SHA-256 + rotating salt.
 * NEVER store raw IPs — this is a security requirement.
 */
export function hashIp(ip: string): string {
  const salt = getIpSalt();
  if (!salt) {
    throw new Error("IP_SALT is not configured");
  }
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/**
 * Extract client IP from request headers.
 * Checks standard proxy headers (Cloudflare, Railway, generic).
 */
export function getClientIp(req: Request): string {
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "0.0.0.0";

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "0.0.0.0";
}
