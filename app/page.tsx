import Link from "next/link";
import {
  Bot,
  Shield,
  Vote,
  Eye,
  Users,
  Flame,
  ArrowRight,
  Zap,
  Lock,
  MessageSquare,
} from "lucide-react";
import { FlameLogo } from "@/components/fuega/flame-logo";

const features = [
  {
    icon: Bot,
    title: "AI Moderation",
    description:
      "Every post is checked by AI in real-time. No hidden algorithms — every decision is logged publicly with full reasoning.",
  },
  {
    icon: Vote,
    title: "Community Governance",
    description:
      "Communities write and vote on their own AI moderator prompts. Your community, your rules, enforced transparently.",
  },
  {
    icon: Shield,
    title: "True Anonymity",
    description:
      "No email required. No tracking. No data harvesting. We hash IPs with rotating salts and delete them after 30 days.",
  },
  {
    icon: Eye,
    title: "Radical Transparency",
    description:
      "Every moderation decision is public. See exactly why content was approved, flagged, or removed — and challenge it.",
  },
  {
    icon: Flame,
    title: "Spark & Douse",
    description:
      "Spark what ignites discussion. Douse what doesn't contribute. A voting system designed for quality, not popularity.",
  },
  {
    icon: Users,
    title: "Community-First",
    description:
      "Three-tier governance from community to category to platform. Power flows from the bottom up, not top down.",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Join or create a community",
    description:
      "Find your people in f | tech, f | science, f | gaming — or start your own.",
  },
  {
    step: "02",
    title: "Discuss freely",
    description:
      "Post, comment, and vote. AI moderation works in the background to keep discussions healthy.",
  },
  {
    step: "03",
    title: "Shape the rules",
    description:
      "Don't like how moderation works? Propose changes and vote. The community decides.",
  },
  {
    step: "04",
    title: "Stay informed",
    description:
      "Every AI decision is public. Check the mod log anytime. Full transparency, always.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-ash-800 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
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
              className="inline-flex items-center gap-1.5 rounded-md bg-flame-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-flame-600"
            >
              <Flame className="h-4 w-4" />
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-20 pt-24 sm:pt-32">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-flame-500/5 blur-3xl" />
          <div className="absolute left-1/3 top-20 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-ember-500/5 blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-flame-500/20 bg-flame-500/10 px-4 py-1.5 text-sm text-flame-400">
            <Zap className="h-3.5 w-3.5" />
            Now in early access — Founder badges for first 5,000 users
          </div>

          <h1 className="mt-8 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            <span className="text-gradient-fire">Discussion</span>
            <br />
            <span className="text-ash-200">moderated by AI,</span>
            <br />
            <span className="text-ash-200">governed by </span>
            <span className="text-gradient-fire">you</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-ash-400 sm:text-xl">
            fuega.ai is a discussion platform where communities write and vote
            on their own AI moderator prompts. Every decision is transparent.
            Every voice matters.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-flame-500 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-flame-500/25 transition-all hover:bg-flame-600 hover:shadow-flame-500/40"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 rounded-lg border border-ash-700 px-8 py-3 text-base font-medium text-ash-300 transition-colors hover:border-ash-600 hover:text-ash-100"
            >
              Learn more
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-ash-500">
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              No email required
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              End-to-end anonymous
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Public mod logs
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-ash-800/50 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-ash-100 sm:text-4xl">
              Built different
            </h2>
            <p className="mt-3 text-ash-400">
              Every feature designed around transparency, privacy, and community
              power.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-xl border border-ash-800 bg-ash-900/30 p-6 transition-colors hover:border-ash-700"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-flame-500/10">
                    <Icon className="h-5 w-5 text-flame-400" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-ash-100">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ash-400">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-ash-800/50 px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-ash-100 sm:text-4xl">
              How it works
            </h2>
            <p className="mt-3 text-ash-400">
              Four steps to a better discussion experience.
            </p>
          </div>

          <div className="mt-16 space-y-12">
            {howItWorks.map((item) => (
              <div key={item.step} className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-flame-500/30 bg-flame-500/10 text-lg font-bold text-flame-400">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ash-100">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-ash-400">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-ash-800/50 px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-flame-400" />
          <h2 className="mt-6 text-3xl font-bold text-ash-100 sm:text-4xl">
            Ready to join the conversation?
          </h2>
          <p className="mt-4 text-ash-400">
            Be among the first 5,000 users and earn a permanent Founder badge.
            No email required — just pick a username and go.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-flame-500 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-flame-500/25 transition-all hover:bg-flame-600 hover:shadow-flame-500/40"
          >
            Create your account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ash-800 px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <FlameLogo size="sm" />
              <p className="mt-3 text-sm text-ash-500">
                AI-moderated discussion with transparent community governance.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-ash-300">Platform</h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    href="/home"
                    className="text-sm text-ash-500 hover:text-ash-300"
                  >
                    Browse
                  </Link>
                </li>
                <li>
                  <Link
                    href="/governance"
                    className="text-sm text-ash-500 hover:text-ash-300"
                  >
                    Governance
                  </Link>
                </li>
                <li>
                  <Link
                    href="/mod-log"
                    className="text-sm text-ash-500 hover:text-ash-300"
                  >
                    Mod Log
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-ash-300">Company</h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    href="/about"
                    className="text-sm text-ash-500 hover:text-ash-300"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="/security"
                    className="text-sm text-ash-500 hover:text-ash-300"
                  >
                    Security
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-ash-300">Legal</h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    href="/terms"
                    className="text-sm text-ash-500 hover:text-ash-300"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm text-ash-500 hover:text-ash-300"
                  >
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-ash-800 pt-8 text-center text-sm text-ash-600">
            &copy; {new Date().getFullYear()} fuega.ai. Built for the community,
            by the community.
          </div>
        </div>
      </footer>
    </div>
  );
}
