import Link from "next/link";
import {
  Shield,
  Vote,
  Eye,
  Users,
  Flame,
  ArrowRight,
  Lock,
  Heart,
  MessageSquare,
  FileCode2,
  Scale,
} from "lucide-react";
import { FlameLogo } from "@/components/fuega/flame-logo";
import { CommunityPrefix } from "@/components/fuega/community-prefix";

const principles = [
  {
    icon: Scale,
    title: "You write the rules",
    description:
      "Every community writes and votes on its own AI moderator prompt. No corporate overlords. No secret algorithms. The community decides what's acceptable — then AI enforces it, transparently.",
  },
  {
    icon: Eye,
    title: "Every decision is public",
    description:
      "Every single moderation action is logged with full reasoning. See exactly why something was approved, flagged, or removed. Disagree? Challenge it. The log doesn't lie.",
  },
  {
    icon: Shield,
    title: "Real anonymity, not theatre",
    description:
      "No email. No phone. No tracking pixels. IPs are SHA-256 hashed with rotating salts and deleted after 30 days. We can't identify you even if we wanted to.",
  },
  {
    icon: Vote,
    title: "Democratic governance",
    description:
      "Three-tier governance: community → category → platform. Power flows upward from the people, not down from admins. Propose changes, vote, reshape the rules.",
  },
  {
    icon: FileCode2,
    title: "AI serves the community",
    description:
      "AI doesn't make the rules — you do. AI enforces what the community voted for, nothing more. Every prompt is public. Every decision is auditable. AI is the tool, not the authority.",
  },
  {
    icon: Heart,
    title: "No ads. No premium. Tip-supported.",
    description:
      "No ads, no paywalls, no \"premium\" tiers that split the community. Everyone gets the same platform. If you want to support us, tip — you'll get a badge and some cosmetics. That's it. We don't sell your attention.",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Claim your identity",
    description:
      "Pick a username. No email, no verification, no data harvesting. You exist on your terms.",
  },
  {
    step: "02",
    title: "Find or build your community",
    description: "COMMUNITY_LINKS",
  },
  {
    step: "03",
    title: "Speak freely, governed fairly",
    description:
      "Post and discuss. AI moderation runs in real-time using rules your community wrote and voted on.",
  },
  {
    step: "04",
    title: "Hold power accountable",
    description:
      "Audit the mod log. Propose prompt changes. Vote on governance. The system answers to you.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-ash-800 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 2xl:px-8">
          <FlameLogo size="sm" />
          <div className="flex items-center gap-6">
            <Link
              href="/about"
              className="hidden text-sm text-ash-400 transition-colors hover:text-ash-200 sm:block"
            >
              About
            </Link>
            <Link
              href="/security"
              className="hidden text-sm text-ash-400 transition-colors hover:text-ash-200 sm:block"
            >
              Security
            </Link>
            <Link
              href="/mod-log"
              className="hidden text-sm text-ash-400 transition-colors hover:text-ash-200 sm:block"
            >
              Mod Log
            </Link>
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
              <Flame className="h-4 w-4" />
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-[calc(100vh-3.5rem)] flex-col overflow-hidden px-4 2xl:px-8">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[400px] w-[900px] -translate-x-1/2 rounded-full bg-flame-500/5 blur-3xl" />
          <div className="absolute left-1/3 top-10 h-[250px] w-[600px] -translate-x-1/2 rounded-full bg-ember-500/5 blur-3xl" />
        </div>

        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center">
          <div className="mx-auto max-w-4xl lg:max-w-5xl">
            {/* Terminal-style manifesto */}
            <div className="mb-6 inline-flex items-center gap-2 border border-ash-800 bg-ash-900/60 px-3 py-1.5 text-xs text-ash-500">
              <span className="h-2 w-2 rounded-full bg-flame-500 animate-flame-flicker" />
              <span className="text-ash-600">root@fuega</span>
              <span className="text-ash-700">:</span>
              <span className="text-flame-500/70">~</span>
              <span className="text-ash-600">$</span>
              <span className="text-ash-400 ml-1">init --governance community</span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl 2xl:text-7xl">
              <span className="text-ash-200">Your community.</span>
              <br />
              <span className="text-ash-200">Your standards.</span>
              <br />
              <span className="text-gradient-fire">You govern.</span>
              <span className="text-flame-500 cursor-blink ml-1">_</span>
            </h1>

            <div className="mt-6 space-y-1 text-sm text-ash-500 sm:text-base lg:text-lg">
              <p>
                <span className="text-flame-500/70 mr-2">&gt;</span>
                <span className="text-ash-300">Communities write their own rules and vote on them.</span>
              </p>
              <p>
                <span className="text-flame-500/70 mr-2">&gt;</span>
                <span className="text-ash-400">AI enforces what you decided. Nothing more.</span>
              </p>
              <p>
                <span className="text-flame-500/70 mr-2">&gt;</span>
                <span className="text-ash-500">Every moderation decision is public and auditable.</span>
              </p>
              <p>
                <span className="text-flame-500/70 mr-2">&gt;</span>
                <span className="text-ash-600">No ads. No premium tiers. Tip-supported.</span>
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-8">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-flame-500 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-flame-500/25 transition-all hover:bg-flame-600 hover:shadow-flame-500/40"
              >
                Claim your username
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 border border-ash-700 px-8 py-3 text-base font-medium text-ash-300 transition-colors hover:border-ash-600 hover:text-ash-100"
              >
                Read the architecture
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-ash-600 sm:gap-6">
              <span className="font-mono">
                <span className="text-flame-500/50">[</span>
                no email
                <span className="text-flame-500/50">]</span>
              </span>
              <span className="font-mono">
                <span className="text-flame-500/50">[</span>
                no ads
                <span className="text-flame-500/50">]</span>
              </span>
              <span className="font-mono">
                <span className="text-flame-500/50">[</span>
                no premium tiers
                <span className="text-flame-500/50">]</span>
              </span>
              <span className="font-mono">
                <span className="text-flame-500/50">[</span>
                zero tracking
                <span className="text-flame-500/50">]</span>
              </span>
              <span className="font-mono">
                <span className="text-flame-500/50">[</span>
                public mod logs
                <span className="text-flame-500/50">]</span>
              </span>
              <span className="font-mono">
                <span className="text-flame-500/50">[</span>
                open governance
                <span className="text-flame-500/50">]</span>
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-ash-800/50 bg-ash-900/20 px-4 py-4 2xl:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs tracking-wide text-ash-500 uppercase">
          <span>SHA-256 hashed IPs</span>
          <span className="text-ash-700">·</span>
          <span>Rotating salt — 30-day purge</span>
          <span className="text-ash-700">·</span>
          <span>Parameterized queries only</span>
          <span className="text-ash-700">·</span>
          <span>CSP + CSRF + rate limiting</span>
          <span className="text-ash-700">·</span>
          <span>Prompt injection defenses</span>
        </div>
      </section>

      {/* Principles */}
      <section className="px-4 py-12 lg:py-10 2xl:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-ash-100 sm:text-3xl">
              Built for people who don&apos;t trust platforms
            </h2>
            <p className="mt-2 text-sm text-ash-500">
              Every design decision answers the same question: does the community control this, or does someone else?
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3 lg:gap-5">
            {principles.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="border border-ash-800 bg-ash-900/30 p-5 transition-colors hover:border-flame-500/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-flame-500/10">
                      <Icon className="h-4 w-4 text-flame-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-ash-100">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-ash-400">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works — horizontal on desktop */}
      <section className="border-t border-ash-800/50 px-4 py-12 lg:py-10 2xl:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-2xl font-bold text-ash-100 sm:text-3xl">
            How it works
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:mt-8 lg:grid-cols-4 lg:gap-6">
            {howItWorks.map((item) => (
              <div key={item.step} className="relative border border-ash-800 bg-ash-900/20 p-5 transition-colors hover:border-flame-500/20">
                <span className="text-2xl font-bold text-flame-500/20">
                  {item.step}
                </span>
                <h3 className="mt-2 text-sm font-semibold text-ash-100">
                  {item.title}
                </h3>
                {item.description === "COMMUNITY_LINKS" ? (
                  <p className="mt-1 text-xs text-ash-400">
                    Join{" "}
                    <CommunityPrefix name="tech" linked />,{" "}
                    <CommunityPrefix name="privacy" linked />,{" "}
                    <CommunityPrefix name="gaming" linked />{" "}
                    — or create your own space with your own rules.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-ash-400">
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-ash-800/50 px-4 py-12 lg:py-10 2xl:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-flame-400" />
          <h2 className="mt-4 text-2xl font-bold text-ash-100 sm:text-3xl">
            Find your people. Set your standards.
          </h2>
          <p className="mt-3 text-sm text-ash-400">
            No algorithms deciding what you see. No ads. No premium tiers.
            Just communities that govern themselves and people who share your standards.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-flex items-center gap-2 bg-flame-500 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-flame-500/25 transition-all hover:bg-flame-600 hover:shadow-flame-500/40"
          >
            Claim your username
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ash-800 px-4 py-8 2xl:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <FlameLogo size="sm" />
              <p className="mt-2 text-xs text-ash-500">
                AI-moderated discussion with transparent community governance.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-ash-300 uppercase tracking-wider">Platform</h4>
              <ul className="mt-2 space-y-1">
                <li>
                  <Link href="/home" className="text-xs text-ash-500 hover:text-ash-300">
                    Browse
                  </Link>
                </li>
                <li>
                  <Link href="/governance" className="text-xs text-ash-500 hover:text-ash-300">
                    Governance
                  </Link>
                </li>
                <li>
                  <Link href="/mod-log" className="text-xs text-ash-500 hover:text-ash-300">
                    Mod Log
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-ash-300 uppercase tracking-wider">Company</h4>
              <ul className="mt-2 space-y-1">
                <li>
                  <Link href="/about" className="text-xs text-ash-500 hover:text-ash-300">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/security" className="text-xs text-ash-500 hover:text-ash-300">
                    Security
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-ash-300 uppercase tracking-wider">Legal</h4>
              <ul className="mt-2 space-y-1">
                <li>
                  <Link href="/terms" className="text-xs text-ash-500 hover:text-ash-300">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-xs text-ash-500 hover:text-ash-300">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-6 border-t border-ash-800 pt-4 text-center text-xs text-ash-600">
            &copy; {new Date().getFullYear()} fuega.ai — Built for the community, by the community.
          </div>
        </div>
      </footer>
    </div>
  );
}
