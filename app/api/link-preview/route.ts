import { NextResponse } from "next/server";
import { z } from "zod";
import { hashIp, getClientIp } from "@/lib/auth/ip-hash";
import { checkReadRateLimit } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  url: z.string().url(),
});

/**
 * Block SSRF attempts by rejecting private/internal URLs.
 * Checks protocol, localhost variants, and private IP ranges.
 */
function isPrivateUrl(url: string): boolean {
  const parsed = new URL(url);
  const hostname = parsed.hostname;

  // Only allow http(s) protocols
  if (!["http:", "https:"].includes(parsed.protocol)) return true;

  // Block localhost variants
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return true;

  // Block IPv6 loopback/private
  if (hostname.startsWith("[")) {
    const inner = hostname.slice(1, -1).toLowerCase();
    if (inner === "::1" || inner.startsWith("fc") || inner.startsWith("fd") || inner.startsWith("fe80")) return true;
  }

  // Block private IPv4 ranges
  const parts = hostname.split(".");
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    const first = parseInt(parts[0] ?? "0", 10);
    const second = parseInt(parts[1] ?? "0", 10);

    // 10.0.0.0/8
    if (first === 10) return true;
    // 172.16.0.0/12
    if (first === 172 && second >= 16 && second <= 31) return true;
    // 192.168.0.0/16
    if (first === 192 && second === 168) return true;
    // 169.254.0.0/16 (link-local)
    if (first === 169 && second === 254) return true;
    // 127.0.0.0/8 (full loopback range)
    if (first === 127) return true;
    // 0.0.0.0
    if (first === 0) return true;
  }

  return false;
}

function extractMetaContent(html: string, property: string): string | null {
  // Handle both property="og:X" content="Y" and content="Y" property="og:X" orders
  const patterns = [
    new RegExp(
      `<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["'][^>]*/?>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["'][^>]*/?>`,
      "i"
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function extractNameContent(html: string, name: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["'][^>]*/?>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["'][^>]*/?>`,
      "i"
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1]?.trim() || null;
}

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const ipHash = hashIp(ip);

    const rateLimitResult = await checkReadRateLimit(ipHash);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({ url: searchParams.get("url") });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid URL", code: "INVALID_URL" },
        { status: 400 }
      );
    }

    const targetUrl = parsed.data.url;

    // SSRF protection: block private/internal URLs
    if (isPrivateUrl(targetUrl)) {
      return NextResponse.json(
        { error: "URL not allowed", code: "BLOCKED_URL" },
        { status: 400 }
      );
    }

    const emptyResult = {
      title: null,
      description: null,
      image: null,
      siteName: null,
      url: targetUrl,
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "fuega-link-preview/1.0",
          Accept: "text/html",
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json(emptyResult, { status: 200 });
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) {
        return NextResponse.json(emptyResult, { status: 200 });
      }

      const html = await response.text();

      const ogTitle = extractMetaContent(html, "og:title");
      const ogDescription = extractMetaContent(html, "og:description");
      const ogImage = extractMetaContent(html, "og:image");
      const ogSiteName = extractMetaContent(html, "og:site_name");

      const title = ogTitle || extractTitle(html);
      const description =
        ogDescription || extractNameContent(html, "description");

      const result = {
        title: title || null,
        description: description || null,
        image: ogImage || null,
        siteName: ogSiteName || null,
        url: targetUrl,
      };

      return NextResponse.json(result, {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch {
      // Fetch failed (timeout, network error, etc.) -- return partial result
      return NextResponse.json(emptyResult, { status: 200 });
    }
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
