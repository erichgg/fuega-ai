"use client";

import * as React from "react";
import { Flame, Search, ChevronDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface CampfireOption {
  id: string;
  name: string;
  member_count?: number;
}

interface CampfirePickerProps {
  campfires: CampfireOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  loading?: boolean;
  className?: string;
}

export function CampfirePicker({
  campfires,
  selectedId,
  onSelect,
  loading,
  className,
}: CampfirePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [focusedIndex, setFocusedIndex] = React.useState(-1);

  const selected = campfires.find((c) => c.id === selectedId);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return campfires;
    const q = search.toLowerCase();
    return campfires.filter((c) => c.name.toLowerCase().includes(q));
  }, [campfires, search]);

  // Close on click outside
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search input when opening
  React.useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
      setFocusedIndex(-1);
      setSearch("");
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filtered.length) {
          const item = filtered[focusedIndex];
          if (item) {
            onSelect(item.id);
            setOpen(false);
          }
        }
        break;
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)} onKeyDown={handleKeyDown}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center justify-between rounded-md border border-charcoal bg-coal px-3 py-2 text-sm transition-colors",
          open ? "border-flame-500/50 ring-2 ring-flame-500/20" : "hover:border-charcoal/80",
          selected ? "text-foreground" : "text-smoke",
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex items-center gap-2 min-w-0">
          {loading ? (
            <span className="text-smoke">Loading campfires...</span>
          ) : selected ? (
            <>
              <Flame className="h-3.5 w-3.5 text-flame-400 shrink-0" />
              <span className="font-mono truncate">
                <span className="text-flame-400">f</span>
                <span className="text-smoke mx-0.5">|</span>
                <span>{selected.name}</span>
              </span>
            </>
          ) : (
            <span>Select a campfire</span>
          )}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-smoke transition-transform", open && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-charcoal bg-coal shadow-xl shadow-black/50 overflow-hidden">
          {/* Search input */}
          <div className="border-b border-charcoal p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-smoke" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setFocusedIndex(-1); }}
                placeholder="Search campfires..."
                className="w-full bg-charcoal/50 border border-charcoal rounded pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-smoke focus:outline-none focus:border-flame-500/50"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto" role="listbox">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-smoke">
                {search ? "No campfires found" : "No campfires available"}
              </div>
            ) : (
              filtered.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={c.id === selectedId}
                  onClick={() => { onSelect(c.id); setOpen(false); }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors",
                    c.id === selectedId
                      ? "bg-flame-500/10 text-flame-400"
                      : i === focusedIndex
                        ? "bg-charcoal/50 text-foreground"
                        : "text-ash hover:bg-charcoal/30 hover:text-foreground",
                  )}
                >
                  <Flame className="h-3 w-3 shrink-0 text-flame-400/60" />
                  <span className="font-mono truncate flex-1 text-left">
                    <span className="text-flame-400">f</span>
                    <span className="text-smoke mx-0.5">|</span>
                    <span>{c.name}</span>
                  </span>
                  {c.member_count != null && (
                    <span className="flex items-center gap-0.5 text-[10px] text-smoke shrink-0">
                      <Users className="h-2.5 w-2.5" />
                      {c.member_count.toLocaleString()}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
