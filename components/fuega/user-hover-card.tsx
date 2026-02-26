"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/fuega/user-avatar";
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

// Module-level cache to avoid refetching on subsequent hovers
const userCache = new Map<string, UserData>();

export function UserHoverCard({ username, children, className }: UserHoverCardProps) {
  const [open, setOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const isHovering = useRef(false);

  const fetchUser = useCallback(async () => {
    // Check cache first
    const cached = userCache.get(username);
    if (cached) {
      setUserData(cached);
      setOpen(true);
      return;
    }

    setLoading(true);
    try {
      const data = await api.get<UserData>(`/api/users/${username}`);
      userCache.set(username, data);
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

  const handleMouseEnter = useCallback(() => {
    isHovering.current = true;
    hoverTimeout.current = setTimeout(() => {
      fetchUser();
    }, 300);
  }, [fetchUser]);

  const handleMouseLeave = useCallback(() => {
    isHovering.current = false;
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    // Small delay before closing to allow moving to the popover
    setTimeout(() => {
      if (!isHovering.current) {
        setOpen(false);
      }
    }, 100);
  }, []);

  const handlePopoverEnter = useCallback(() => {
    isHovering.current = true;
  }, []);

  const handlePopoverLeave = useCallback(() => {
    isHovering.current = false;
    setTimeout(() => {
      if (!isHovering.current) {
        setOpen(false);
      }
    }, 100);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeout.current) {
        clearTimeout(hoverTimeout.current);
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

  const rarityColor: Record<string, string> = {
    common: "text-smoke",
    uncommon: "text-green-400",
    rare: "text-blue-400",
    epic: "text-purple-400",
    legendary: "text-amber-400",
  };

  return (
    <span
      ref={triggerRef}
      className={cn("relative inline-block", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {open && userData && (
        <div
          ref={popoverRef}
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
                  rarityColor[userData.primary_badge.rarity] ?? "text-smoke",
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
