import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Flame,
  Check,
  X,
  Minus,
  GitFork,
  MessageSquare,
  Heart,
} from "lucide-react";
import { FlameLogo } from "@/components/fuega/flame-logo";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about fuega.ai — an AI-moderated discussion platform with transparent campfire governance.",
  openGraph: {
    title: "About fuega.ai",
    description:
      "Learn about fuega.ai — an AI-moderated discussion platform with transparent campfire governance.",
  },
};

const F = () => <span className="text-flame-400 font-semibold">fuega</span>;

type CellValue = "yes" | "no" | "partial" | "paid" | string;

const comparisonRows: {
  feature: string;
  reddit: CellValue;
  discord: CellValue;
  x: CellValue;
  fuega: CellValue;
}[] = [
  {
    feature: "Campfire-written rules",
    reddit: "partial",
    discord: "partial",
    x: "no",
    fuega: "yes",
  },
  {
    feature: "AI moderation",
    reddit: "no",
    discord: "no",
    x: "partial",
    fuega: "yes",
  },
  {
    feature: "Public mod logs",
    reddit: "no",
    discord: "no",
    x: "no",
    fuega: "yes",
  },
  {
    feature: "Vote on moderation rules",
    reddit: "no",
    discord: "no",
    x: "no",
    fuega: "yes",
  },
  {
    feature: "True anonymity",
    reddit: "no",
    discord: "no",
    x: "no",
    fuega: "yes",
  },
  {
    feature: "No email required",
    reddit: "no",
    discord: "no",
    x: "no",
    fuega: "yes",
  },
  {
    feature: "No ads",
    reddit: "no",
    discord: "yes",
    x: "no",
    fuega: "yes",
  },
  {
    feature: "No influence for sale",
    reddit: "no",
    discord: "no",
    x: "no",
    fuega: "yes",
  },
  {
    feature: "No ID / photo verification",
    reddit: "no",
    discord: "no",
    x: "no",
    fuega: "yes",
  },
  {
    feature: "No phone number required",
    reddit: "partial",
    discord: "no",
    x: "no",
    fuega: "yes",
  },
  {
    feature: "No tracking / data selling",
    reddit: "no",
    discord: "partial",
    x: "no",
    fuega: "yes",
  },
  {
    feature: "Spam protection",
    reddit: "partial",
    discord: "partial",
    x: "partial",
    fuega: "yes",
  },
  {
    feature: "Troll / extremism filtering",
    reddit: "partial",
    discord: "partial",
    x: "partial",
    fuega: "yes",
  },
  {
    feature: "Democratic governance",
    reddit: "no",
    discord: "no",
    x: "no",
    fuega: "yes",
  },
  {
    feature: "Transparent algorithms",
    reddit: "no",
    discord: "no",
    x: "no",
    fuega: "yes",
  },
  {
    feature: "Campfire chooses AI model",
    reddit: "no",
    discord: "no",
    x: "no",
    fuega: "yes",
  },
];

