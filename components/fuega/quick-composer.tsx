"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/contexts/auth-context";
import { UserAvatar } from "@/components/fuega/user-avatar";
import { ImageIcon, Link2, Type } from "lucide-react";

interface QuickComposerProps {
  campfire?: string; // Pre-fill campfire if on a campfire page
  className?: string;
}

export function QuickComposer({ campfire, className }: QuickComposerProps) {
  const { user } = useAuth();
  if (!user) return null;

  const baseParams = campfire ? `campfire=${encodeURIComponent(campfire)}` : "";
  const submitHref = campfire ? `/submit?${baseParams}` : "/submit";
  const typeHref = (type: string) =>
    `/submit?${baseParams ? `${baseParams}&` : ""}type=${type}`;

  return (
    <div className={cn("rounded-lg border border-charcoal bg-coal p-3", className)}>
      <div className="flex items-center gap-3">
        <UserAvatar username={user.username} size="sm" />
        <Link
          href={submitHref}
          className="flex-1 rounded-md border border-charcoal bg-charcoal/30 px-3 py-2 text-sm text-smoke hover:border-lava-hot/30 hover:text-ash transition-colors cursor-text"
        >
          What&apos;s on your mind?
        </Link>
      </div>
      <div className="mt-2 flex items-center gap-1 border-t border-charcoal/50 pt-2">
        <Link href={typeHref("text")} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-smoke hover:bg-charcoal/50 hover:text-ash transition-colors">
          <Type className="h-3.5 w-3.5" /> Text
        </Link>
        <Link href={typeHref("link")} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-smoke hover:bg-charcoal/50 hover:text-ash transition-colors">
          <Link2 className="h-3.5 w-3.5" /> Link
        </Link>
        <Link href={typeHref("image")} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-smoke hover:bg-charcoal/50 hover:text-ash transition-colors">
          <ImageIcon className="h-3.5 w-3.5" /> Image
        </Link>
      </div>
    </div>
  );
}
