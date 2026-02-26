"use client";

import { Users, Clock, Shield, Vote, Flame, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface CampfireAboutProps {
  campfire: {
    name: string;
    display_name?: string;
    description: string;
    tagline?: string | null;
    member_count: number;
    post_count?: number;
    created_at: string;
    creator_username?: string;
    theme_color?: string | null;
  };
  className?: string;
}

export function CampfireAbout({ campfire, className = "" }: CampfireAboutProps) {
  const [expanded, setExpanded] = useState(false);

  const createdDate = new Date(campfire.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className={`border border-charcoal rounded-lg overflow-hidden ${className}`}>
      {/* Header with accent color bar */}
      <div
        className="h-2"
        style={{ backgroundColor: campfire.theme_color || 'var(--lava-hot)' }}
      />

      <div className="p-4 bg-coal/50">
        {/* Title */}
        <h3 className="text-sm font-bold font-mono text-foreground">
          About this campfire
        </h3>

        {/* Description */}
        <p className="mt-2 text-sm text-ash leading-relaxed">
          {campfire.description}
        </p>
        {campfire.tagline && (
          <p className="mt-1 text-xs italic text-smoke">
            {campfire.tagline}
          </p>
        )}

        {/* Stats grid */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center p-2 rounded bg-charcoal/50">
            <Users className="h-4 w-4 text-smoke mb-1" />
            <span className="text-lg font-bold font-mono text-foreground">
              {(campfire.member_count ?? 0).toLocaleString()}
            </span>
            <span className="text-[10px] text-smoke uppercase tracking-wider">Members</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded bg-charcoal/50">
            <Flame className="h-4 w-4 text-smoke mb-1" />
            <span className="text-lg font-bold font-mono text-foreground">
              {(campfire.post_count ?? 0).toLocaleString()}
            </span>
            <span className="text-[10px] text-smoke uppercase tracking-wider">Posts</span>
          </div>
        </div>

        {/* Details (expandable on mobile) */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-xs text-smoke hover:text-ash transition-colors md:hidden w-full justify-center"
        >
          {expanded ? "Less" : "More info"}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        <div className={`mt-3 space-y-2 text-xs text-smoke ${expanded ? 'block' : 'hidden md:block'}`}>
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Created {createdDate}</span>
          </div>
          {campfire.creator_username && (
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 shrink-0" />
              <span>
                Founded by{" "}
                <span className="text-flame-400 font-mono">
                  {campfire.creator_username}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Rules summary placeholder */}
        <div className={`mt-4 pt-3 border-t border-charcoal ${expanded ? 'block' : 'hidden md:block'}`}>
          <h4 className="text-xs font-semibold text-foreground mb-2 font-mono">
            <Vote className="inline h-3 w-3 mr-1" />
            Governance
          </h4>
          <ul className="space-y-1 text-xs text-smoke">
            <li className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-green-500 shrink-0" />
              AI moderation active
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-flame-400 shrink-0" />
              Democratic governance
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-blue-400 shrink-0" />
              Public mod log
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
