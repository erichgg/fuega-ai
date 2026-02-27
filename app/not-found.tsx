import Link from "next/link";
import { Flame, ArrowLeft, Search } from "lucide-react";
import { FlameLogo } from "@/components/fuega/flame-logo";
import { NotFoundIllustration } from "@/components/fuega/illustrations";

export const metadata = {
  title: "Page Not Found - fuega",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-void px-4">
      {/* Decorative background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] h-[300px] rounded-full bg-flame-500/5 blur-[100px]" />
      </div>

      <NotFoundIllustration />
      <div className="relative mt-4 text-center">
        <h1 className="text-7xl font-bold font-mono">
          <span className="text-flame-400">4</span>
          <span className="text-ash">0</span>
          <span className="text-flame-400">4</span>
        </h1>
        <p className="mt-3 text-lg font-medium text-ash">
          This spark has gone out
        </p>
        <p className="mt-1 text-sm text-smoke">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-charcoal px-5 py-2.5 text-sm font-medium text-ash transition-colors hover:border-lava-hot/30 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Go home
          </Link>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 rounded-lg bg-flame-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-flame-600"
          >
            <Flame className="h-4 w-4" />
            Browse feed
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-lg border border-charcoal px-5 py-2.5 text-sm font-medium text-ash transition-colors hover:border-lava-hot/30 hover:text-foreground"
          >
            <Search className="h-4 w-4" />
            Search
          </Link>
        </div>
      </div>
    </div>
  );
}
