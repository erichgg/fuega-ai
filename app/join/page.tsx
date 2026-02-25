"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Flame, ArrowRight, Users } from "lucide-react";
import { FlameLogo } from "@/components/fuega/flame-logo";
import { useAuth } from "@/lib/contexts/auth-context";

function JoinContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const ref = searchParams.get("ref");

  // Set referral cookie on mount
  React.useEffect(() => {
    if (ref && ref.length > 0) {
      // Set cookie: 30 days. The actual referral is validated server-side
      // during registration by reading this cookie.
      document.cookie = `fuega_ref=${encodeURIComponent(ref)}; path=/; max-age=2592000; SameSite=Lax; Secure`;
    }
  }, [ref]);

  // Already logged in
  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void px-4">
        <div className="w-full max-w-md text-center">
          <FlameLogo size="lg" />
          <div className="terminal-card mt-8 p-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Users className="w-5 h-5 text-teal" />
              <p className="text-sm text-foreground font-semibold">
                You already have an account
              </p>
            </div>
            <p className="text-xs text-ash mb-6">
              You&apos;re already part of the{" "}
              <span className="text-flame-400 font-semibold">fuega</span>{" "}
              community.
            </p>
            <Link
              href="/home"
              className="inline-flex items-center gap-2 bg-lava-hot text-black px-6 py-2 text-sm font-medium uppercase tracking-wider hover:shadow-[0_0_20px_var(--lava-glow)] transition-all"
            >
              Go to Hearth
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-void px-4">
      <div className="w-full max-w-md text-center">
        <FlameLogo size="lg" />

        <div className="terminal-card mt-8 overflow-hidden">
          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-lava-hot/20">
            <span className="w-3 h-3 bg-ember" />
            <span className="w-3 h-3 bg-lava-mid" />
            <span className="w-3 h-3 bg-ash/40" />
            <span className="text-xs text-ash ml-2">
              <span className="text-flame-400 font-semibold">fuega</span>.ai &mdash; invite
            </span>
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Flame className="w-6 h-6 text-lava-hot" />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2 glow-text-subtle">
              You&apos;ve been invited to{" "}
              <span className="text-flame-400 font-semibold">fuega</span>
              <span className="text-ash">.ai</span>
            </h1>

            <p className="text-sm text-ash mb-6">
              Open source social media with campfire-governed discussions and
              transparent AI moderation. No ads, no tracking, no corporate
              influence.
            </p>

            <div className="space-y-3">
              <Link
                href="/signup"
                className="flex items-center justify-center gap-2 w-full bg-lava-hot text-black px-6 py-3 text-sm font-medium uppercase tracking-wider hover:shadow-[0_0_20px_var(--lava-glow)] transition-all"
              >
                <Flame className="w-4 h-4" />
                Create Account
              </Link>

              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full border border-lava-hot/20 bg-transparent text-ash px-6 py-3 text-sm font-medium hover:border-lava-hot/40 hover:text-foreground transition-all"
              >
                Already have an account? Log in
              </Link>
            </div>

            <div className="mt-6 pt-4 border-t border-lava-hot/10">
              <div className="flex flex-col gap-2 text-xs text-smoke">
                <div className="flex items-center gap-2">
                  <span className="text-teal">&#x2713;</span>
                  <span>Anonymous by default — no ID, no phone required</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-teal">&#x2713;</span>
                  <span>Campfires set their own rules via democratic governance</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-teal">&#x2713;</span>
                  <span>Transparent AI moderation — every decision is logged publicly</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-teal">&#x2713;</span>
                  <span>Tip-supported — no ads, no data selling, ever</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-smoke">
          <Link href="/" className="text-ash hover:text-lava-hot transition-colors">
            Learn more about <span className="text-flame-400 font-semibold">fuega</span>
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinContent />
    </Suspense>
  );
}
