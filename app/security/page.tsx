import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, X } from "lucide-react";
import { FlameLogo } from "@/components/fuega/flame-logo";

export const metadata: Metadata = {
  title: "Security & Privacy",
  description:
    "What fuega.ai collects, what it doesn't, and how every layer of security works.",
  openGraph: {
    title: "Security & Privacy | fuega.ai",
    description:
      "What fuega.ai collects, what it doesn't, and how every layer of security works.",
  },
};

const F = () => <span className="text-flame-400 font-semibold">fuega</span>;

type DataRow = {
  item: string;
  collected: boolean;
  detail: string;
};

const dataRows: DataRow[] = [
  {
    item: "Username",
    collected: true,
    detail: "Chosen by you — the only identifier on the platform",
  },
  {
    item: "Password",
    collected: true,
    detail: "bcrypt hashed (12 rounds) — we never see the plaintext",
  },
  {
    item: "IP address",
    collected: false,
    detail: "SHA-256 hashed with a rotating monthly salt, auto-deleted after 30 days. Raw IPs are never stored.",
  },
  {
    item: "Posts & comments",
    collected: true,
    detail: "Your content — soft-deleted only, never permanently removed",
  },
  {
    item: "Votes",
    collected: true,
    detail: "Anonymous to other users, used for spark/douse scoring",
  },
  {
    item: "Email address",
    collected: false,
    detail: "Not required. Optional field for account recovery only.",
  },
  {
    item: "Real name",
    collected: false,
    detail: "Never asked for. No ID verification, no photo verification.",
  },
  {
    item: "Phone number",
    collected: false,
    detail: "Never asked for. No SMS verification.",
  },
  {
    item: "Location / GPS",
    collected: false,
    detail: "No geolocation of any kind.",
  },
  {
    item: "Browser fingerprint",
    collected: false,
    detail: "No device IDs, no canvas fingerprinting, no font enumeration.",
  },
  {
    item: "Tracking cookies",
    collected: false,
    detail: "Auth cookie only (httpOnly, secure). Zero tracking or advertising cookies.",
  },
  {
    item: "Behavioral analytics",
    collected: false,
    detail: "No usage patterns, no scroll tracking, no heatmaps, no session recordings.",
  },
  {
    item: "Third-party pixels",
    collected: false,
    detail: "No Facebook Pixel, no Google Analytics, no tracking pixels of any kind.",
  },
  {
    item: "Data sold to anyone",
    collected: false,
    detail: "We have no advertisers, no data brokers, no partnerships that involve your data.",
  },
];

type SecurityRow = {
  layer: string;
  what: string;
  how: string;
};

