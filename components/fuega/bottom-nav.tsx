"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Flame, Plus, Bell, User } from "lucide-react";
import { useAuth } from "@/lib/contexts/auth-context";
import { cn } from "@/lib/utils";

interface NavTab {
  label: string;
  icon: typeof Home;
  href: string;
  /** Match pathname prefix for active state */
  match: (pathname: string) => boolean;
  accent?: boolean;
}

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Context-aware create link: if on a campfire page, pre-fill campfire
  const campfireMatch = pathname.match(/^\/f\/([^/]+)/);
  const createHref = campfireMatch?.[1]
    ? `/submit?campfire=${encodeURIComponent(campfireMatch[1])}`
    : "/submit";

  const tabs: NavTab[] = [
    {
      label: "Home",
      icon: Home,
      href: "/home",
      match: (p) => p === "/home" || p === "/",
    },
    {
      label: "Campfires",
      icon: Flame,
      href: "/campfires",
      match: (p) => p === "/campfires",
    },
    {
      label: "Create",
      icon: Plus,
      href: createHref,
      match: (p) => p.startsWith("/submit"),
      accent: true,
    },
    {
      label: "Alerts",
      icon: Bell,
      href: "/notifications",
      match: (p) => p.startsWith("/notifications"),
    },
    {
      label: "Profile",
      icon: User,
      href: user ? `/u/${user.username}` : "/login",
      match: (p) =>
        user ? p.startsWith(`/u/${user.username}`) : p === "/login",
    },
  ];

  // TODO: replace with real unread count from notifications context
  const hasUnread = false;

  return (
    <nav
      aria-label="Mobile navigation"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 md:hidden",
        "h-14 bg-void/95 backdrop-blur-sm border-t border-lava-hot/10",
        "flex items-stretch",
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.match(pathname);

        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5",
              "transition-colors relative",
              "min-h-[44px]",
              active ? "text-lava-hot" : "text-smoke",
            )}
            aria-current={active ? "page" : undefined}
          >
            {/* Accent ring for Create button */}
            {tab.accent ? (
              <span
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full",
                  "border-2",
                  active
                    ? "border-lava-hot bg-lava-hot/10"
                    : "border-lava-hot/50 bg-coal/80",
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
            ) : (
              <span className="relative">
                <Icon className="h-5 w-5" />
                {/* Notification dot */}
                {tab.label === "Alerts" && hasUnread && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-lava-hot" />
                )}
              </span>
            )}

            <span className="text-[10px] font-mono leading-none">
              {tab.label}
            </span>

            {/* Active dot indicator */}
            {active && !tab.accent && (
              <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-lava-hot" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
