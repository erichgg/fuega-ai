"use client";

import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoEmbedProps {
  url: string;
  className?: string;
  compact?: boolean;
}

interface VideoInfo {
  provider: "youtube" | "vimeo" | "unknown";
  embedUrl: string;
  thumbnailUrl?: string;
}

function parseVideoUrl(url: string): VideoInfo | null {
  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch && ytMatch[1]) {
    return {
      provider: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`,
      thumbnailUrl: `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`,
    };
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      provider: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  return null;
}

export function isVideoUrl(url: string): boolean {
  return parseVideoUrl(url) !== null;
}

export function VideoEmbed({ url, className, compact = false }: VideoEmbedProps) {
  const info = parseVideoUrl(url);
  if (!info) return null;

  if (compact && info.thumbnailUrl) {
    return (
      <div className={cn("relative group cursor-pointer overflow-hidden rounded", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={info.thumbnailUrl}
          alt="Video thumbnail"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/30 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-flame-500/90 shadow-lg">
            <Play className="h-5 w-5 text-white ml-0.5" />
          </div>
        </div>
        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white font-mono">
          {info.provider}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full overflow-hidden rounded-md border border-charcoal", className)}>
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <iframe
          src={info.embedUrl}
          title="Video embed"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
          loading="lazy"
        />
      </div>
    </div>
  );
}