const securityRows: SecurityRow[] = [
  {
    layer: "Authentication",
    what: "Verifying you are who you claim to be",
    how: "JWT in httpOnly cookies, bcrypt (12 rounds), CSRF tokens on all state-changing requests",
  },
  {
    layer: "IP anonymization",
    what: "Preventing anyone (including us) from identifying you by IP",
    how: "SHA-256 hash with rotating monthly salt. Raw IPs never touch disk. Hashes purged after 30 days.",
  },
  {
    layer: "Database",
    what: "Protecting stored data from unauthorized access",
    how: "Row-level security policies, all queries parameterized (zero SQL injection surface), soft deletes only",
  },
  {
    layer: "Input validation",
    what: "Stopping malicious input before it reaches the system",
    how: "Zod schema validation on every endpoint, DOMPurify on HTML output, Content Security Policy headers",
  },
  {
    layer: "Infrastructure",
    what: "Securing the servers and network",
    how: "Railway (encrypted connections), Cloudflare (CDN + DDoS protection), TLS 1.3 on all traffic",
  },
  {
    layer: "AI prompt defense",
    what: "Preventing users from manipulating the AI moderator",
    how: "Multi-layer injection defense: input sanitization, output validation, sandboxed execution context",
  },
  {
    layer: "Rate limiting",
    what: "Stopping abuse and brute-force attacks",
    how: "Per-endpoint limits, progressive penalties, distributed enforcement across infrastructure",
  },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-ash-800 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 2xl:px-8">
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
              className="inline-flex items-center gap-1.5 bg-flame-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-flame-600"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-12 2xl:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-ash-500 transition-colors hover:text-ash-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </Link>

        <h1 className="mt-8 text-3xl font-bold text-ash-100 sm:text-4xl">
          Security & Privacy
        </h1>
        <p className="mt-3 text-base text-ash-400">
          Most platforms bury what they collect in a 12,000-word privacy policy.
          Here&apos;s ours in two tables.
        </p>

        {/* Data collection table */}
        <section className="mt-10">
          <h2 className="text-2xl font-bold text-ash-100 sm:text-3xl">
            What <F /> knows about you
          </h2>
          <p className="mt-2 text-sm text-ash-500">
            Green means we store it. Red means we don&apos;t — and never will.
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ash-800">
                  <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-ash-500">
                    Data
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-ash-500">
                    Collected?
                  </th>
                  <th className="py-3 pl-4 text-left text-xs font-semibold uppercase tracking-wider text-ash-500">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row) => (
                  <tr
                    key={row.item}
                    className="border-b border-ash-800/50 transition-colors hover:bg-ash-900/30"
                  >
                    <td className="py-3 pr-4 text-ash-200 font-medium whitespace-nowrap">
                      {row.item}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.collected ? (
                        <Check className="mx-auto h-4 w-4 text-flame-400" />
                      ) : (
                        <X className="mx-auto h-4 w-4 text-ember-500" />
                      )}
                    </td>
                    <td className="py-3 pl-4 text-ash-400">
                      {row.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Security architecture table */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-ash-100 sm:text-3xl">
            7-layer security architecture
          </h2>
          <p className="mt-2 text-sm text-ash-500">
            Defense in depth — every layer independently protects your data.
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ash-800">
                  <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-ash-500">
                    Layer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ash-500">
                    Protects against
                  </th>
                  <th className="py-3 pl-4 text-left text-xs font-semibold uppercase tracking-wider text-ash-500">
                    How
                  </th>
                </tr>
              </thead>
              <tbody>
                {securityRows.map((row) => (
                  <tr
                    key={row.layer}
                    className="border-b border-ash-800/50 transition-colors hover:bg-ash-900/30"
                  >
                    <td className="py-3 pr-4 text-ash-200 font-medium whitespace-nowrap">
                      {row.layer}
                    </td>
                    <td className="px-4 py-3 text-ash-400">
                      {row.what}
                    </td>
                    <td className="py-3 pl-4 text-ash-400">
                      {row.how}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Transparency + disclosure */}
        <section className="mt-12 pb-12">
          <h2 className="text-2xl font-bold text-ash-100 sm:text-3xl">
            Transparency & disclosure
          </h2>
          <p className="mt-4 text-ash-300 leading-relaxed">
            Every AI moderation decision is logged publicly in your
            community&apos;s{" "}
            <Link
              href="/mod-log"
              className="text-flame-400 hover:underline"
            >
              mod log
            </Link>
            {" "}— what was flagged, why, and which prompt was used. The
            codebase is open source for anyone to audit, and we&apos;ll
            publish regular transparency reports covering moderation
            statistics, governance outcomes, and any security incidents.
          </p>
          <div className="mt-6 border border-flame-500/20 bg-flame-500/5 p-5">
            <p className="text-sm font-medium text-ash-200">
              Found a vulnerability?
            </p>
            <p className="mt-2 text-sm text-ash-400">
              Report security issues through{" "}
              <span className="text-flame-400 font-semibold">f</span>
              <span className="text-ash-500 mx-0.5">|</span>
              <span className="text-flame-400 font-semibold">security</span>
              {" "}on the platform or through our contact channels. We
              acknowledge reports within 24 hours and provide updates within 72.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
