import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { checkUploadRateLimit } from "@/lib/auth/rate-limit";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"] as const;

const ALLOWED_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
] as const;

type AllowedType = (typeof ALLOWED_TYPES)[number];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

const EXT_MAP: Record<AllowedType, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};

function isAllowedType(type: string): type is AllowedType {
  return (ALLOWED_TYPES as readonly string[]).includes(type);
}

function isVideoType(type: string): boolean {
  return (ALLOWED_VIDEO_TYPES as readonly string[]).includes(type);
}

/**
 * POST /api/upload
 * Upload an image or video file. Auth required.
 * Accepts multipart/form-data with a "file" field.
 */
export async function POST(req: Request) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const rateLimit = await checkUploadRateLimit(user.userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many uploads. Try again later.",
          code: "RATE_LIMITED",
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    // Validate MIME type
    if (!isAllowedType(file.type)) {
      return NextResponse.json(
        {
          error: `File type "${file.type}" is not allowed. Accepted: JPEG, PNG, GIF, WebP, MP4, WebM`,
          code: "INVALID_FILE_TYPE",
        },
        { status: 400 },
      );
    }

    // Validate file size
    const maxSize = isVideoType(file.type) ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    const maxLabel = isVideoType(file.type) ? "50MB" : "10MB";

    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${maxLabel}`,
          code: "FILE_TOO_LARGE",
        },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "File is empty", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    // Generate a safe UUID filename
    const ext = EXT_MAP[file.type];
    const uuid = randomUUID();
    const filename = `${uuid}${ext}`;

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = join(uploadsDir, filename);
    await writeFile(filePath, buffer);

    const mediaType = isVideoType(file.type) ? "video" : "image";

    return NextResponse.json(
      {
        url: `/uploads/${filename}`,
        type: mediaType,
        filename: file.name,
        size: file.size,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
