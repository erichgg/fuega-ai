import { NextResponse } from "next/server";
import { logger } from "@/lib/monitoring/logger";

/**
 * POST /api/csp-report
 * Receives Content Security Policy violation reports from browsers.
 * This endpoint is referenced in the CSP report-uri directive.
 */
export async function POST(req: Request) {
  try {
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
