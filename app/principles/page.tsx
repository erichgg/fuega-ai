import type { Metadata } from "next";
import Link from "next/link";
import { FlameLogo } from "@/components/fuega/flame-logo";

export const metadata: Metadata = {
  title: "Principles",
  description:
    "The platform-level Principles that apply to every campfire on fuega.ai — immutable, non-negotiable, enforced in every Tender.",
  openGraph: {
    title: "Principles — fuega.ai",
    description:
      "The platform-level Principles that apply to every campfire on fuega.ai.",
  },
};

export default function PrinciplesPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <FlameLogo size="md" />
        <div className="terminal-card mt-8 p-8">
          <h1 className="text-2xl font-bold text-foreground glow-text-subtle mb-3">
            <span className="text-lava-hot font-bold">$ </span>
            principles
          </h1>
          <p className="text-sm text-ash mb-6">
            The Principles are the platform-level rules that apply to every
            campfire — immutable and enforced in every Tender. Full text coming
            soon.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Link
              href="/how-it-works"
              className="text-xs text-flame-400 hover:text-flame-400/80 transition-colors"
            >
              How governance works →
            </Link>
            <Link
              href="/"
              className="text-xs text-smoke hover:text-flame-400 transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
