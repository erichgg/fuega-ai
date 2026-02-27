import Link from "next/link";
import {
  Shield,
  Vote,
  Eye,
  Flame,
  ArrowRight,
  Heart,
  MessageSquare,
  FileCode2,
  Scale,
} from "lucide-react";
import { FlameLogo } from "@/components/fuega/flame-logo";
import { CampfirePrefix } from "@/components/fuega/campfire-prefix";
import { FireParticles } from "@/components/fuega/fire-particles";
import { ThemeToggle } from "@/components/fuega/theme-toggle";
import { AuthRedirect } from "@/components/fuega/auth-redirect";

const principles = [
  {
    icon: Shield,
    title: "No ID. No phone. No photo. Ever.",
    description:
      "Other platforms demand your identity, then sell it. We don't collect it in the first place. IPs are SHA-256 hashed with rotating salts and deleted after 30 days. We couldn't identify you even if we tried.",
  },
  {
    icon: Eye,
    title: "Challenge any decision",
    description:
      "Disagree with a moderation call? The full reasoning is public — read it, challenge it, propose a better rule. No black boxes. No \"trust us.\" The log is right there.",
  },
  {
    icon: Vote,
    title: "Flat governance, fully democratic",
    description:
      "Platform Principles are immutable. Beyond that, each campfire governs itself through structured variables and votes. No hierarchy, no gatekeepers — just your campfire, your rules.",
  },
  {
    icon: FileCode2,
    title: "You choose the AI",
    description:
      "Campfires vote on which AI model drives their moderation. Don't trust a provider's training data? Vote it out. Your campfire controls the knowledge behind every decision.",
  },
  {
    icon: Scale,
    title: "Open source. Fully auditable.",
    description:
      "The code is public. The moderation prompts are public. The governance is public. Fork it, audit it, contribute. We have nothing to hide because that's the whole point.",
  },
  {
    icon: Heart,
    title: "Tip-supported. Same platform for everyone.",
    description:
      "No one pays to shape what you see. No sponsored content, no premium feeds, no pay-to-win. Tips get you a badge and cosmetics — the platform stays equal for everyone.",
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
    title: "Find or build your campfire",
    description: "CAMPFIRE_LINKS",
  },
  {
    step: "03",
    title: "Speak freely, governed fairly",
    description:
      "Post and discuss. AI moderation runs in real-time using rules your campfire wrote and voted on.",
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
      {/* Redirect logged-in users to app */}
      <AuthRedirect />

      {/* Navigation */}
      <nav aria-label="Main navigation" className="sticky top-0 z-50 border-b border-charcoal bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 2xl:px-8">
          <FlameLogo size="sm" />
          <div className="flex items-center gap-6">
            <Link
              href="/how-it-works"
              className="hidden text-sm text-ash transition-colors hover:text-foreground sm:block"
            >
              How It Works
            </Link>
            <Link
              href="/about"
              className="hidden text-sm text-ash transition-colors hover:text-foreground sm:block"
            >
              About
            </Link>
            <Link
              href="/security"
              className="hidden text-sm text-ash transition-colors hover:text-foreground sm:block"
            >
              Security
            </Link>
            <Link
              href="/mod-log"
              className="hidden text-sm text-ash transition-colors hover:text-foreground sm:block"
            >
              Mod Log
            </Link>
            <ThemeToggle />
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
              <Flame className="h-4 w-4" />
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      <main>
      {/* Hero */}
      <section className="relative flex min-h-[calc(100vh-3.5rem)] flex-col overflow-hidden px-4 2xl:px-8">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[400px] w-full max-w-[900px] -translate-x-1/2 rounded-full bg-flame-500/5 blur-3xl" />
          <div className="absolute left-1/3 top-10 h-[250px] w-full max-w-[600px] -translate-x-1/2 rounded-full bg-ember-500/5 blur-3xl" />
          <FireParticles count={60} />
        </div>

        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center">
          <div className="mx-auto max-w-7xl">
            {/* Terminal-style manifesto */}
            <div className="mb-6 inline-flex items-center gap-2 border border-charcoal bg-charcoal/60 px-3 py-1.5 text-xs text-smoke">
              <span className="h-2 w-2 rounded-full bg-flame-500 animate-flame-flicker" />
              <span className="text-smoke">root@fuega</span>
              <span className="text-smoke/60">:</span>
              <span className="text-flame-500/70">~</span>
              <span className="text-smoke">$</span>
              <span className="text-ash ml-1">init --governance community</span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl 2xl:text-7xl">
              <span className="text-foreground">Your community.</span>
              <br />
              <span className="text-foreground">Your standards.</span>
              <br />
              <span className="text-gradient-fire">You govern.</span>
              <span className="text-flame-500 cursor-blink ml-1">_</span>
            </h1>

            <div className="mt-6 space-y-1 text-sm text-smoke sm:text-base lg:text-lg">
              <p>
                <span className="text-flame-500/70 mr-2">&gt;</span>
                <span className="text-ash">Campfires write their own rules and vote on them.</span>
              </p>
              <p>
                <span className="text-flame-500/70 mr-2">&gt;</span>
                <span className="text-ash">AI enforces what you decided. Nothing more.</span>
              </p>
              <p>
                <span className="text-flame-500/70 mr-2">&gt;</span>
                <span className="text-smoke">Every moderation decision is public and auditable.</span>
              </p>
              <p>
                <span className="text-flame-500/70 mr-2">&gt;</span>
                <span className="text-smoke">No ads. No influence. Tip-supported.</span>
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
                href="/how-it-works"
                className="inline-flex items-center gap-2 border border-charcoal px-8 py-3 text-base font-medium text-ash transition-colors hover:border-charcoal hover:text-foreground"
              >
                Read the architecture
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-smoke sm:gap-6">
              <span className="font-mono">
                <span className="text-flame-500/50">[</span>
                no email
                <span className="text-flame-500/50">]</span>
              </span>
              <span className="font-mono">
                <span className="text-flame-500/50">[</span>
                no phone
                <span className="text-flame-500/50">]</span>
              </span>
              <span className="font-mono">
                <span className="text-flame-500/50">[</span>
                no ID verification
                <span className="text-flame-500/50">]</span>
              </span>
              <span className="font-mono">
                <span className="text-flame-500/50">[</span>
                zero tracking
                <span className="text-flame-500/50">]</span>
              </span>
              <span className="font-mono">
                <span className="text-flame-500/50">[</span>
                open source
                <span className="text-flame-500/50">]</span>
              </span>
              <span className="font-mono">
                <span className="text-flame-500/50">[</span>
                you choose the AI
                <span className="text-flame-500/50">]</span>
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-charcoal/50 bg-charcoal/20 px-4 py-4 2xl:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs tracking-wide text-smoke uppercase">
          <span>SHA-256 hashed IPs</span>
          <span className="text-smoke/60">·</span>
          <span>Rotating salt — 30-day purge</span>
          <span className="text-smoke/60">·</span>
          <span>Parameterized queries only</span>
          <span className="text-smoke/60">·</span>
          <span>CSP + CSRF + rate limiting</span>
          <span className="text-smoke/60">·</span>
          <span>Prompt injection defenses</span>
        </div>
      </section>

      {/* Principles */}
      <section className="px-4 py-12 lg:py-10 2xl:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              Built for people who don&apos;t trust platforms
            </h2>
            <p className="mt-2 text-sm text-smoke">
              Every design decision answers the same question: does the campfire control this, or does someone else?
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3 lg:gap-5">
            {principles.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="border border-charcoal bg-charcoal/30 p-5 transition-colors hover:border-flame-500/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-flame-500/10">
                      <Icon className="h-4 w-4 text-flame-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-ash">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works — horizontal on desktop */}
      <section className="border-t border-charcoal/50 px-4 py-12 lg:py-10 2xl:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
            How it works
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:mt-8 lg:grid-cols-4 lg:gap-6">
            {howItWorks.map((item) => (
              <div key={item.step} className="relative border border-charcoal bg-charcoal/20 p-5 transition-colors hover:border-flame-500/20">
                <span className="text-2xl font-bold text-flame-500/20">
                  {item.step}
                </span>
                <h3 className="mt-2 text-sm font-semibold text-foreground">
                  {item.title}
                </h3>
                {item.description === "CAMPFIRE_LINKS" ? (
                  <p className="mt-1 text-xs text-ash">
                    Join{" "}
                    <CampfirePrefix name="tech" linked />,{" "}
                    <CampfirePrefix name="privacy" linked />,{" "}
                    <CampfirePrefix name="gaming" linked />{" "}
                    — or create your own space with your own rules.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-ash">
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-charcoal/50 px-4 py-12 lg:py-10 2xl:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-flame-400" />
          <h2 className="mt-4 text-2xl font-bold text-foreground sm:text-3xl">
            Find your people. Set your standards.
          </h2>
          <p className="mt-3 text-sm text-ash">
            Campfires that write their own rules, vote on their AI, and hold every decision accountable.
            No black boxes. No corporate overlords. Just people who share your standards.
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

      </main>

      {/* Footer */}
      <footer className="border-t border-charcoal px-4 py-8 2xl:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <FlameLogo size="sm" />
              <p className="mt-2 text-xs text-smoke">
                AI-moderated discussion with transparent campfire governance.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-ash uppercase tracking-wider">Platform</h4>
              <ul className="mt-2 space-y-1">
                <li>
                  <Link href="/home" className="text-xs text-smoke hover:text-ash">
                    Browse
                  </Link>
                </li>
                <li>
                  <Link href="/governance" className="text-xs text-smoke hover:text-ash">
                    Governance
                  </Link>
                </li>
                <li>
                  <Link href="/mod-log" className="text-xs text-smoke hover:text-ash">
                    Mod Log
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-ash uppercase tracking-wider">Company</h4>
              <ul className="mt-2 space-y-1">
                <li>
                  <Link href="/how-it-works" className="text-xs text-smoke hover:text-ash">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-xs text-smoke hover:text-ash">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/security" className="text-xs text-smoke hover:text-ash">
                    Security
                  </Link>
                </li>
                <li>
                  <Link href="/principles" className="text-xs text-smoke hover:text-ash">
                    Principles
                  </Link>
                </li>
                <li>
                  <Link href="/supporters" className="text-xs text-smoke hover:text-ash">
                    Supporters
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-ash uppercase tracking-wider">Legal</h4>
              <ul className="mt-2 space-y-1">
                <li>
                  <Link href="/terms" className="text-xs text-smoke hover:text-ash">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-xs text-smoke hover:text-ash">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-6 border-t border-charcoal pt-4 text-center text-xs text-smoke">
            &copy; {new Date().getFullYear()}{" "}
            <span className="text-flame-400 font-bold">fuega</span>
            <span className="text-smoke">.ai</span>
            {" "}— Built for the community, by the community.
          </div>
        </div>
      </footer>
    </div>
  );
}
