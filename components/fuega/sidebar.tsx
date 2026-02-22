"use client";

import * as React from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface SidebarLink {
  icon: typeof Home;
  label: string;
  href: string;
  active?: boolean;
}

interface SidebarCommunity {
  name: string;
  memberCount: number;
}

interface SidebarProps {
  communities?: SidebarCommunity[];
  activePath?: string;
  open?: boolean;
  onClose?: () => void;
  className?: string;
}

const mainLinks: SidebarLink[] = [
  { icon: Home, label: "Home", href: "/" },
  { icon: TrendingUp, label: "Trending", href: "/trending" },
  { icon: Clock, label: "New", href: "/new" },
];

const discoverLinks: SidebarLink[] = [
  { icon: Users, label: "Communities", href: "/communities" },
  { icon: Bot, label: "Mod Log", href: "/mod-log" },
  { icon: Vote, label: "Governance", href: "/governance" },
];

export function Sidebar({
  communities = [],
  activePath = "/",
  open = true,
  onClose,
  className,
}: SidebarProps) {
  const [communitiesExpanded, setCommunitiesExpanded] = React.useState(true);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-14 z-30 flex h-[calc(100vh-3.5rem)] w-64 flex-col border-r border-ash-800 bg-ash-950 transition-transform lg:sticky lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
          className,
        )}
      >
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {mainLinks.map((link) => (
              <SidebarItem
                key={link.href}
                link={link}
                active={activePath === link.href}
              />
            ))}
          </div>

          <Separator className="my-3 bg-ash-800" />

          <div className="space-y-1">
            <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-ash-600">
              Discover
            </span>
            {discoverLinks.map((link) => (
              <SidebarItem
                key={link.href}
                link={link}
                active={activePath === link.href}
              />
            ))}
          </div>

          {communities.length > 0 && (
            <>
              <Separator className="my-3 bg-ash-800" />
              <button
                onClick={() => setCommunitiesExpanded(!communitiesExpanded)}
                className="flex w-full items-center justify-between px-3 py-1"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ash-600">
                  My Communities
                </span>
                {communitiesExpanded ? (
                  <ChevronDown className="h-3 w-3 text-ash-600" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-ash-600" />
                )}
              </button>
              {communitiesExpanded && (
                <div className="mt-1 space-y-0.5">
                  {communities.map((c) => (
                    <a
                      key={c.name}
                      href={`/f/${c.name}`}
                      className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-ash-400 transition-colors hover:bg-ash-800/50 hover:text-ash-200"
                    >
                      <Flame className="h-3.5 w-3.5 text-flame-500" />
                      <span className="truncate"><span className="text-lava-hot">f</span><span className="text-smoke mx-1">|</span><span>{c.name}</span></span>
                      <span className="ml-auto text-[10px] text-ash-600">
                        {c.memberCount}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </nav>

        <div className="border-t border-ash-800 p-3">
          <Button variant="spark" className="w-full gap-2" size="sm">
            <Flame className="h-4 w-4" />
            Create Community
          </Button>
        </div>
      </aside>
    </>
  );
}

function SidebarItem({
  link,
  active,
}: {
  link: SidebarLink;
  active: boolean;
}) {
  const Icon = link.icon;
  return (
    <a
      href={link.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-ash-800/80 font-medium text-flame-400"
          : "text-ash-400 hover:bg-ash-800/50 hover:text-ash-200",
      )}
    >
      <Icon className="h-4 w-4" />
      {link.label}
    </a>
  );
}
