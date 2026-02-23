import Link from "next/link";
import { FlameLogo } from "@/components/fuega/flame-logo";

export default function NewPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <FlameLogo size="md" />
        <div className="terminal-card mt-8 p-8">
          <h1 className="text-2xl font-bold text-foreground glow-text-subtle mb-3">
            <span className="text-lava-hot font-bold">$ </span>
            new
          </h1>
          <p className="text-sm text-ash mb-6">
            New posts feed coming soon.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Link
              href="/home"
              className="text-xs text-flame-400 hover:text-flame-400/80 transition-colors"
            >
              View main feed →
            </Link>
            <Link href="/" className="text-xs text-smoke hover:text-flame-400 transition-colors">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
