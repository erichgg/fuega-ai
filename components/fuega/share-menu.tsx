"use client";

import { useState, useRef, useEffect } from "react";
import { Share2, Link2, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareMenuProps {
  url: string;
  title: string;
  className?: string;
}

export function ShareMenu({ url, title, className }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1500);
    } catch {
      // clipboard API may fail in insecure contexts
    }
  }

  function handleShareX() {
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setOpen(false);
  }

  function handleShareReddit() {
    window.open(
      `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setOpen(false);
  }

  return (
    <div ref={menuRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-ash transition-colors hover:bg-charcoal/50 hover:text-foreground text-xs"
      >
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">Share</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-48 py-1 bg-coal/90 backdrop-blur-md border border-lava-hot/20 shadow-lg shadow-void/50 z-50 rounded-md">
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full px-3 py-2 text-sm text-ash hover:text-foreground hover:bg-charcoal/50 cursor-pointer flex items-center gap-2 font-mono transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" />
                Copy Link
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleShareX}
            className="w-full px-3 py-2 text-sm text-ash hover:text-foreground hover:bg-charcoal/50 cursor-pointer flex items-center gap-2 font-mono transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Share on X
          </button>
          <button
            type="button"
            onClick={handleShareReddit}
            className="w-full px-3 py-2 text-sm text-ash hover:text-foreground hover:bg-charcoal/50 cursor-pointer flex items-center gap-2 font-mono transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Share on Reddit
          </button>
        </div>
      )}
    </div>
  );
}
