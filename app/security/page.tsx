import type { Metadata } from "next";
import Link from "next/link";
import {
  Shield,
  Lock,
  Eye,
  Database,
  Hash,
  Clock,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Server,
} from "lucide-react";
import { FlameLogo } from "@/components/fuega/flame-logo";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Learn about fuega.ai's security practices, what we collect, and our commitment to user privacy and anonymity.",
  openGraph: {
    title: "Security | fuega.ai",
    description:
      "Our security practices, what we collect, and our commitment to user privacy.",
  },
};

const weCollect = [
  {
    item: "Username (chosen by you)",
    reason: "Required for account identity",
  },
  {
    item: "Hashed password (bcrypt, 12 rounds)",
    reason: "Authentication — we never see your password",
  },
  {
    item: "IP hash (SHA-256 + rotating salt)",
    reason: "Abuse prevention only — auto-deleted after 30 days",
  },
  {
    item: "Posts and comments you create",
    reason: "Platform content — soft-deleted, never permanently removed",
  },
  {
    item: "Votes you cast",
    reason: "Platform functionality — anonymous to other users",
  },
];

const weDoNotCollect = [
  "Email addresses (optional, only for recovery)",
  "Real names or identifying information",
  "Location data or GPS coordinates",
  "Browser fingerprints or device IDs",
  "Cookies for tracking or advertising",
  "Behavioral analytics or usage patterns",
  "Third-party tracking pixels",
  "Data sold to advertisers — ever",
];

const securityLayers = [
  {
    icon: Lock,
    title: "Authentication",
    description:
      "JWT tokens in httpOnly cookies. bcrypt password hashing with 12 salt rounds. CSRF protection on all state-changing requests.",
  },
  {
    icon: Hash,
    title: "IP Anonymization",
    description:
      "IPs are SHA-256 hashed with a rotating monthly salt. Raw IPs are never stored. Hashes are automatically deleted after 30 days.",
  },
  {
    icon: Database,
    title: "Database Security",
    description:
      "Row-level security policies. All queries parameterized — zero SQL injection surface. Soft deletes only — data integrity guaranteed.",
  },
  {
    icon: Shield,
    title: "Input Validation",
    description:
      "Every input validated with Zod schemas server-side. HTML output sanitized with DOMPurify. Content Security Policy headers on all responses.",
  },
  {
    icon: Server,
    title: "Infrastructure",
    description:
      "Hosted on Railway with encrypted connections. Cloudflare CDN and DDoS protection. All traffic encrypted with TLS 1.3.",
  },
  {
    icon: Eye,
    title: "AI Prompt Injection Defense",
    description:
      "Multi-layer defense against prompt injection in AI moderation. Input sanitization, output validation, and sandboxed execution.",
  },
  {
    icon: Clock,
    title: "Rate Limiting",
    description:
      "All endpoints rate-limited. Progressive penalties for abuse. Distributed rate limiting across the infrastructure.",
  },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-ash-800 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/">
            <FlameLogo size="sm" />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-ash-400 transition-colors hover:text-ash-200"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-md bg-flame-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-flame-600"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-ash-500 transition-colors hover:text-ash-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </Link>

        <h1 className="mt-8 text-4xl font-bold text-ash-100 sm:text-5xl">
          Security & Privacy
        </h1>
        <p className="mt-4 text-lg text-ash-400">
          We believe privacy is a right, not a feature. Here&apos;s exactly what
          we do to protect you.
        </p>

        {/* What we collect */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-ash-100">What we collect</h2>
          <p className="mt-2 text-sm text-ash-400">
            The absolute minimum needed to run the platform.
          </p>

          <div className="mt-6 space-y-3">
            {weCollect.map((entry) => (
              <div
                key={entry.item}
                className="flex items-start gap-3 rounded-lg border border-ash-800 bg-ash-900/30 p-4"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                <div>
                  <p className="text-sm font-medium text-ash-200">
                    {entry.item}
                  </p>
                  <p className="text-xs text-ash-500">{entry.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What we DON'T collect */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-ash-100">
            What we DON&apos;T collect
          </h2>
          <p className="mt-2 text-sm text-ash-400">
            We&apos;re proud of this list being long.
          </p>

          <div className="mt-6 space-y-2">
            {weDoNotCollect.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-lg border border-ash-800/50 bg-ash-900/20 p-3"
              >
                <XCircle className="h-4 w-4 shrink-0 text-red-400/70" />
                <p className="text-sm text-ash-300">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Security layers */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-ash-100">
            7-layer security architecture
          </h2>
          <p className="mt-2 text-sm text-ash-400">
            Defense in depth — every layer independently protects your data.
          </p>

          <div className="mt-8 space-y-4">
            {securityLayers.map((layer) => {
              const Icon = layer.icon;
              return (
                <div
                  key={layer.title}
                  className="rounded-xl border border-ash-800 bg-ash-900/30 p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-flame-500/10">
                      <Icon className="h-4.5 w-4.5 text-flame-400" />
                    </div>
                    <h3 className="text-base font-semibold text-ash-100">
                      {layer.title}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ash-400">
                    {layer.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Transparency */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-ash-100">
            Transparency commitment
          </h2>
          <div className="mt-6 space-y-4 text-ash-300">
            <p>
              Every AI moderation decision is logged publicly in our{" "}
              <Link
                href="/mod-log"
                className="text-flame-400 hover:underline"
              >
                moderation log
              </Link>
              . You can see exactly what was moderated, why, and what AI prompt
              was used.
            </p>
            <p>
              Our codebase is built for auditability. Security researchers and
              contributors are welcome to review our implementation, report
              vulnerabilities, and suggest improvements.
            </p>
            <p>
              We will publish regular transparency reports detailing moderation
              statistics, governance outcomes, and any security incidents.
            </p>
          </div>
        </section>

        {/* Responsible disclosure */}
        <section className="mt-16 pb-16">
          <h2 className="text-2xl font-bold text-ash-100">
            Responsible disclosure
          </h2>
          <div className="mt-4 rounded-xl border border-flame-500/20 bg-flame-500/5 p-6">
            <p className="text-sm text-ash-300">
              Found a security vulnerability? We take security seriously and
              appreciate responsible disclosure. Please report security issues
              through our dedicated f | security community on the platform, or
              reach out through our contact channels. We commit to acknowledging
              reports within 24 hours and providing updates within 72 hours.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
