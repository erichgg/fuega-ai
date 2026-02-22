import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Flame,
  Check,
  X,
  Minus,
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
    feature: "No premium tiers",
    reddit: "no",
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
];

function CellIcon({ value }: { value: CellValue }) {
  switch (value) {
    case "yes":
      return <Check className="mx-auto h-4 w-4 text-flame-400" />;
    case "no":
      return <X className="mx-auto h-4 w-4 text-ash-600" />;
    case "partial":
      return <Minus className="mx-auto h-4 w-4 text-ash-500" />;
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
        <section className="mt-8 max-w-3xl">
          <h1 className="text-3xl font-bold text-ash-100 sm:text-4xl">
            Why <F /> exists
          </h1>
          <p className="mt-5 text-base leading-relaxed text-ash-300">
            Online discussion is broken. Not because people are bad — but because
            platforms profit from outrage, sell your data, and hide how they
            moderate. <F /> is different. Communities write their own rules, vote
            on them, and AI enforces exactly what was decided — nothing more.
            Every decision is public. Every prompt is auditable. No corporate
            overlords. No hidden algorithms.
          </p>
          <p className="mt-4 text-base leading-relaxed text-ash-400">
            No ads. No premium tiers. No data harvesting. <F /> is
            tip-supported — if you want to help keep the lights on, you get a
            badge and some cosmetics. That&apos;s the entire business model.
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
            <Check className="mr-1 inline h-3 w-3 text-flame-400" /> = yes
            <span className="mx-2 text-ash-700">·</span>
            <Minus className="mr-1 inline h-3 w-3 text-ash-500" /> = partial / inconsistent
            <span className="mx-2 text-ash-700">·</span>
            <X className="mr-1 inline h-3 w-3 text-ash-600" /> = no
          </p>
        </section>

        {/* Team */}
        <section className="mt-12 max-w-3xl">
          <h2 className="text-2xl font-bold text-ash-100 sm:text-3xl">
            The team
          </h2>
          <p className="mt-4 text-ash-300 leading-relaxed">
            <F /> is built by a small team that practices what we preach. We
            operate anonymously — just like our users. We don&apos;t believe
            knowing our names makes the platform better. What matters is the
            code, the transparency, and the community.
          </p>
          <div className="mt-6 border border-ash-800 bg-ash-900/30 p-5">
            <div className="flex items-center gap-3">
              <Flame className="h-5 w-5 text-flame-400" />
              <div>
                <p className="text-sm font-medium text-ash-200">
                  Open source contributors welcome
                </p>
                <p className="text-xs text-ash-400">
                  The platform is built in the open. Contributions, audits, and
                  feedback are always welcome.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="mt-12 max-w-3xl pb-12">
          <h2 className="text-2xl font-bold text-ash-100 sm:text-3xl">
            Contact
          </h2>
          <p className="mt-4 text-ash-300">
            The best way to reach us is through the platform itself. Have a
            suggestion? Create a governance proposal. Found a bug? Post in{" "}
            <span className="text-flame-400 font-semibold">f</span>
            <span className="text-ash-500 mx-0.5">|</span>
            <span className="text-flame-400 font-semibold">meta</span>.
            Security concern? See our{" "}
            <Link href="/security" className="text-flame-400 hover:underline">
              security page
            </Link>{" "}
            for responsible disclosure.
          </p>
        </section>
      </main>
    </div>
  );
}
