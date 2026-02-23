import type { Metadata } from "next";
import Link from "next/link";
import { FlameLogo } from "@/components/fuega/flame-logo";

export const metadata: Metadata = {
  title: "Supporters",
  description:
    "Support fuega.ai and help keep the platform free, open, and ad-free.",
  openGraph: {
    title: "Supporters — fuega.ai",
    description:
      "Support fuega.ai and help keep the platform free, open, and ad-free.",
  },
};

export default function SupportersPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <FlameLogo size="md" />
        <div className="terminal-card mt-8 p-8">
          <h1 className="text-2xl font-bold text-foreground glow-text-subtle mb-3">
            <span className="text-lava-hot font-bold">$ </span>
            supporters
          </h1>
          <p className="text-sm text-ash mb-6">
            Supporters keep{" "}
            <span className="text-flame-400 font-semibold">fuega</span>
            <span>.ai</span> ad-free and independent. The supporters
            page is coming soon.
          </p>
          <Link
            href="/"
            className="text-xs text-smoke hover:text-flame-400 transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
