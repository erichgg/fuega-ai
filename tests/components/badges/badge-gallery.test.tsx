import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BadgeGallery } from "@/components/fuega/badge-gallery";
import type { Badge, UserBadge } from "@/lib/api/client";

const BADGES: Badge[] = [
  { badge_id: "v1_founder", name: "V1 Founder", description: "First 5000 users.", category: "founder", rarity: "legendary", version: "v1" },
  { badge_id: "first_post", name: "First Flame", description: "First post.", category: "engagement", rarity: "common", version: "v1" },
  { badge_id: "spark_collector", name: "Spark Collector", description: "100 sparks.", category: "contribution", rarity: "uncommon", version: "v1" },
  { badge_id: "first_vote", name: "Civic Duty", description: "First governance vote.", category: "governance", rarity: "common", version: "v1" },
  { badge_id: "first_referral", name: "Spark Spreader", description: "First referral.", category: "referral", rarity: "common", version: "v1" },
  { badge_id: "supporter", name: "Supporter", description: "Made a donation.", category: "special", rarity: "rare", version: "v1" },
];

const EARNED: UserBadge[] = [
  { badge_id: "v1_founder", name: "V1 Founder", description: "First 5000.", category: "founder", rarity: "legendary", earned_at: "2026-01-15T00:00:00Z", metadata: { founder_number: 42 } },
  { badge_id: "first_post", name: "First Flame", description: "First post.", category: "engagement", rarity: "common", earned_at: "2026-01-16T00:00:00Z", metadata: null },
];

describe("BadgeGallery", () => {
  it("renders all badges", () => {
    render(<BadgeGallery badges={BADGES} />);
    expect(screen.getByText("V1 Founder")).toBeInTheDocument();
    expect(screen.getByText("First Flame")).toBeInTheDocument();
    expect(screen.getByText("Supporter")).toBeInTheDocument();
  });

  it("shows earned count", () => {
    render(<BadgeGallery badges={BADGES} earnedBadges={EARNED} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/\/ 6 earned/)).toBeInTheDocument();
  });

  it("filters by category when tab clicked", () => {
    render(<BadgeGallery badges={BADGES} />);

    // Click "Founder" category tab (matches "Founder (1)" button text)
    const founderTab = screen.getByRole("button", { name: /^Founder\s/ });
    fireEvent.click(founderTab);

    // Only founder badge should be visible
    expect(screen.getByText("V1 Founder")).toBeInTheDocument();
    expect(screen.queryByText("First Flame")).not.toBeInTheDocument();
  });

  it("filters back to all when All tab clicked", () => {
    render(<BadgeGallery badges={BADGES} />);

    // Click Founder then All
    fireEvent.click(screen.getByText(/^Founder/));
    expect(screen.queryByText("First Flame")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/^All/));
    expect(screen.getByText("First Flame")).toBeInTheDocument();
  });

  it("shows empty state when no badges match filter", () => {
    // Only founder badges
    const founderOnly: Badge[] = [BADGES[0]!];

    render(<BadgeGallery badges={founderOnly} />);
    fireEvent.click(screen.getByText(/Engagement/));

    expect(screen.getByText(/no badges found/)).toBeInTheDocument();
  });

  it("calls onBadgeClick when a badge is clicked", () => {
    const onClick = vi.fn();
    render(<BadgeGallery badges={BADGES} onBadgeClick={onClick} />);

    const founderButton = screen.getByText("V1 Founder").closest("button");
    founderButton?.click();

    expect(onClick).toHaveBeenCalledWith(BADGES[0]);
  });
});
