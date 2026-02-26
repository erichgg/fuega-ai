import Link from "next/link";
import { FlameLogo } from "@/components/fuega/flame-logo";

export function PublicNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-charcoal bg-void/95 backdrop-blur supports-[backdrop-filter]:bg-void/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 2xl:px-8">
        <Link href="/">
          <FlameLogo size="sm" />
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-ash transition-colors hover:text-foreground"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 bg-flame-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-flame-600"
          >
            Sign up
          </Link>
        </div>
      </div>
    </nav>
  );
}
