"use client";

import * as React from "react";
import { Share2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReferralShareProps {
  referralLink: string;
  className?: string;
}

const SHARE_MESSAGE =
  "Join me on fuega.ai — campfire-governed discussions with transparent AI moderation";

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function RedditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export function ReferralShare({ referralLink, className }: ReferralShareProps) {
  const [discordCopied, setDiscordCopied] = React.useState(false);

  const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(SHARE_MESSAGE)}&url=${encodeURIComponent(referralLink)}`;
  const redditUrl = `https://reddit.com/submit?url=${encodeURIComponent(referralLink)}&title=${encodeURIComponent(SHARE_MESSAGE)}`;

  const handleDiscordShare = React.useCallback(async () => {
    const discordMessage = `${SHARE_MESSAGE}\n${referralLink}`;
    try {
      await navigator.clipboard.writeText(discordMessage);
      setDiscordCopied(true);
      setTimeout(() => setDiscordCopied(false), 2000);
    } catch {
      // silent fail
    }
  }, [referralLink]);

  const handleGenericShare = React.useCallback(async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Join fuega.ai",
          text: SHARE_MESSAGE,
          url: referralLink,
        });
        return;
      } catch {
        // User cancelled or not supported — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(referralLink);
    } catch {
      // silent fail
    }
  }, [referralLink]);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <p className="text-xs text-ash uppercase tracking-wider font-semibold mr-1">
        Share:
      </p>

      {/* Twitter/X */}
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-lava-hot/20 bg-charcoal/50 text-ash hover:text-foreground hover:border-lava-hot/40 transition-all"
      >
        <TwitterIcon className="w-3.5 h-3.5" />
        X
      </a>

      {/* Reddit */}
      <a
        href={redditUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-lava-hot/20 bg-charcoal/50 text-ash hover:text-foreground hover:border-lava-hot/40 transition-all"
      >
        <RedditIcon className="w-3.5 h-3.5" />
        Reddit
      </a>

      {/* Discord */}
      <button
        type="button"
        onClick={handleDiscordShare}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-lava-hot/20 bg-charcoal/50 text-ash hover:text-foreground hover:border-lava-hot/40 transition-all"
      >
        <DiscordIcon className="w-3.5 h-3.5" />
        {discordCopied ? (
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3 text-teal" />
            Copied
          </span>
        ) : (
          "Discord"
        )}
      </button>

      {/* Generic share */}
      <button
        type="button"
        onClick={handleGenericShare}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-lava-hot/20 bg-charcoal/50 text-ash hover:text-foreground hover:border-lava-hot/40 transition-all"
      >
        <Share2 className="w-3.5 h-3.5" />
        Share
      </button>
    </div>
  );
}
