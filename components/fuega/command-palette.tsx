"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Home,
  Users,
  Vote,
  Bot,
  Award,
  Settings,
  Info,
  PenSquare,
  Flame,
} from "lucide-react";
import { useAuth } from "@/lib/contexts/auth-context";

// ---------------------------------------------------------------------------
// Context — allows external triggers (e.g. a button elsewhere)
// ---------------------------------------------------------------------------

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const CommandPaletteContext = React.createContext<CommandPaletteContextValue>({
  open: false,
  setOpen: () => {},
});

export function useCommandPalette() {
  return React.useContext(CommandPaletteContext);
}

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <CommandPaletteContext.Provider value={{ open, setOpen }}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Navigation items
// ---------------------------------------------------------------------------

const navigationItems = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Campfires", href: "/campfires", icon: Users },
  { label: "Governance", href: "/governance", icon: Vote },
  { label: "Mod Log", href: "/mod-log", icon: Bot },
  { label: "Badges", href: "/badges", icon: Award },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "About", href: "/about", icon: Info },
] as const;

// ---------------------------------------------------------------------------
// Command Palette
// ---------------------------------------------------------------------------

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const { user } = useAuth();
  const router = useRouter();

  // Ctrl+K / Cmd+K toggle
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setOpen]);

  const runCommand = React.useCallback(
    (command: () => void) => {
      setOpen(false);
      command();
    },
    [setOpen],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-void/80 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg mx-auto mt-[20vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          className="bg-coal border border-lava-hot/20 rounded-md shadow-2xl overflow-hidden"
          label="Command palette"
        >
          <Command.Input
            placeholder="Type a command or search..."
            className="w-full px-4 py-3 bg-transparent text-foreground text-sm font-mono placeholder:text-smoke border-b border-lava-hot/10 focus:outline-none"
            autoFocus
          />
          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-sm text-smoke text-center font-mono">
              No results found.
            </Command.Empty>

            {/* Navigation */}
            <Command.Group
              heading="Navigation"
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-smoke [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
            >
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.href}
                    value={item.label}
                    onSelect={() =>
                      runCommand(() => router.push(item.href))
                    }
                    className="px-3 py-2 text-sm font-mono text-ash cursor-pointer flex items-center gap-3 rounded-md data-[selected=true]:bg-charcoal data-[selected=true]:text-flame-400"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Command.Item>
                );
              })}
            </Command.Group>

            {/* Actions (logged-in only) */}
            {user && (
              <>
                <Command.Separator className="my-1 h-px bg-lava-hot/10" />
                <Command.Group
                  heading="Actions"
                  className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-smoke [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                >
                  <Command.Item
                    value="Create Post"
                    onSelect={() =>
                      runCommand(() => router.push("/submit"))
                    }
                    className="px-3 py-2 text-sm font-mono text-ash cursor-pointer flex items-center gap-3 rounded-md data-[selected=true]:bg-charcoal data-[selected=true]:text-flame-400"
                  >
                    <PenSquare className="h-4 w-4 shrink-0" />
                    Create Post
                  </Command.Item>
                  <Command.Item
                    value="Create Campfire"
                    onSelect={() =>
                      runCommand(() => router.push("/campfires/create"))
                    }
                    className="px-3 py-2 text-sm font-mono text-ash cursor-pointer flex items-center gap-3 rounded-md data-[selected=true]:bg-charcoal data-[selected=true]:text-flame-400"
                  >
                    <Flame className="h-4 w-4 shrink-0" />
                    Create Campfire
                  </Command.Item>
                </Command.Group>
              </>
            )}
          </Command.List>

          {/* Footer hint */}
          <div className="border-t border-lava-hot/10 px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] text-smoke font-mono">
              <kbd className="border border-lava-hot/20 bg-charcoal px-1 py-0.5 text-foreground">
                ↑↓
              </kbd>{" "}
              navigate{" "}
              <kbd className="border border-lava-hot/20 bg-charcoal px-1 py-0.5 text-foreground ml-1">
                ↵
              </kbd>{" "}
              select
            </span>
            <span className="text-[10px] text-smoke font-mono">
              <kbd className="border border-lava-hot/20 bg-charcoal px-1 py-0.5 text-foreground">
                esc
              </kbd>{" "}
              close
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
