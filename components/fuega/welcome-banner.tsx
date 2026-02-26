"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Flame, Zap, Shield, Vote } from "lucide-react";
import { cn } from "@/lib/utils";

export function WelcomeBanner({ className }: { className?: string }) {
  const [dismissed, setDismissed] = useState(true); // Start hidden to avoid flash

  useEffect(() => {
    const was = localStorage.getItem("fuega_welcome_dismissed");
    if (!was) setDismissed(false);
  }, []);

  function dismiss() {
    setDismissed(true);
    localStorage.setItem("fuega_welcome_dismissed", "1");
  }

  if (dismissed) return null;

  return (
    <div className={cn(
      "relative rounded-lg border border-lava-hot/20 bg-gradient-to-r from-lava-hot/5 via-coal to-coal p-4",
      className
    )}>
      <button onClick={dismiss} className="absolute top-2 right-2 p-1 text-smoke hover:text-ash transition-colors" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
      <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Flame className="h-4 w-4 text-lava-hot" />
        Welcome to fuega.ai
      </h2>
      <p className="mt-1 text-xs text-ash leading-relaxed">
        AI-moderated communities where you set the rules through democratic governance.
      </p>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="flex items-start gap-2 text-xs text-smoke">
          <Zap className="h-3.5 w-3.5 text-flame-400 shrink-0 mt-0.5" />
          <span><span className="text-ash font-medium">Spark & Douse</span> — vote on content with fire-themed voting</span>
        </div>
        <div className="flex items-start gap-2 text-xs text-smoke">
          <Shield className="h-3.5 w-3.5 text-flame-400 shrink-0 mt-0.5" />
          <span><span className="text-ash font-medium">AI Moderation</span> — transparent, logged, community-controlled</span>
        </div>
        <div className="flex items-start gap-2 text-xs text-smoke">
          <Vote className="h-3.5 w-3.5 text-flame-400 shrink-0 mt-0.5" />
          <span><span className="text-ash font-medium">Governance</span> — every campfire governs itself democratically</span>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Link href="/how-it-works" className="text-[11px] text-flame-400 hover:underline font-mono">Learn more →</Link>
        <Link href="/campfires" className="text-[11px] text-flame-400 hover:underline font-mono">Browse campfires →</Link>
      </div>
    </div>
  );
}
