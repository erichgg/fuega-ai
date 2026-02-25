"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Menu,
  Plus,
  LogIn,
  Home,
  Users,
  Bot,
  Vote,
  Settings,
  User,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlameLogo } from "@/components/fuega/flame-logo";
import { NotificationBell } from "@/components/fuega/notification-bell";
import { UserAvatar } from "@/components/fuega/user-avatar";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/contexts/auth-context";
import { ThemeToggle } from "@/components/fuega/theme-toggle";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Nav links
// ---------------------------------------------------------------------------

const navLinks = [
  { href: "/home", label: "Feed" },
  { href: "/campfires", label: "Campfires" },
  { href: "/governance", label: "Governance" },
  { href: "/about", label: "About" },
] as const;

const mobileNavLinks = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/campfires", label: "Campfires", icon: Users },
  { href: "/governance", label: "Governance", icon: Vote },
  { href: "/mod-log", label: "Mod Log", icon: Bot },
  { href: "/about", label: "About", icon: Users },
] as const;

// ---------------------------------------------------------------------------
// Keyboard shortcuts hook
// ---------------------------------------------------------------------------

function useKeyboardShortcuts() {
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const pendingKey = React.useRef<string | null>(null);

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // "/" -> focus search
      if (e.key === "/") {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          "[data-search-input]",
        );
        searchInput?.focus();
        return;
      }

      // "c" -> create post
      if (e.key === "c" && !e.metaKey && !e.ctrlKey) {
        // Navigate to create post (future)
        return;
      }

      // "?" -> show shortcuts help
      if (e.key === "?") {
        setShortcutsOpen((prev) => !prev);
        return;
      }

      // "g" prefix for go-to shortcuts
      if (e.key === "g" && !pendingKey.current) {
        pendingKey.current = "g";
        setTimeout(() => {
          pendingKey.current = null;
        }, 1000);
        return;
      }

      if (pendingKey.current === "g") {
        pendingKey.current = null;
        if (e.key === "h") {
          window.location.href = "/home";
        } else if (e.key === "g") {
          window.location.href = "/governance";
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { shortcutsOpen, setShortcutsOpen };
}

// ---------------------------------------------------------------------------
// Shortcuts dialog
// ---------------------------------------------------------------------------

function ShortcutsHelp({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  const shortcuts = [
    { keys: ["/"], desc: "Focus search" },
    { keys: ["c"], desc: "Create post" },
    { keys: ["g", "h"], desc: "Go home" },
    { keys: ["g", "g"], desc: "Go to governance" },
    { keys: ["?"], desc: "Toggle this help" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="bg-coal border border-lava-hot/20 w-full max-w-sm mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">
          <span className="text-lava-hot font-bold">$ </span>
          keyboard shortcuts
        </h2>
        <div className="space-y-3">
          {shortcuts.map((s) => (
            <div
              key={s.desc}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-ash">{s.desc}</span>
              <div className="flex gap-1">
                {s.keys.map((k, i) => (
                  <kbd
                    key={`${k}-${i}`}
                    className="border border-lava-hot/20 bg-charcoal px-2 py-0.5 text-xs text-foreground font-mono"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-smoke mt-4">
          Press <kbd className="border border-lava-hot/20 px-1 text-foreground">Esc</kbd> or{" "}
          <kbd className="border border-lava-hot/20 px-1 text-foreground">?</kbd> to close
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------

interface NavbarProps {
  onOpenSidebar?: () => void;
}

export function Navbar({ onOpenSidebar }: NavbarProps = {}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { shortcutsOpen, setShortcutsOpen } = useKeyboardShortcuts();

  // Scroll detection at 50px threshold
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close shortcuts on Escape
  React.useEffect(() => {
    if (!shortcutsOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShortcutsOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [shortcutsOpen, setShortcutsOpen]);

  return (
    <>
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-lava-hot focus:text-black focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>

      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 h-14 transition-colors duration-300",
          scrolled
            ? "bg-void/90 backdrop-blur-sm border-b border-lava-hot/10"
            : "bg-transparent",
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-3 sm:px-6 lg:px-12">
          {/* Left: Menu + Logo */}
          <div className="flex items-center gap-1">
            {/* Sidebar trigger — hidden on mobile (mobile nav sheet handles it) */}
            <button
              onClick={onOpenSidebar}
              className="hidden md:inline-flex p-2 text-ash hover:text-lava-hot transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Logo */}
            <Link
              href="/"
              className="flex items-center shrink-0"
              aria-label="fuega.ai home"
            >
              <FlameLogo size="sm" />
            </Link>
          </div>

          {/* Desktop search */}
          <div className="hidden md:flex relative flex-1 max-w-md mx-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-smoke" />
            <input
              type="text"
              data-search-input
              className="w-full bg-coal border border-lava-hot/20 pl-10 pr-4 py-1.5 text-sm text-foreground placeholder:text-smoke focus:border-lava-hot focus:ring-0 focus:outline-none transition-colors"
              placeholder="Search…  /"
              aria-label="Search campfires, posts, and users"
            />
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 text-sm font-mono transition-colors",
                  pathname === link.href || pathname?.startsWith(link.href + "/")
                    ? "text-lava-hot"
                    : "text-ash hover:text-lava-hot",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <ThemeToggle />

            {user ? (
              <>
                {/* Create post */}
                <Link
                  href="/submit"
                  className="hidden sm:flex p-2 text-ash hover:text-lava-hot transition-colors"
                  aria-label="Create post"
                >
                  <Plus className="h-5 w-5" />
                </Link>

                {/* Notification bell */}
                <NotificationBell />

                {/* User dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-2 py-1 transition-colors hover:bg-charcoal/50" aria-label="User menu">
                      <UserAvatar username={user.username} size="sm" />
                      <div className="hidden lg:block text-left">
                        <div className="text-xs font-medium font-mono text-foreground">
                          {user.username}
                        </div>
                        <div className="text-[10px] font-mono text-lava-hot">
                          {user.glow} glow
                        </div>
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 bg-coal border-lava-hot/20"
                  >
                    <DropdownMenuLabel className="text-ash">
                      My Account
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-lava-hot/10" />
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/u/${user.username}`}
                        className="text-foreground focus:bg-charcoal focus:text-lava-hot cursor-pointer"
                      >
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/settings"
                        className="text-foreground focus:bg-charcoal focus:text-lava-hot cursor-pointer"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-lava-hot/10" />
                    <DropdownMenuItem
                      onClick={() => logout()}
                      className="text-destructive focus:bg-charcoal focus:text-destructive cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link href="/login">
                <Button
                  variant="default"
                  size="sm"
                  className="gap-1.5 text-sm font-medium uppercase tracking-wider"
                >
                  <LogIn className="h-4 w-4" />
                  Log in
                </Button>
              </Link>
            )}

            {/* Mobile nav sheet trigger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 text-ash hover:text-lava-hot transition-colors"
              aria-label="Open mobile menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile nav sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="right"
          className="bg-void border-lava-hot/10 w-48 sm:w-56 overflow-hidden px-6 pt-6"
        >
          <SheetTitle className="font-bold truncate">
            <span className="text-flame-400 font-semibold">fuega</span>
            <span className="text-ash">.ai</span>
          </SheetTitle>

          {/* Mobile search */}
          <div className="relative mt-4">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-smoke" />
            <input
              type="text"
              className="w-full bg-coal border border-lava-hot/20 pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-smoke focus:border-lava-hot focus:ring-0 focus:outline-none transition-colors"
              placeholder="Search..."
              aria-label="Search"
            />
          </div>

          <div className="flex flex-col gap-1 mt-6 overflow-hidden pl-1">
            {mobileNavLinks.map((link) => {
              const Icon = link.icon;
              const active =
                pathname === link.href ||
                pathname?.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 py-2 text-sm font-mono tracking-wide truncate transition-colors",
                    active
                      ? "text-lava-hot font-medium"
                      : "text-ash hover:text-lava-hot",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {link.label}
                </Link>
              );
            })}

            {/* Browse campfires (opens sidebar) */}
            {onOpenSidebar && (
              <button
                onClick={() => {
                  setMobileOpen(false);
                  onOpenSidebar();
                }}
                className="flex items-center gap-3 py-2 text-sm font-mono tracking-wide truncate transition-colors text-ash hover:text-lava-hot mt-2 pt-3 border-t border-lava-hot/10"
              >
                <Menu className="h-4 w-4 shrink-0" />
                Browse campfires
              </button>
            )}

            <div className="pt-3 border-t border-lava-hot/10 mt-2">
              <kbd className="text-xs text-smoke border border-lava-hot/20 px-1.5 py-0.5 font-mono">
                ?
              </kbd>
              <span className="text-xs text-smoke ml-2">shortcuts</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Keyboard shortcuts help */}
      <ShortcutsHelp
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </>
  );
}