function CellIcon({ value }: { value: CellValue }) {
  switch (value) {
    case "yes":
      return <Check className="mx-auto h-4 w-4 text-green-400" />;
    case "no":
      return <X className="mx-auto h-4 w-4 text-ember-500" />;
    case "partial":
      return <Minus className="mx-auto h-4 w-4 text-ash" />;
    case "paid":
      return <span className="text-xs text-smoke">$</span>;
    default:
      return <span className="text-xs text-smoke">{value}</span>;
  }
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-charcoal bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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

      <main className="mx-auto max-w-7xl px-4 py-12 2xl:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-smoke transition-colors hover:text-ash"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </Link>

        {/* Mission */}
        <section className="mt-8">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            Why <F /> exists
          </h1>
          <div className="mt-5 space-y-3">
            <div className="flex gap-3">
              <Flame className="mt-0.5 h-4 w-4 shrink-0 text-flame-400" />
              <p className="text-base leading-relaxed text-ash">
                <span className="font-medium text-foreground">X</span> floods your
                For You page with engagement-farmed bot replies until you&apos;re
                convinced half the country hates you — when it&apos;s really
                just a few thousand accounts running 24/7.
              </p>
            </div>
            <div className="flex gap-3">
              <Flame className="mt-0.5 h-4 w-4 shrink-0 text-flame-400" />
              <p className="text-base leading-relaxed text-ash">
                <span className="font-medium text-foreground">Discord</span> now
                requires ID verification in some servers and hands your data to
                governments under laws like the UK&apos;s Online Safety Act.
              </p>
            </div>
            <div className="flex gap-3">
              <Flame className="mt-0.5 h-4 w-4 shrink-0 text-flame-400" />
              <p className="text-base leading-relaxed text-ash">
                <span className="font-medium text-foreground">Reddit</span> sold
                16 years of your posts to Google for $60M to train AI models
                you&apos;ll never benefit from.
              </p>
            </div>
          </div>
          <p className="mt-4 text-base leading-relaxed text-ash">
            These platforms don&apos;t work for you. They work on you.
          </p>
          <p className="mt-4 text-base leading-relaxed text-ash">
            <F /> is the opposite. Campfires write their own rules, vote on
            them, and AI enforces exactly what was decided — nothing more. The
            whole thing is tip-supported: help keep the lights on and you get a
            badge and some cosmetics. That&apos;s it. No ads, no data
            harvesting, no influence for sale.
          </p>
        </section>

        {/* Comparison Table */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            How <F /> compares
          </h2>
          <p className="mt-2 text-sm text-smoke">
            Feature-by-feature against the platforms you already know.
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-charcoal">
                  <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-smoke">
                    Feature
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-smoke">
                    Reddit
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-smoke">
                    Discord
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-smoke">
                    X
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-flame-400">
                    <F />
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-charcoal/50 transition-colors hover:bg-charcoal/30"
                  >
                    <td className="py-3 pr-4 text-ash">{row.feature}</td>
                    <td className="px-4 py-3 text-center">
                      <CellIcon value={row.reddit} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CellIcon value={row.discord} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CellIcon value={row.x} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CellIcon value={row.fuega} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-smoke">
            <Check className="mr-1 inline h-3 w-3 text-green-400" /> = yes
            <span className="mx-2 text-smoke/60">·</span>
            <Minus className="mr-1 inline h-3 w-3 text-ash" /> = partial / inconsistent
            <span className="mx-2 text-smoke/60">·</span>
            <X className="mr-1 inline h-3 w-3 text-ember-500" /> = no
          </p>
        </section>

        {/* Open Source & Get Involved */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Open source social media
          </h2>
          <p className="mt-4 text-ash leading-relaxed">
            <F /> isn&apos;t a product — it&apos;s a project. The code is
            public, the moderation prompts are readable, and if you don&apos;t
            like how something works you can propose a change, rally votes, and
            actually fix it.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="border border-charcoal bg-charcoal/30 p-4">
              <GitFork className="h-5 w-5 text-flame-400" />
              <p className="mt-2 text-sm font-medium text-foreground">
                Fully open source
              </p>
              <p className="mt-1 text-xs text-smoke">
                Audit the code, fork it, contribute. If you can read code, you
                can verify every claim we make.
              </p>
            </div>
            <div className="border border-charcoal bg-charcoal/30 p-4">
              <Heart className="h-5 w-5 text-flame-400" />
              <p className="mt-2 text-sm font-medium text-foreground">
                Tip-supported
              </p>
              <p className="mt-1 text-xs text-smoke">
                Tips get you a badge and cosmetics. The platform itself is
                identical for everyone — paying doesn&apos;t buy reach.
              </p>
            </div>
            <div className="border border-charcoal bg-charcoal/30 p-4">
              <MessageSquare className="h-5 w-5 text-flame-400" />
              <p className="mt-2 text-sm font-medium text-foreground">
                Built on feedback
              </p>
              <p className="mt-1 text-xs text-smoke">
                Features come from campfire proposals and votes, not product
                managers chasing quarterly metrics.
              </p>
            </div>
          </div>
        </section>

        {/* Get Involved */}
        <section className="mt-12 pb-12">
          <p className="text-ash leading-relaxed">
            Have a suggestion? Create a governance proposal. Found a bug?
            Post in{" "}
            <span className="text-flame-400 font-semibold">f</span>
            <span className="text-smoke mx-0.5">|</span>
            <span className="text-flame-400 font-semibold">fuega</span>.
            Want to contribute code? The repo is public.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-flame-400 transition-colors hover:text-flame-300"
            >
              See how governance works <span aria-hidden="true">&rarr;</span>
            </Link>
            <Link
              href="/security"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ash transition-colors hover:text-foreground"
            >
              Security & privacy <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
