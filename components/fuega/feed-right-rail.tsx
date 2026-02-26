"use client";

import * as React from "react";
import Link from "next/link";
import { Flame, TrendingUp, Users, Vote, Award } from "lucide-react";
import { api } from "@/lib/api/client";
import type { Campfire, Proposal } from "@/lib/api/client";

export function FeedRightRail() {
  const [trendingCampfires, setTrendingCampfires] = React.useState<Campfire[]>([]);
  const [activeProposals, setActiveProposals] = React.useState<Proposal[]>([]);

  React.useEffect(() => {
    api
      .get<{ campfires: Campfire[] }>("/api/campfires", { limit: 5 })
      .then((res) => setTrendingCampfires(res.campfires))
      .catch(() => {});

    api
      .get<{ proposals: Proposal[] }>("/api/proposals", { status: "voting" })
      .then((res) => setActiveProposals(res.proposals.slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <aside className="hidden xl:flex flex-col gap-4 w-72 shrink-0">
      {/* Trending campfires */}
      <div className="rounded-lg border border-charcoal bg-charcoal/30 p-3">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-3 font-mono">
          <TrendingUp className="h-3.5 w-3.5 text-lava-hot" />
          Trending Campfires
        </h3>
        {trendingCampfires.length === 0 ? (
          <p className="text-[10px] text-smoke">No campfires yet</p>
        ) : (
          <div className="space-y-2">
            {trendingCampfires.map((c) => (
              <Link
                key={c.id}
                href={`/f/${c.name}`}
                className="flex items-center gap-2 group"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-coal border border-charcoal shrink-0">
                  <Flame className="h-3 w-3 text-flame-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-mono text-foreground group-hover:text-flame-400 transition-colors truncate block">
                    <span className="text-flame-400">f</span>
                    <span className="text-smoke mx-0.5">|</span>
                    {c.name}
                  </span>
                  <span className="text-[10px] text-smoke flex items-center gap-1">
                    <Users className="h-2.5 w-2.5" />
                    {(c.member_count ?? 0).toLocaleString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
        <Link
          href="/campfires"
          className="mt-3 block text-[10px] text-flame-400 hover:underline font-mono"
        >
          Browse all →
        </Link>
      </div>

      {/* Active governance */}
      {activeProposals.length > 0 && (
        <div className="rounded-lg border border-charcoal bg-charcoal/30 p-3">
          <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-3 font-mono">
            <Vote className="h-3.5 w-3.5 text-lava-hot" />
            Active Votes
          </h3>
          <div className="space-y-2">
            {activeProposals.map((p) => {
              const total = p.votes_for + p.votes_against;
              const forPct = total > 0 ? Math.round((p.votes_for / total) * 100) : 0;
              return (
                <Link
                  key={p.id}
                  href={`/governance/${p.id}`}
                  className="block group"
                >
                  <p className="text-xs text-foreground group-hover:text-flame-400 transition-colors line-clamp-1">
                    {p.title}
                  </p>
                  {total > 0 && (
                    <div className="mt-1 flex h-1 overflow-hidden rounded-full bg-charcoal">
                      <div
                        className="bg-green-500"
                        style={{ width: `${forPct}%` }}
                      />
                      <div
                        className="bg-red-500"
                        style={{ width: `${100 - forPct}%` }}
                      />
                    </div>
                  )}
                  <p className="text-[10px] text-smoke mt-0.5">
                    {total} votes · {forPct}% for
                  </p>
                </Link>
              );
            })}
          </div>
          <Link
            href="/governance"
            className="mt-3 block text-[10px] text-flame-400 hover:underline font-mono"
          >
            All proposals →
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="rounded-lg border border-charcoal bg-charcoal/30 p-3">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-3 font-mono">
          <Award className="h-3.5 w-3.5 text-lava-hot" />
          Quick Links
        </h3>
        <div className="space-y-1.5">
          {[
            { href: "/badges", label: "Badge Gallery" },
            { href: "/mod-log", label: "Mod Log" },
            { href: "/about", label: "About fuega" },
            { href: "/how-it-works", label: "How It Works" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block text-xs text-ash hover:text-flame-400 transition-colors font-mono"
            >
              → {link.label}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
