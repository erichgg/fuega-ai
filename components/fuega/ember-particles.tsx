"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface Ember {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

interface EmberParticlesProps {
  count?: number;
  className?: string;
}

// Stable seeded random so SSR and client produce the same values
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

/**
 * Floating ember particles that rise from the bottom.
 * Uses the ember-rise keyframe from globals.css.
 * Pure CSS animation — no JS animation loop.
 */
export function EmberParticles({ count = 12, className }: EmberParticlesProps) {
  const embers = React.useMemo<Ember[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: seededRandom(i * 6) * 100,
        size: 2 + seededRandom(i * 6 + 1) * 3,
        duration: 6 + seededRandom(i * 6 + 2) * 10,
        delay: seededRandom(i * 6 + 3) * 8,
        opacity: 0.3 + seededRandom(i * 6 + 4) * 0.5,
      })),
    [count],
  );

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden="true"
    >
      {embers.map((ember) => (
        <span
          key={ember.id}
          className="ember"
          style={{
            left: `${ember.left}%`,
            bottom: `-${ember.size}px`,
            width: `${ember.size}px`,
            height: `${ember.size}px`,
            animationDuration: `${ember.duration}s`,
            animationDelay: `${ember.delay}s`,
            opacity: ember.opacity,
          }}
        />
      ))}
    </div>
  );
}
