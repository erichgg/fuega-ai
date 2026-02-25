import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Scale, Eye, Users, Lock, BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Principles",
  description:
    "The platform-level Principles that apply to every campfire on fuega.ai — immutable, non-negotiable, enforced in every Tender.",
  openGraph: {
    title: "Principles — fuega.ai",
    description:
      "The platform-level Principles that apply to every campfire on fuega.ai.",
  },
};

const principles = [
  {
    icon: Shield,
    title: "No Harm",
    description:
      "Content that promotes violence, harassment, or endangers individuals is never allowed. This applies universally — no campfire can override it.",
  },
  {
    icon: Scale,
    title: "Transparency",
    description:
      "Every AI moderation decision is logged publicly. Campfire members can see why content was approved, flagged, or removed — and by what reasoning.",
  },
  {
    icon: Eye,
    title: "Privacy First",
    description:
      "We never store raw IP addresses. All identifying data is hashed with rotating salts and deleted within 30 days. We never sell user data.",
  },
  {
    icon: Users,
    title: "Community Sovereignty",
    description:
      "Each campfire governs itself through governance variables and campfire voting. The platform sets the floor — campfires set the ceiling.",
  },
  {
    icon: Lock,
    title: "No Manipulation",
    description:
      "Vote counts are fuzzed to prevent gaming. Coordinated manipulation, spam, and bot activity are prohibited across all campfires.",
  },
  {
    icon: BookOpen,
    title: "Accountability",
    description:
      "Moderation appeals are a right, not a privilege. Every removed post can be appealed, and appeal decisions are also logged publicly.",
  },
];

export default function PrinciplesPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            The <span className="text-flame-400 font-semibold">fuega</span> Principles
          </h1>
          <p className="mt-4 text-lg text-ash leading-relaxed">
            These are the immutable, platform-level rules enforced in every
            campfire&apos;s Tender. No campfire can override them.
            They exist to protect people.
          </p>
        </div>

        <div className="mt-12 space-y-6">
          {principles.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="rounded-lg border border-charcoal bg-charcoal/30 p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-flame-500/10 border border-flame-500/20">
                    <Icon className="h-5 w-5 text-flame-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {p.title}
                  </h2>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ash">
                  {p.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 rounded-lg border border-charcoal bg-coal/50 p-6 text-center">
          <p className="text-sm text-ash">
            These Principles are baked into every Tender — the compiled AI
            governance prompt that moderates each campfire. They cannot be
            removed or weakened by campfire settings.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/how-it-works"
              className="text-sm text-flame-400 hover:underline"
            >
              How governance works
            </Link>
            <Link
              href="/home"
              className="text-sm text-smoke hover:text-ash"
            >
              Browse campfires
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
