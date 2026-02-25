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
    "Learn about fuega.ai — an AI-moderated discussion platform with transparent community governance.",
  openGraph: {
    title: "About fuega.ai",
    description:
      "Learn about fuega.ai — an AI-moderated discussion platform with transparent community governance.",
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
    feature: "Community-written rules",
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
    feature: "Community chooses AI model",
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
      return <Minus className="mx-auto h-4 w-4 text-ash-400" />;
    case "paid":
      return <span className="text-xs text-ash-500">$</span>;
    default:
      return <span className="text-xs text-ash-500">{value}</span>;
  }
}

export default function AboutPage() {
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

        {/* Mission */}
        <section className="mt-8">
          <h1 className="text-3xl font-bold text-ash-100 sm:text-4xl">
            Why <F /> exists
          </h1>
          <div className="mt-5 space-y-3">
            <div className="flex gap-3">
              <Flame className="mt-0.5 h-4 w-4 shrink-0 text-flame-400" />
              <p className="text-base leading-relaxed text-ash-300">
                <span className="font-medium text-ash-200">X</span> floods your
                For You page with engagement-farmed bot replies until you&apos;re
                convinced half the country hates you — when it&apos;s really
                just a few thousand accounts running 24/7.
              </p>
            </div>
            <div className="flex gap-3">
              <Flame className="mt-0.5 h-4 w-4 shrink-0 text-flame-400" />
              <p className="text-base leading-relaxed text-ash-300">
                <span className="font-medium text-ash-200">Discord</span> now
                requires ID verification in some servers and hands your data to
                governments under laws like the UK&apos;s Online Safety Act.
              </p>
            </div>
            <div className="flex gap-3">
              <Flame className="mt-0.5 h-4 w-4 shrink-0 text-flame-400" />
              <p className="text-base leading-relaxed text-ash-300">
                <span className="font-medium text-ash-200">Reddit</span> sold
                16 years of your posts to Google for $60M to train AI models
                you&apos;ll never benefit from.
              </p>
            </div>
          </div>
          <p className="mt-4 text-base leading-relaxed text-ash-400">
            These platforms don&apos;t work for you. They work on you.
          </p>
          <p className="mt-4 text-base leading-relaxed text-ash-400">
            <F /> is the opposite. Communities write their own rules, vote on
            them, and AI enforces exactly what was decided — nothing more. The
            whole thing is tip-supported: help keep the lights on and you get a
            badge and some cosmetics. That&apos;s it. No ads, no data
            harvesting, no influence for sale.
          </p>
        </section>

        {/* Comparison Table */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-ash-100 sm:text-3xl">
            How <F /> compares
          </h2>
          <p className="mt-2 text-sm text-ash-500">
            Feature-by-feature against the platforms you already know.
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ash-800">
                  <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-ash-500">
                    Feature
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-ash-500">
                    Reddit
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-ash-500">
                    Discord
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-ash-500">
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
                    className="border-b border-ash-800/50 transition-colors hover:bg-ash-900/30"
                  >
                    <td className="py-3 pr-4 text-ash-300">{row.feature}</td>
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

          <p className="mt-4 text-xs text-ash-600">
            <Check className="mr-1 inline h-3 w-3 text-green-400" /> = yes
            <span className="mx-2 text-ash-700">·</span>
            <Minus className="mr-1 inline h-3 w-3 text-ash-400" /> = partial / inconsistent
            <span className="mx-2 text-ash-700">·</span>
            <X className="mr-1 inline h-3 w-3 text-ember-500" /> = no
          </p>
        </section>

        {/* Open Source & Get Involved */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-ash-100 sm:text-3xl">
            Open source social media
          </h2>
          <p className="mt-4 text-ash-300 leading-relaxed">
            <F /> isn&apos;t a product — it&apos;s a project. The code is
            public, the moderation prompts are readable, and if you don&apos;t
            like how something works you can propose a change, rally votes, and
            actually fix it.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="border border-ash-800 bg-ash-900/30 p-4">
              <GitFork className="h-5 w-5 text-flame-400" />
              <p className="mt-2 text-sm font-medium text-ash-200">
                Fully open source
              </p>
              <p className="mt-1 text-xs text-ash-500">
                Audit the code, fork it, contribute. If you can read code, you
                can verify every claim we make.
              </p>
            </div>
            <div className="border border-ash-800 bg-ash-900/30 p-4">
              <Heart className="h-5 w-5 text-flame-400" />
              <p className="mt-2 text-sm font-medium text-ash-200">
                Tip-supported
              </p>
              <p className="mt-1 text-xs text-ash-500">
                Tips get you a badge and cosmetics. The platform itself is
                identical for everyone — paying doesn&apos;t buy reach.
              </p>
            </div>
            <div className="border border-ash-800 bg-ash-900/30 p-4">
              <MessageSquare className="h-5 w-5 text-flame-400" />
              <p className="mt-2 text-sm font-medium text-ash-200">
                Built on feedback
              </p>
              <p className="mt-1 text-xs text-ash-500">
                Features come from community proposals and votes, not product
                managers chasing quarterly metrics.
              </p>
            </div>
          </div>
        </section>

        {/* Get Involved */}
        <section className="mt-12 pb-12">
          <p className="text-ash-300 leading-relaxed">
            Have a suggestion? Create a governance proposal. Found a bug?
            Post in{" "}
            <span className="text-flame-400 font-semibold">f</span>
            <span className="text-ash-500 mx-0.5">|</span>
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
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ash-400 transition-colors hover:text-ash-200"
            >
              Security & privacy <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
