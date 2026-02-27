import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PublicNav } from "@/components/fuega/public-nav";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for fuega.ai — how we protect your data.",
  openGraph: {
    title: "Privacy Policy — fuega.ai",
    description: "How fuega.ai protects your data and respects your privacy.",
  },
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-smoke">
          Last updated: February 2026
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-ash">
          <section>
            <h2 className="text-lg font-semibold text-foreground">The Short Version</h2>
            <div className="mt-3 rounded-lg border border-flame-500/20 bg-flame-500/5 p-4">
              <ul className="space-y-2">
                <li>We <strong className="text-foreground">never store raw IP addresses</strong> — they&apos;re SHA-256 hashed with rotating salts</li>
                <li>Hashed IPs are <strong className="text-foreground">deleted within 30 days</strong></li>
                <li>We <strong className="text-foreground">never sell your data</strong> to anyone, ever</li>
                <li>We don&apos;t run ads or use trackers</li>
                <li>All AI moderation decisions are <strong className="text-foreground">logged publicly</strong></li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">What We Collect</h2>
            <p className="mt-2">
              <strong className="text-foreground">Account info:</strong> Username, email address, and a
              hashed password. Your email is used for account recovery only.
            </p>
            <p className="mt-2">
              <strong className="text-foreground">Content:</strong> Posts, comments, votes, and chat messages
              you create. This is stored to make the platform work.
            </p>
            <p className="mt-2">
              <strong className="text-foreground">IP hashes:</strong> We hash your IP address using SHA-256
              with a rotating salt for abuse prevention. The hash is deleted after 30 days.
              We never store the raw IP.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">What We Don&apos;t Collect</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>No tracking cookies or analytics trackers</li>
              <li>No device fingerprinting</li>
              <li>No location data</li>
              <li>No browsing history</li>
              <li>No third-party advertising data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">AI Moderation</h2>
            <p className="mt-2">
              Your posts and comments are processed by AI for moderation. The AI
              evaluates content against the{" "}
              <Link href="/principles" className="text-flame-400 hover:underline">
                Principles
              </Link>{" "}
              and community governance settings. All moderation decisions — including
              the AI&apos;s reasoning — are logged in the public mod log.
            </p>
            <p className="mt-2">
              We use the Anthropic Claude API for moderation. Content sent to the AI
              is not used to train AI models.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Data Retention</h2>
            <p className="mt-2">
              Account data is kept as long as your account exists. When you delete your
              account, your data is soft-deleted (removed from public view) and
              permanently purged within 30 days.
            </p>
            <p className="mt-2">
              IP hashes are automatically deleted after 30 days. The salt used for
              hashing is rotated monthly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Your Rights</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Delete your account and all associated data at any time</li>
              <li>Appeal any AI moderation decision</li>
              <li>View the public mod log to see how content is moderated</li>
              <li>Request a copy of your data by contacting us</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Changes</h2>
            <p className="mt-2">
              If we change this policy, we&apos;ll announce it on the platform.
              We&apos;ll never quietly weaken your privacy protections.
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
