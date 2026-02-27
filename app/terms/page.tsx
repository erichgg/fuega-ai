import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PublicNav } from "@/components/fuega/public-nav";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for fuega.ai — the AI-moderated discussion platform.",
  openGraph: {
    title: "Terms of Service — fuega.ai",
    description: "Terms of Service for fuega.ai.",
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-void">
      <PublicNav />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-smoke transition-colors hover:text-ash"
        >
          <ArrowLeft className="h-3 w-3" />
          cd /
        </Link>
        <h1 className="mt-6 text-3xl font-bold text-foreground sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-smoke">
          Last updated: February 2026
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-ash">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance</h2>
            <p className="mt-2">
              By using <span className="text-flame-400 font-semibold">fuega</span>.ai, you agree to these terms.
              If you don&apos;t agree, don&apos;t use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Your Account</h2>
            <p className="mt-2">
              You&apos;re responsible for your account and everything posted under it.
              Keep your password secure. You must be at least 13 years old to use fuega.ai.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Content</h2>
            <p className="mt-2">
              You own the content you post. By posting, you grant fuega.ai a license to
              display it on the platform. You can delete your content at any time
              (soft delete — it&apos;s removed from public view).
            </p>
            <p className="mt-2">
              All content is subject to AI moderation governed by the{" "}
              <Link href="/principles" className="text-flame-400 hover:underline">
                Principles
              </Link>{" "}
              and each community&apos;s governance settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Prohibited Conduct</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Harassment, threats, or incitement of violence</li>
              <li>Spam, bots, or coordinated manipulation</li>
              <li>Impersonation of other users or public figures</li>
              <li>Sharing illegal content or content exploiting minors</li>
              <li>Attempting to circumvent AI moderation or governance systems</li>
              <li>Vote manipulation or artificial engagement</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. AI Moderation</h2>
            <p className="mt-2">
              Content is moderated by AI systems configured through community governance.
              All moderation decisions are logged publicly. You have the right to appeal
              any moderation action.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Privacy</h2>
            <p className="mt-2">
              See our{" "}
              <Link href="/privacy" className="text-flame-400 hover:underline">
                Privacy Policy
              </Link>{" "}
              for details on how we handle your data. Short version: we hash IPs,
              delete identifying data within 30 days, and never sell your information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Termination</h2>
            <p className="mt-2">
              We may suspend or terminate accounts that violate these terms or the
              Principles. You can delete your account at any time through settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Changes</h2>
            <p className="mt-2">
              We may update these terms. Significant changes will be announced on the
              platform. Continued use after changes means you accept the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Disclaimer</h2>
            <p className="mt-2">
              fuega.ai is provided &ldquo;as is&rdquo; without warranties.
              We&apos;re not liable for user-generated content or AI moderation decisions.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-charcoal pt-6 text-center">
          <Link
            href="/"
            className="text-sm text-smoke hover:text-flame-400 transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
