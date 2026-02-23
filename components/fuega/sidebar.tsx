"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  TrendingUp,
  Clock,
  Users,
  Bot,
  Vote,
  ChevronDown,
  ChevronRight,
  Flame,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SidebarLink {
  icon: typeof Home;
  label: string;
  href: string;
}

interface SidebarCampfire {
  name: string;
  memberCount: number;
}

interface SidebarProps {
  campfires?: SidebarCampfire[];
  popularCampfires?: SidebarCampfire[];
  open?: boolean;
  onClose?: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Link definitions
// ---------------------------------------------------------------------------

const mainLinks: SidebarLink[] = [
  { icon: Home, label: "Home", href: "/home" },
  { icon: TrendingUp, label: "Trending", href: "/trending" },
  { icon: Clock, label: "New", href: "/new" },
];

const discoverLinks: SidebarLink[] = [
  { icon: Users, label: "Campfires", href: "/campfires" },
  { icon: Bot, label: "Mod Log", href: "/mod-log" },
  { icon: Vote, label: "Governance", href: "/governance" },
];

const defaultPopular: SidebarCampfire[] = [
  { name: "tech", memberCount: 12400 },
  { name: "science", memberCount: 8900 },
  { name: "gaming", memberCount: 15200 },
  { name: "music", memberCount: 6700 },
];

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export function Sidebar({
  campfires = [],
  popularCampfires = defaultPopular,
  open = true,
  onClose,
  className,
}: SidebarProps) {
  const pathname = usePathname();
  const [myExpanded, setMyExpanded] = React.useState(true);
  const [popularExpanded, setPopularExpanded] = React.useState(true);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-void/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-14 z-30 flex h-[calc(100vh-3.5rem)] w-64 flex-col border-r border-lava-hot/10 bg-coal transition-transform lg:sticky lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
          className,
        )}
        role="complementary"
        aria-label="Sidebar navigation"
      >
        <nav className="flex-1 overflow-y-auto p-3">
          {/* Main navigation */}
          <div className="space-y-0.5">
            {mainLinks.map((link) => (
              <SidebarItem
                key={link.href}
                link={link}
                active={pathname === link.href}
                onClick={onClose}
              />
            ))}
          </div>

          <div className="lava-rule my-3" />

          {/* Discover */}
          <div className="space-y-0.5">
            <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-smoke">
              Discover
            </span>
            {discoverLinks.map((link) => (
              <SidebarItem
                key={link.href}
                link={link}
                active={pathname === link.href}
                onClick={onClose}
              />
            ))}
          </div>

          {/* My Campfires */}
          {campfires.length > 0 && (
            <>
              <div className="lava-rule my-3" />
              <button
                onClick={() => setMyExpanded(!myExpanded)}
                className="flex w-full items-center justify-between px-3 py-1"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-smoke">
                  My Campfires
                </span>
                {myExpanded ? (
                  <ChevronDown className="h-3 w-3 text-smoke" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-smoke" />
                )}
              </button>
              {myExpanded && (
                <div className="mt-1 space-y-0.5">
                  {campfires.map((c) => (
                    <CampfireLink
                      key={c.name}
                      campfire={c}
                      active={pathname === `/f/${c.name}`}
                      onClick={onClose}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Popular Campfires */}
          <div className="lava-rule my-3" />
          <button
            onClick={() => setPopularExpanded(!popularExpanded)}
            className="flex w-full items-center justify-between px-3 py-1"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-smoke">
              Popular
            </span>
            {popularExpanded ? (
              <ChevronDown className="h-3 w-3 text-smoke" />
            ) : (
              <ChevronRight className="h-3 w-3 text-smoke" />
            )}
          </button>
          {popularExpanded && (
            <div className="mt-1 space-y-0.5">
              {popularCampfires.map((c) => (
                <CampfireLink
                  key={c.name}
                  campfire={c}
                  active={pathname === `/f/${c.name}`}
                  onClick={onClose}
                />
              ))}
            </div>
          )}
        </nav>

        {/* Create campfire button */}
        <div className="border-t border-lava-hot/10 p-3">
          <Link
            href="/create-campfire"
            className="flex w-full items-center justify-center gap-2 border border-lava-hot bg-transparent px-4 py-2 text-sm font-medium uppercase tracking-wider text-lava-hot transition-all hover:bg-lava-hot hover:text-black"
          >
            <Plus className="h-4 w-4" />
            Create Campfire
          </Link>
        </div>
      </aside>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SidebarItem({
  link,
  active,
  onClick,
}: {
  link: SidebarLink;
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2 text-sm transition-colors",
        active
          ? "bg-lava-hot/10 font-medium text-lava-hot border-r-2 border-lava-hot"
          : "text-ash hover:bg-charcoal/50 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {link.label}
    </Link>
  );
}

function CampfireLink({
  campfire,
  active,
  onClick,
}: {
  campfire: SidebarCampfire;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={`/f/${campfire.name}`}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 text-sm transition-colors",
        active
          ? "text-lava-hot font-medium"
          : "text-ash hover:bg-charcoal/50 hover:text-foreground",
      )}
    >
      <Flame className="h-3.5 w-3.5 text-lava-hot/60 shrink-0" />
      <span className="truncate">
        <span className="text-lava-hot">f</span>
        <span className="text-smoke mx-0.5">|</span>
        <span>{campfire.name}</span>
      </span>
      <span className="ml-auto text-[10px] text-smoke shrink-0">
        {campfire.memberCount >= 1000
          ? `${(campfire.memberCount / 1000).toFixed(1)}k`
          : campfire.memberCount}
      </span>
    </Link>
  );
}
