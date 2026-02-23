"use client";

import * as React from "react";
import { Users } from "lucide-react";
import { useReferralLink, useReferralStats, useReferralHistory } from "@/lib/hooks/useReferrals";
import { ReferralLink } from "@/components/fuega/referral-link";
import { ReferralShare } from "@/components/fuega/referral-share";
import { ReferralProgress } from "@/components/fuega/referral-progress";
import { ReferralHistory } from "@/components/fuega/referral-history";

export default function ReferralDashboardPage() {
  const { referralLink, loading: linkLoading } = useReferralLink();
  const { stats, loading: statsLoading } = useReferralStats();
  const { history, loading: historyLoading } = useReferralHistory();

  const isLoading = linkLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-smoke">
          <span className="text-lava-hot font-bold">$ </span>
          loading referral dashboard...
          <span className="inline-block w-2 h-4 bg-lava-hot ml-1 cursor-blink align-middle" />
        </p>
      </div>
    );
  }

  const referralCount = stats?.referral_count ?? 0;

  return (
    <div className="py-4 sm:py-6 lg:py-8 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          <span className="text-lava-hot font-bold">$ </span>
          referrals
        </h1>
        <p className="text-xs text-ash mt-1">
          Invite friends to <span className="text-lava-hot font-semibold">fuega</span> and earn referral badges
        </p>
      </div>

      {/* Referral count */}
      <div className="terminal-card p-6 flex items-center gap-4">
        <div className="w-14 h-14 flex items-center justify-center bg-lava-hot/10 border border-lava-hot/20">
          <Users className="w-6 h-6 text-lava-hot" />
        </div>
        <div>
          <p className="text-3xl font-bold text-lava-hot glow-text-subtle">
            {referralCount.toLocaleString()}
          </p>
          <p className="text-xs text-ash">
            {referralCount === 1 ? "person referred" : "people referred"}
          </p>
        </div>
        {stats?.next_badge_name && stats.next_badge_at && (
          <div className="ml-auto text-right hidden sm:block">
            <p className="text-xs text-smoke">Next badge at</p>
            <p className="text-sm font-semibold text-foreground">
              {stats.next_badge_at} referrals
            </p>
            <p className="text-xs text-ash">{stats.next_badge_name}</p>
          </div>
        )}
      </div>

      {/* Referral link */}
      {referralLink && <ReferralLink referralLink={referralLink} />}

      {/* Share buttons */}
      {referralLink && <ReferralShare referralLink={referralLink} />}

      {/* Badge progress */}
      <ReferralProgress currentCount={referralCount} />

      {/* Referral history */}
      <ReferralHistory history={history} loading={historyLoading} />
    </div>
  );
}
