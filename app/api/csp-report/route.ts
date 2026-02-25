import { NextResponse } from "next/server";
import { logger } from "@/lib/monitoring/logger";
import { hashIp, getClientIp } from "@/lib/auth/ip-hash";
import { checkCspReportRateLimit } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/csp-report
 * Receives Content Security Policy violation reports from browsers.
 * This endpoint is referenced in the CSP report-uri directive.
 */
export async function POST(req: Request) {
  try {
    const ipHash = hashIp(getClientIp(req));
    const rateLimit = await checkCspReportRateLimit(ipHash);
    if (!rateLimit.allowed) {
      return new NextResponse(null, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (body) {
      const report = body["csp-report"] ?? body;
      logger.warn("CSP violation", {
        blockedUri: report["blocked-uri"],
        violatedDirective: report["violated-directive"],
        documentUri: report["document-uri"],
        originalPolicy: report["original-policy"],
      });
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
