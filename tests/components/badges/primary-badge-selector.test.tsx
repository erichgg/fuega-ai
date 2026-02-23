import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PrimaryBadgeSelector } from "@/components/fuega/primary-badge-selector";
import type { Badge, UserBadge } from "@/lib/api/client";

const BADGES: Badge[] = [
  { badge_id: "v1_founder", name: "V1 Founder", description: "First 5000.", category: "founder", rarity: "legendary", version: "v1" },
  { badge_id: "first_post", name: "First Flame", description: "First post.", category: "engagement", rarity: "common", version: "v1" },
  { badge_id: "spark_collector", name: "Spark Collector", description: "100 sparks.", category: "contribution", rarity: "uncommon", version: "v1" },
];

const EARNED: UserBadge[] = [
  { badge_id: "v1_founder", name: "V1 Founder", description: "First 5000.", category: "founder", rarity: "legendary", earned_at: "2026-01-15T00:00:00Z", metadata: { founder_number: 42 } },
  { badge_id: "first_post", name: "First Flame", description: "First post.", category: "engagement", rarity: "common", earned_at: "2026-01-16T00:00:00Z", metadata: null },
];

describe("PrimaryBadgeSelector", () => {
  it("renders earned badges when open", () => {
    render(
      <PrimaryBadgeSelector
        open={true}
        onOpenChange={() => {}}
        badges={BADGES}
        earnedBadges={EARNED}
        currentPrimary="v1_founder"
        onSelect={() => {}}
      />,
    );

    expect(screen.getByText("V1 Founder")).toBeInTheDocument();
    expect(screen.getByText("First Flame")).toBeInTheDocument();
    // Unearned badges should not appear
    expect(screen.queryByText("Spark Collector")).not.toBeInTheDocument();
  });

  it("calls onSelect when badge is clicked", () => {
    const onSelect = vi.fn();
    render(
      <PrimaryBadgeSelector
        open={true}
        onOpenChange={() => {}}
        badges={BADGES}
        earnedBadges={EARNED}
        currentPrimary="v1_founder"
        onSelect={onSelect}
      />,
    );

    // Click "First Flame"
    const firstFlame = screen.getByText("First Flame").closest("button");
    firstFlame?.click();

    expect(onSelect).toHaveBeenCalledWith("first_post");
  });

  it("shows empty state with no earned badges", () => {
    render(
      <PrimaryBadgeSelector
        open={true}
        onOpenChange={() => {}}
        badges={BADGES}
        earnedBadges={[]}
        currentPrimary={null}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByText(/no badges earned yet/)).toBeInTheDocument();
  });

  it("sorts badges by rarity (legendary first)", () => {
    const { container } = render(
      <PrimaryBadgeSelector
        open={true}
        onOpenChange={() => {}}
        badges={BADGES}
        earnedBadges={EARNED}
        currentPrimary={null}
        onSelect={() => {}}
      />,
    );

    const buttons = container.querySelectorAll("button[type='button']");
    // First button (after any dialog chrome) should be the legendary badge
    const texts = Array.from(buttons).map((b) => b.textContent);
    const founderIdx = texts.findIndex((t) => t?.includes("V1 Founder"));
    const flameIdx = texts.findIndex((t) => t?.includes("First Flame"));

    if (founderIdx !== -1 && flameIdx !== -1) {
      expect(founderIdx).toBeLessThan(flameIdx);
    }
  });
});
