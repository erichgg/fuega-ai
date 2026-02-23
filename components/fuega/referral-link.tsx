"use client";

import * as React from "react";
import { Copy, Check, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReferralLinkProps {
  referralLink: string;
  className?: string;
}

export function ReferralLink({ referralLink, className }: ReferralLinkProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = referralLink;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [referralLink]);

  return (
    <div className={cn("terminal-card p-4", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="w-4 h-4 text-lava-hot" />
        <p className="text-xs text-ash uppercase tracking-wider font-semibold">
          Your Referral Link
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 bg-charcoal/50 border border-lava-hot/20 px-3 py-2">
          <p className="text-sm text-foreground truncate font-mono">
            {referralLink}
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "shrink-0 px-4 py-2 text-sm font-medium uppercase tracking-wider transition-all",
            copied
              ? "bg-teal text-black"
              : "bg-lava-hot text-black hover:shadow-[0_0_20px_var(--lava-glow)]",
          )}
        >
          {copied ? (
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              Copied!
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Copy className="w-4 h-4" />
              Copy
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
