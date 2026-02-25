import type { Metadata } from "next";
import Link from "next/link";
import { Heart, Shield, Zap, Star } from "lucide-react";

export const metadata: Metadata = {
  title: "Supporters",
  description:
    "Support fuega.ai and help keep the platform free, open, and ad-free.",
  openGraph: {
    title: "Supporters — fuega.ai",
    description:
      "Support fuega.ai and help keep the platform free, open, and ad-free.",
  },
};

const tiers = [
  {
    icon: Heart,
    name: "Kindling",
    price: "Free",
    description: "Everyone starts here. Full access to all features.",
    features: [
      "Join unlimited campfires",
      "Create posts and comments",
      "Vote on governance proposals",
      "Full moderation transparency",
    ],
  },
  {
    icon: Zap,
    name: "Ember",
    price: "Coming Soon",
    description: "Support the platform and get cosmetic perks.",
    features: [
      "Everything in Kindling",
      "Exclusive profile cosmetics",
      "Custom brand colors",
      "Supporter badge",
    ],
  },
  {
    icon: Star,
    name: "Blaze",
    price: "Coming Soon",
    description: "For power users who want to fuel the fire.",
    features: [
      "Everything in Ember",
      "Early access to new features",
      "Priority support",
      "Name in the supporters wall",
    ],
  },
];

export default function SupportersPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            Support{" "}
            <span className="text-flame-400 font-semibold">fuega</span>.ai
          </h1>
          <p className="mt-4 text-lg text-ash leading-relaxed max-w-2xl mx-auto">
            fuega.ai is ad-free and always will be. Supporters help keep the
            servers running and the platform independent.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            return (
              <div
                key={tier.name}
                className="rounded-lg border border-charcoal bg-charcoal/30 p-6 flex flex-col"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-flame-400" />
                  <h2 className="text-lg font-semibold text-foreground">
                    {tier.name}
                  </h2>
                </div>
                <p className="mt-1 text-xl font-bold text-flame-400">
                  {tier.price}
                </p>
                <p className="mt-2 text-sm text-ash">{tier.description}</p>
                <ul className="mt-4 flex-1 space-y-2">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-ash"
                    >
                      <Shield className="mt-0.5 h-3.5 w-3.5 text-flame-400/60 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-12 rounded-lg border border-charcoal bg-coal/50 p-6 text-center">
          <p className="text-sm text-ash">
            Supporter tiers are coming soon. In the meantime, the best way to
            support fuega.ai is to use it, create communities, and invite others.
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm text-smoke hover:text-flame-400 transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
