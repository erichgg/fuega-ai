"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface LinkPreviewProps {
  url: string;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  siteName?: string | null;
  className?: string;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function LinkPreview({
  url,
  title,
  description,
  image,
  siteName,
  className,
}: LinkPreviewProps) {
  const domain = getDomain(url);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn("flex rounded-md border border-charcoal bg-charcoal/30 overflow-hidden hover:border-lava-hot/20 transition-colors cursor-pointer", className)}
    >
      {/* Image / Favicon */}
      <div className="relative w-32 min-h-[80px] flex-shrink-0 bg-charcoal/50 flex items-center justify-center">
        {image ? (
          <Image
            src={image}
            alt={title || domain}
            fill
            unoptimized
            className="object-cover rounded-l-md"
            sizes="128px"
          />
        ) : (
          <Image
            src={faviconUrl}
            alt={domain}
            width={32}
            height={32}
            unoptimized
            className="opacity-60"
          />
        )}
      </div>

      {/* Text content */}
      <div className="flex flex-col justify-center px-3 py-2 min-w-0 flex-1">
        {title ? (
          <>
            <span className="text-sm font-medium text-foreground line-clamp-1">
              {title}
            </span>
            {description && (
              <span className="text-xs text-ash line-clamp-2 mt-0.5">
                {description}
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-ash line-clamp-1 break-all">{url}</span>
        )}
        <span className="text-[10px] text-smoke font-mono mt-1">
          {"\u2197"} {domain}
        </span>
      </div>
    </div>
  );
}
