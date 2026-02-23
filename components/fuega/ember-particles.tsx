"use client";

import * as React from "react";

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

/**
 * Floating ember particles that rise from the bottom.
 * Uses the ember-rise keyframe from globals.css.
 * Pure CSS animation — no JS animation loop.
 */
export function EmberParticles({ count = 12, className = "" }: EmberParticlesProps) {
  const [embers, setEmbers] = React.useState<Ember[]>([]);

  React.useEffect(() => {
    const generated: Ember[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 2 + Math.random() * 3,
      duration: 6 + Math.random() * 10,
      delay: Math.random() * 8,
      opacity: 0.3 + Math.random() * 0.5,
    }));
    setEmbers(generated);
  }, [count]);

  if (embers.length === 0) return null;

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
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
