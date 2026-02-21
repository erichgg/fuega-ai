import type { Metadata } from "next";
import Link from "next/link";
import {
  Bot,
  Shield,
  Vote,
  Eye,
  ArrowLeft,
  Flame,
  Scale,
  UserX,
} from "lucide-react";
import { FlameLogo } from "@/components/fuega/flame-logo";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about fuega.ai — an AI-moderated discussion platform with transparent community governance.",
  openGraph: {
    title: "About fuega.ai",
    description:
      "Learn about fuega.ai — an AI-moderated discussion platform with transparent community governance.",
  },
};

const differences = [
  {
    icon: Bot,
    traditional: "Human moderators with hidden agendas and inconsistent enforcement",
    fuega: "AI moderation with public reasoning for every single decision",
  },
  {
    icon: Vote,
    traditional: "Rules set by platform owners, enforced arbitrarily",
    fuega: "Communities write and vote on their own moderation prompts",
  },
  {
    icon: Eye,
    traditional: "Shadow bans, hidden algorithms, opaque content ranking",
    fuega: "Every moderation action logged publicly with full transparency",
  },
  {
    icon: Shield,
    traditional: "Extensive data collection, behavioral tracking, ad targeting",
    fuega: "No email required, IPs hashed and deleted after 30 days",
  },
  {
    icon: Scale,
    traditional: "Top-down governance with no community input",
    fuega: "Three-tier governance: community → category → platform",
  },
  {
    icon: UserX,
    traditional: "Real identity required, data sold to advertisers",
    fuega: "True anonymity as a core design principle",
  },
];

export default function AboutPage() {
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

        {/* Mission */}
        <section className="mt-8">
          <h1 className="text-4xl font-bold text-ash-100 sm:text-5xl">
            Our mission
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-ash-300">
            fuega.ai exists because we believe online discussion can be better.
            Not through more rules, more moderators, or more surveillance — but
            through{" "}
            <span className="text-flame-400 font-semibold">transparency</span>,{" "}
            <span className="text-flame-400 font-semibold">community ownership</span>,
            and{" "}
            <span className="text-flame-400 font-semibold">AI accountability</span>.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-ash-300">
            We&apos;re building a platform where every moderation decision is
            public. Where communities write and vote on their own AI moderator
            prompts. Where anonymity is a right, not a privilege. And where the
            people who use the platform are the ones who govern it.
          </p>
        </section>

        {/* How fuega is different */}
        <section className="mt-20">
          <h2 className="text-3xl font-bold text-ash-100">
            How fuega is different
          </h2>
          <p className="mt-3 text-ash-400">
            A side-by-side comparison with traditional platforms.
          </p>

          <div className="mt-10 space-y-6">
            {differences.map((diff, i) => {
              const Icon = diff.icon;
              return (
                <div
                  key={i}
                  className="rounded-xl border border-ash-800 bg-ash-900/30 p-5"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-flame-500/10">
                      <Icon className="h-4 w-4 text-flame-400" />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-red-400/70">
                        Traditional platforms
                      </span>
                      <p className="mt-1 text-sm text-ash-400">
                        {diff.traditional}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-flame-400/70">
                        fuega.ai
                      </span>
                      <p className="mt-1 text-sm text-ash-200">{diff.fuega}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Team */}
        <section className="mt-20">
          <h2 className="text-3xl font-bold text-ash-100">The team</h2>
          <p className="mt-4 text-ash-300 leading-relaxed">
            fuega.ai is built by a small team that believes in practicing what
            we preach. We operate anonymously — just like our users. We don&apos;t
            believe knowing our names makes the platform better. What matters is
            the code, the transparency, and the community.
          </p>
          <div className="mt-6 rounded-xl border border-ash-800 bg-ash-900/30 p-6">
            <div className="flex items-center gap-3">
              <Flame className="h-6 w-6 text-flame-400" />
              <div>
                <p className="text-sm font-medium text-ash-200">
                  Open source contributors welcome
                </p>
                <p className="text-sm text-ash-400">
                  The platform is built in the open. Contributions, audits, and
                  feedback are always welcome.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="mt-20 pb-16">
          <h2 className="text-3xl font-bold text-ash-100">Contact</h2>
          <p className="mt-4 text-ash-300">
            The best way to reach us is through the platform itself. Have a
            suggestion? Create a governance proposal. Found a bug? Post in
            f/meta. Security concern? See our{" "}
            <Link href="/security" className="text-flame-400 hover:underline">
              security page
            </Link>{" "}
            for responsible disclosure information.
          </p>
        </section>
      </main>
    </div>
  );
}
