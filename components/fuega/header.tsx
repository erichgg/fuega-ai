"use client";

import * as React from "react";
import { Search, Bell, Menu, Plus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FlameLogo } from "@/components/fuega/flame-logo";
import { UserAvatar } from "@/components/fuega/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface HeaderProps {
  user?: {
    username: string;
    sparkScore: number;
  } | null;
  onMenuToggle?: () => void;
  className?: string;
}

export function Header({ user, onMenuToggle, className }: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-ash-800 bg-ash-950/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-ash-950/60",
        className,
      )}
    >
      <button
        onClick={onMenuToggle}
        className="flex items-center justify-center rounded-md p-1.5 text-ash-400 transition-colors hover:bg-ash-800 hover:text-ash-200 lg:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <FlameLogo size="sm" />

      <div className="relative flex-1 max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash-500" />
        <Input
          placeholder="Search fuega..."
          className="h-9 border-ash-800 bg-ash-900 pl-9 text-sm placeholder:text-ash-600 focus-visible:ring-flame-500/50"
        />
      </div>

      <div className="flex items-center gap-2">
        {user ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="hidden text-ash-400 hover:text-flame-400 sm:flex"
              aria-label="Create post"
            >
              <Plus className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-ash-400 hover:text-ash-200"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-ash-800">
                  <UserAvatar username={user.username} size="sm" />
                  <div className="hidden text-left sm:block">
                    <div className="text-xs font-medium text-ash-200">
                      {user.username}
                    </div>
                    <div className="text-[10px] text-flame-400">
                      {user.sparkScore} spark score
                    </div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 border-ash-800 bg-ash-900"
              >
                <DropdownMenuLabel className="text-ash-400">
                  My Account
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-ash-800" />
                <DropdownMenuItem className="text-ash-200 focus:bg-ash-800 focus:text-ash-100">
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="text-ash-200 focus:bg-ash-800 focus:text-ash-100">
                  My Communities
                </DropdownMenuItem>
                <DropdownMenuItem className="text-ash-200 focus:bg-ash-800 focus:text-ash-100">
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-ash-800" />
                <DropdownMenuItem className="text-red-400 focus:bg-ash-800 focus:text-red-300">
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <Button variant="spark" size="sm" className="gap-1.5">
            <LogIn className="h-4 w-4" />
            Log in
          </Button>
        )}
      </div>
    </header>
  );
}
