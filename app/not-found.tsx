import Link from "next/link";
import { Flame, ArrowLeft } from "lucide-react";
import { FlameLogo } from "@/components/fuega/flame-logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <FlameLogo size="lg" />
      <div className="mt-8 text-center">
        <h1 className="text-6xl font-bold text-ash-300">404</h1>
        <p className="mt-2 text-lg text-ash-400">Page not found</p>
        <p className="mt-1 text-sm text-ash-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-ash-700 px-6 py-2.5 text-sm font-medium text-ash-300 transition-colors hover:border-ash-600 hover:text-ash-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Go home
          </Link>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 rounded-lg bg-flame-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-flame-600"
          >
            <Flame className="h-4 w-4" />
            Browse feed
          </Link>
        </div>
      </div>
    </div>
  );
}
