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
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SidebarLink {
  icon: typeof Home;
  label: string;
  href: string;
}

export interface SidebarCampfire {
  name: string;
  memberCount: number;
}

interface SidebarProps {
  campfires?: SidebarCampfire[];
  popularCampfires?: SidebarCampfire[];
  open: boolean;
  onClose: () => void;
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

// ---------------------------------------------------------------------------
// SidebarContent — shared inner content for desktop and mobile
// ---------------------------------------------------------------------------

export function SidebarContent({
  campfires = [],
  popularCampfires = [],
  onNavigate,
}: {
  campfires?: SidebarCampfire[];
  popularCampfires?: SidebarCampfire[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [myExpanded, setMyExpanded] = React.useState(true);
  const [popularExpanded, setPopularExpanded] = React.useState(true);

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto p-3">
        {/* Main navigation */}
        <div className="space-y-0.5">
          {mainLinks.map((link) => (
            <SidebarItem
              key={link.href}
              link={link}
              active={pathname === link.href}
              onClick={onNavigate}
            />
          ))}
        </div>

        <div className="lava-rule my-3" />

        {/* Discover */}
        <div className="space-y-0.5">
          <span className="px-3 text-[10px] font-semibold font-mono uppercase tracking-wider text-smoke">
            Discover
          </span>
          {discoverLinks.map((link) => (
            <SidebarItem
              key={link.href}
              link={link}
              active={pathname === link.href}
              onClick={onNavigate}
            />
          ))}
        </div>

        {/* My Campfires */}
        {campfires.length > 0 && (
          <>
            <div className="lava-rule my-3" />
            <button
              onClick={() => setMyExpanded(!myExpanded)}
              aria-expanded={myExpanded}
              aria-label="My Campfires"
              className="flex w-full items-center justify-between px-3 py-1"
            >
              <span className="text-[10px] font-semibold font-mono uppercase tracking-wider text-smoke">
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
                    onClick={onNavigate}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Popular Campfires */}
        {popularCampfires.length > 0 && (
          <>
            <div className="lava-rule my-3" />
            <button
              onClick={() => setPopularExpanded(!popularExpanded)}
              aria-expanded={popularExpanded}
              aria-label="Popular Campfires"
              className="flex w-full items-center justify-between px-3 py-1"
            >
              <span className="text-[10px] font-semibold font-mono uppercase tracking-wider text-smoke">
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
                    onClick={onNavigate}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </nav>

      {/* Create campfire button */}
      <div className="border-t border-lava-hot/10 p-3">
        <Link
          href="/create-campfire"
          onClick={onNavigate}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-lava-hot bg-transparent px-4 py-2 text-sm font-medium font-mono uppercase tracking-wider text-lava-hot transition-all hover:bg-lava-hot hover:text-black"
        >
          <Plus className="h-4 w-4" />
          Create Campfire
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar — Sheet overlay (mobile + menu button trigger)
// ---------------------------------------------------------------------------

export function Sidebar({
  campfires = [],
  popularCampfires = [],
  open,
  onClose,
}: SidebarProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="left"
        className="bg-coal border-lava-hot/10 w-64 sm:w-72 overflow-hidden p-0"
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-lava-hot/10 px-4 py-3">
          <Flame className="h-5 w-5 text-lava-hot" />
          <SheetTitle className="font-bold font-mono truncate">
            <span className="text-flame-400 font-semibold">fuega</span>
            <span className="text-ash">.ai</span>
          </SheetTitle>
        </div>

        <SidebarContent
          campfires={campfires}
          popularCampfires={popularCampfires}
          onNavigate={onClose}
        />
      </SheetContent>
    </Sheet>
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
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-mono transition-colors",
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
        "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-mono transition-colors",
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
