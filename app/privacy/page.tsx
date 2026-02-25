import type { Metadata } from "next";
import Link from "next/link";

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
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-ash-500">
          Last updated: February 2026
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-ash-300">
          <section>
            <h2 className="text-lg font-semibold text-ash-100">The Short Version</h2>
            <div className="mt-3 rounded-lg border border-flame-500/20 bg-flame-500/5 p-4">
              <ul className="space-y-2">
                <li>We <strong className="text-ash-100">never store raw IP addresses</strong> — they&apos;re SHA-256 hashed with rotating salts</li>
                <li>Hashed IPs are <strong className="text-ash-100">deleted within 30 days</strong></li>
                <li>We <strong className="text-ash-100">never sell your data</strong> to anyone, ever</li>
                <li>We don&apos;t run ads or use trackers</li>
                <li>All AI moderation decisions are <strong className="text-ash-100">logged publicly</strong></li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ash-100">What We Collect</h2>
            <p className="mt-2">
              <strong className="text-ash-200">Account info:</strong> Username, email address, and a
              hashed password. Your email is used for account recovery only.
            </p>
            <p className="mt-2">
              <strong className="text-ash-200">Content:</strong> Posts, comments, votes, and chat messages
              you create. This is stored to make the platform work.
            </p>
            <p className="mt-2">
              <strong className="text-ash-200">IP hashes:</strong> We hash your IP address using SHA-256
              with a rotating salt for abuse prevention. The hash is deleted after 30 days.
              We never store the raw IP.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ash-100">What We Don&apos;t Collect</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>No tracking cookies or analytics trackers</li>
              <li>No device fingerprinting</li>
              <li>No location data</li>
              <li>No browsing history</li>
              <li>No third-party advertising data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ash-100">AI Moderation</h2>
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
            <h2 className="text-lg font-semibold text-ash-100">Data Retention</h2>
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
            <h2 className="text-lg font-semibold text-ash-100">Your Rights</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Delete your account and all associated data at any time</li>
              <li>Appeal any AI moderation decision</li>
              <li>View the public mod log to see how content is moderated</li>
              <li>Request a copy of your data by contacting us</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ash-100">Changes</h2>
            <p className="mt-2">
              If we change this policy, we&apos;ll announce it on the platform.
              We&apos;ll never quietly weaken your privacy protections.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-ash-800 pt-6 text-center">
          <Link
            href="/"
            className="text-sm text-ash-500 hover:text-flame-400 transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
