import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BadgeCard, InlineBadge, RARITY_CONFIG } from "@/components/fuega/badge-card";
import type { Badge, UserBadge } from "@/lib/api/client";

const MOCK_BADGE: Badge = {
  badge_id: "v1_founder",
  name: "V1 Founder",
  description: "One of the first 5,000 users to join fuega.ai.",
  category: "founder",
  rarity: "legendary",
  version: "v1",
};

const MOCK_EARNED: UserBadge = {
  badge_id: "v1_founder",
  name: "V1 Founder",
  description: "One of the first 5,000 users to join fuega.ai.",
  category: "founder",
  rarity: "legendary",
  earned_at: "2026-01-15T00:00:00Z",
  metadata: { founder_number: 42 },
};

const COMMON_BADGE: Badge = {
  badge_id: "first_post",
  name: "First Flame",
  description: "Published your first post.",
  category: "engagement",
  rarity: "common",
  version: "v1",
};

describe("BadgeCard", () => {
  it("renders badge name", () => {
    render(<BadgeCard badge={MOCK_BADGE} />);
    expect(screen.getByText("V1 Founder")).toBeInTheDocument();
  });

  it("renders rarity label", () => {
    render(<BadgeCard badge={MOCK_BADGE} />);
    expect(screen.getByText("Legendary")).toBeInTheDocument();
  });

  it("renders common rarity label correctly", () => {
    render(<BadgeCard badge={COMMON_BADGE} />);
    expect(screen.getByText("Common")).toBeInTheDocument();
  });

  it("shows lock icon when not earned", () => {
    const { container } = render(<BadgeCard badge={MOCK_BADGE} />);
    // The Lock icon renders as an SVG; we check for the opacity-40 class on parent
    const iconContainer = container.querySelector(".opacity-40");
    expect(iconContainer).toBeInTheDocument();
  });

  it("does not show lock icon when earned", () => {
    const { container } = render(<BadgeCard badge={MOCK_BADGE} earned={MOCK_EARNED} />);
    const locked = container.querySelector(".opacity-40");
    expect(locked).not.toBeInTheDocument();
  });

  it("shows founder number when earned with metadata", () => {
    render(<BadgeCard badge={MOCK_BADGE} earned={MOCK_EARNED} />);
    expect(screen.getByText("#0042")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<BadgeCard badge={MOCK_BADGE} onClick={onClick} />);

    const button = screen.getByRole("button");
    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders progress bar when showProgress is true", () => {
    render(
      <BadgeCard
        badge={COMMON_BADGE}
        showProgress
        progress={{ current: 30, target: 100 }}
      />,
    );
    expect(screen.getByText("30/100")).toBeInTheDocument();
  });

  it("does not render progress bar when badge is earned", () => {
    const earned: UserBadge = {
      ...MOCK_EARNED,
      badge_id: "first_post",
      name: "First Flame",
      rarity: "common",
    };
    render(
      <BadgeCard
        badge={COMMON_BADGE}
        earned={earned}
        showProgress
        progress={{ current: 30, target: 100 }}
      />,
    );
    expect(screen.queryByText("30/100")).not.toBeInTheDocument();
  });
});

describe("InlineBadge", () => {
  it("renders badge name", () => {
    render(<InlineBadge badge={MOCK_BADGE} />);
    expect(screen.getByText("V1 Founder")).toBeInTheDocument();
  });

  it("shows founder number when provided", () => {
    render(<InlineBadge badge={MOCK_BADGE} founderNumber={42} />);
    expect(screen.getByText("#0042")).toBeInTheDocument();
  });

  it("applies correct rarity text color", () => {
    const { container } = render(<InlineBadge badge={MOCK_BADGE} />);
    const span = container.querySelector("span");
    // Legendary color class
    expect(span?.className).toContain("text-[#F97316]");
  });
});

describe("RARITY_CONFIG", () => {
  it("has all five rarity levels", () => {
    const rarities = Object.keys(RARITY_CONFIG);
    expect(rarities).toEqual(["common", "uncommon", "rare", "epic", "legendary"]);
  });

  it("legendary uses orange color", () => {
    expect(RARITY_CONFIG.legendary.hex).toBe("#F97316");
  });

  it("common has no glow class", () => {
    expect(RARITY_CONFIG.common.glowClass).toBe("");
  });

  it("rare uses badge-shimmer glow class", () => {
    expect(RARITY_CONFIG.rare.glowClass).toBe("badge-shimmer");
  });
});
