"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/fuega/user-avatar";
import { RARITY_CONFIG, type BadgeRarity } from "@/components/fuega/badge-card";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface UserHoverCardProps {
  username: string;
  children: ReactNode;
  className?: string;
}

interface UserData {
  username: string;
  glow: number;
  created_at: string;
  bio?: string | null;
  primary_badge?: { name: string; rarity: string } | null;
}

// Module-level cache with TTL (5 minutes) and max size (50 entries) with LRU eviction
const USER_CACHE_MAX = 50;
const USER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: UserData;
  accessedAt: number;
  createdAt: number;
}

const userCache = new Map<string, CacheEntry>();

function getCachedUser(username: string): UserData | null {
  const entry = userCache.get(username);
  if (!entry) return null;

  // Check TTL
  if (Date.now() - entry.createdAt > USER_CACHE_TTL_MS) {
    userCache.delete(username);
    return null;
  }

  // Update access time for LRU
  entry.accessedAt = Date.now();
  return entry.data;
}

function setCachedUser(username: string, data: UserData): void {
  // Evict oldest-accessed entry if at capacity
  if (userCache.size >= USER_CACHE_MAX && !userCache.has(username)) {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;
    userCache.forEach((entry, key) => {
      if (entry.accessedAt < oldestAccess) {
        oldestAccess = entry.accessedAt;
        oldestKey = key;
      }
    });
    if (oldestKey) userCache.delete(oldestKey);
  }

  userCache.set(username, {
    data,
    accessedAt: Date.now(),
    createdAt: Date.now(),
  });
}

export function UserHoverCard({ username, children, className }: UserHoverCardProps) {
  const [open, setOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const isHovering = useRef(false);

  const fetchUser = useCallback(async () => {
    // Check cache first
    const cached = getCachedUser(username);
    if (cached) {
      setUserData(cached);
      setOpen(true);
      return;
    }

    setLoading(true);
    try {
      const data = await api.get<UserData>(`/api/users/${username}`);
      setCachedUser(username, data);
      setUserData(data);
      // Only open if still hovering when data arrives
      if (isHovering.current) {
        setOpen(true);
      }
    } catch {
      // Silently fail — don't show popover on error
    } finally {
      setLoading(false);
    }
  }, [username]);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimeout();
    closeTimeout.current = setTimeout(() => {
      if (!isHovering.current) {
        setOpen(false);
      }
    }, 100);
  }, [clearCloseTimeout]);

  const handleMouseEnter = useCallback(() => {
    isHovering.current = true;
    clearCloseTimeout();
    hoverTimeout.current = setTimeout(() => {
      fetchUser();
    }, 300);
  }, [fetchUser, clearCloseTimeout]);

  const handleMouseLeave = useCallback(() => {
    isHovering.current = false;
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    // Small delay before closing to allow moving to the popover
    scheduleClose();
  }, [scheduleClose]);

  const handlePopoverEnter = useCallback(() => {
    isHovering.current = true;
    clearCloseTimeout();
  }, [clearCloseTimeout]);

  const handlePopoverLeave = useCallback(() => {
    isHovering.current = false;
    scheduleClose();
  }, [scheduleClose]);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout.current) {
        clearTimeout(hoverTimeout.current);
      }
      if (closeTimeout.current) {
        clearTimeout(closeTimeout.current);
      }
    };
  }, []);

  const formatJoinDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  const getRarityTextClass = (rarity: string): string => {
    const config = RARITY_CONFIG[rarity as BadgeRarity];
    return config ? config.textClass : "text-smoke";
  };

  const handleFocus = useCallback(() => {
    isHovering.current = true;
    clearCloseTimeout();
    hoverTimeout.current = setTimeout(() => {
      fetchUser();
    }, 300);
  }, [fetchUser, clearCloseTimeout]);

  const handleBlur = useCallback(() => {
    isHovering.current = false;
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    scheduleClose();
  }, [scheduleClose]);

  return (
    <span
      ref={triggerRef}
      className={cn("relative inline-block", className)}
      tabIndex={0}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}

      {open && userData && (
        <div
          ref={popoverRef}
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-1 w-64 rounded-md border border-lava-hot/20 bg-coal/95 p-3 shadow-lg backdrop-blur-md"
          onMouseEnter={handlePopoverEnter}
          onMouseLeave={handlePopoverLeave}
        >
          {/* User header */}
          <div className="flex items-start gap-2.5">
            <UserAvatar username={userData.username} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">
                {userData.username}
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-xs font-mono text-smoke">
                <span title="Glow score">
                  <span className="text-flame-400">{userData.glow ?? 0}</span> glow
                </span>
                <span>·</span>
                <span>Joined {formatJoinDate(userData.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Primary badge */}
          {userData.primary_badge && (
            <div className="mt-2 text-xs">
              <span
                className={cn(
                  "font-medium",
                  getRarityTextClass(userData.primary_badge.rarity),
                )}
              >
                {userData.primary_badge.name}
              </span>
            </div>
          )}

          {/* Bio */}
          {userData.bio && (
            <p className="mt-2 line-clamp-2 text-xs text-ash">
              {userData.bio}
            </p>
          )}

          {/* Profile link */}
          <Link
            href={`/u/${userData.username}`}
            className="mt-2 block text-[10px] font-mono text-flame-400 hover:underline"
          >
            View profile &rarr;
          </Link>
        </div>
      )}
    </span>
  );
}
