"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Flame } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Particle {
  id: number;
  x: number;
  size: number;
  delay: number;
  duration: number;
  type: "spark" | "douse";
}

interface SparkStormState {
  particles: Particle[];
  overlayType: "spark" | "douse" | "quorum" | null;
  quorumVisible: boolean;
}

interface SparkStormReturn {
  triggerSpark: () => void;
  triggerDouse: () => void;
  triggerQuorum: () => void;
  SparkStormOverlay: React.FC;
}

// ---------------------------------------------------------------------------
// Particle generation
// ---------------------------------------------------------------------------

let particleCounter = 0;

function generateParticles(type: "spark" | "douse", count = 20): Particle[] {
  return Array.from({ length: count }, () => {
    particleCounter += 1;
    return {
      id: particleCounter,
      x: Math.random() * 100,
      size: 6 + Math.random() * 4,
      delay: Math.random() * 300,
      duration: 800 + Math.random() * 700,
      type,
    };
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSparkStorm(): SparkStormReturn {
  const [state, setState] = React.useState<SparkStormState>({
    particles: [],
    overlayType: null,
    quorumVisible: false,
  });

  const clearTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const quorumTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSpark = React.useCallback(() => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    const particles = generateParticles("spark", 20);
    setState({ particles, overlayType: "spark", quorumVisible: false });
    clearTimerRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, particles: [], overlayType: null }));
    }, 1800);
  }, []);

  const triggerDouse = React.useCallback(() => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    const particles = generateParticles("douse", 20);
    setState({ particles, overlayType: "douse", quorumVisible: false });
    clearTimerRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, particles: [], overlayType: null }));
    }, 1800);
  }, []);

  const triggerQuorum = React.useCallback(() => {
    if (quorumTimerRef.current) clearTimeout(quorumTimerRef.current);
    setState((prev) => ({ ...prev, quorumVisible: true }));
    quorumTimerRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, quorumVisible: false }));
    }, 2500);
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      if (quorumTimerRef.current) clearTimeout(quorumTimerRef.current);
    };
  }, []);

  const SparkStormOverlay: React.FC = React.useCallback(() => {
    return <SparkStormOverlayInner state={state} />;
  }, [state]);

  return { triggerSpark, triggerDouse, triggerQuorum, SparkStormOverlay };
}

// ---------------------------------------------------------------------------
// Overlay component (renders via portal to body)
// ---------------------------------------------------------------------------

function SparkStormOverlayInner({ state }: { state: SparkStormState }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const hasContent = state.particles.length > 0 || state.overlayType || state.quorumVisible;
  if (!hasContent) return null;

  return createPortal(
    <>
      {/* Color tint overlay */}
      {state.overlayType && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex: 9998,
            animation: "flash-overlay 500ms ease-out forwards",
            backgroundColor:
              state.overlayType === "spark"
                ? "var(--flame-500)"
                : "var(--teal)",
          }}
          aria-hidden="true"
        />
      )}

      {/* Particles */}
      {state.particles.length > 0 && (
        <div
          className="fixed inset-0 pointer-events-none overflow-hidden"
          style={{ zIndex: 9998 }}
          aria-hidden="true"
        >
          {state.particles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: `${p.x}%`,
                width: p.size,
                height: p.size,
                animationDelay: `${p.delay}ms`,
                animationDuration: `${p.duration}ms`,
                animationTimingFunction: "ease-out",
                animationFillMode: "forwards",
                ...(p.type === "spark"
                  ? {
                      bottom: 0,
                      background: `radial-gradient(circle, var(--flame-400), var(--flame-600))`,
                      boxShadow: "0 0 6px var(--lava-glow)",
                      animationName: "particle-rise",
                    }
                  : {
                      top: 0,
                      background: `radial-gradient(circle, var(--teal-light), var(--teal))`,
                      boxShadow: "0 0 6px var(--douse-glow)",
                      animationName: "particle-fall",
                    }),
              }}
            />
          ))}
        </div>
      )}

      {/* Quorum reached overlay */}
      {state.quorumVisible && (
        <div
          className="fixed inset-0 pointer-events-none flex items-center justify-center"
          style={{ zIndex: 9999 }}
          aria-hidden="true"
        >
          <div
            className="flex flex-col items-center gap-3"
            style={{ animation: "quorum-pulse 2.5s ease-out forwards" }}
          >
            <Flame
              className="h-16 w-16 text-flame-400 animate-flame-flicker"
              style={{ filter: "drop-shadow(0 0 20px var(--lava-glow))" }}
            />
            <span
              className="text-2xl font-bold font-mono text-flame-400 tracking-wider uppercase"
              style={{ textShadow: "0 0 20px var(--lava-glow)" }}
            >
              Quorum Reached!
            </span>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Animated vote button text component
// ---------------------------------------------------------------------------

interface VoteButtonTextProps {
  voted: boolean;
  type: "spark" | "douse";
  children: React.ReactNode;
}

export function VoteButtonText({ voted, type, children }: VoteButtonTextProps) {
  if (!voted) return <>{children}</>;

  return (
    <span
      className="inline-flex items-center gap-1"
      style={{ animation: "spark-pop 0.3s ease-out" }}
    >
      {type === "spark" ? "Sparked!" : "Doused!"}
      <span className="text-base" role="img" aria-label={type === "spark" ? "fire" : "water drop"}>
        {type === "spark" ? "\uD83D\uDD25" : "\uD83D\uDCA7"}
      </span>
    </span>
  );
}
