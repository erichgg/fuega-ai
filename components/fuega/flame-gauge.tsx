"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FlameGaugeProps {
  sparkVotes: number;
  douseVotes: number;
  quorum: number;
  totalMembers: number;
  size?: "sm" | "lg";
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONFIG = {
  sm: {
    viewBox: 48,
    radius: 18,
    strokeWidth: 4,
    quorumStroke: 1.5,
    quorumRadius: 22,
    fontSize: 11,
    labelSize: 0,
    gap: 2,
  },
  lg: {
    viewBox: 160,
    radius: 56,
    strokeWidth: 10,
    quorumStroke: 2,
    quorumRadius: 70,
    fontSize: 28,
    labelSize: 10,
    gap: 4,
  },
} as const;

// ---------------------------------------------------------------------------
// Arc math helpers
// ---------------------------------------------------------------------------

/**
 * Returns an SVG arc path string for a semicircle.
 * `side` determines which half: "left" (spark) or "right" (douse).
 * The arc spans from top-center going outward.
 */
function describeArc(
  cx: number,
  cy: number,
  r: number,
  side: "left" | "right",
): string {
  if (side === "left") {
    // Left arc: from top (12 o'clock) counterclockwise to bottom (6 o'clock)
    return `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r}`;
  }
  // Right arc: from top (12 o'clock) clockwise to bottom (6 o'clock)
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FlameGauge({
  sparkVotes,
  douseVotes,
  quorum,
  totalMembers,
  size = "lg",
  className,
}: FlameGaugeProps) {
  const c = CONFIG[size];
  const cx = c.viewBox / 2;
  const cy = c.viewBox / 2;

  const totalVotes = sparkVotes + douseVotes;
  const sparkPercent = totalVotes > 0 ? Math.round((sparkVotes / totalVotes) * 100) : 0;

  // Arc circumference for a semicircle
  const semiCircumference = Math.PI * c.radius;

  // Spark fill: fraction of the left semicircle
  const sparkFraction = totalVotes > 0 ? sparkVotes / totalVotes : 0;
  const sparkDashLen = semiCircumference * sparkFraction;
  const sparkGap = semiCircumference - sparkDashLen;

  // Douse fill: fraction of the right semicircle
  const douseFraction = totalVotes > 0 ? douseVotes / totalVotes : 0;
  const douseDashLen = semiCircumference * douseFraction;
  const douseGap = semiCircumference - douseDashLen;

  // Quorum ring
  const quorumCircumference = 2 * Math.PI * c.quorumRadius;
  const quorumMet = totalVotes >= quorum;
  const quorumFraction = Math.min(totalVotes / Math.max(quorum, 1), 1);

  // Gradient IDs scoped to avoid collisions
  const sparkGradientId = React.useId();
  const douseGradientId = React.useId();

  const sizePx = size === "sm" ? 48 : 160;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: sizePx, height: sizePx }}
      role="img"
      aria-label={`Vote gauge: ${sparkPercent}% spark, ${100 - sparkPercent}% douse. ${totalVotes} of ${quorum} quorum votes.`}
    >
      <svg
        viewBox={`0 0 ${c.viewBox} ${c.viewBox}`}
        width={sizePx}
        height={sizePx}
        className="overflow-visible"
      >
        <defs>
          {/* Spark gradient: flame-400 to flame-600 */}
          <linearGradient id={sparkGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--flame-400)" />
            <stop offset="100%" stopColor="var(--flame-600)" />
          </linearGradient>
          {/* Douse gradient: teal to teal-dark */}
          <linearGradient id={douseGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--teal)" />
            <stop offset="100%" stopColor="var(--teal-dark)" />
          </linearGradient>
        </defs>

        {/* ---- Quorum outer ring ---- */}
        <circle
          cx={cx}
          cy={cy}
          r={c.quorumRadius}
          fill="none"
          stroke="var(--charcoal)"
          strokeWidth={c.quorumStroke}
          strokeDasharray={quorumMet ? "none" : `${quorumCircumference * 0.02} ${quorumCircumference * 0.02}`}
          className="transition-all duration-700"
          opacity={0.5}
        />
        {/* Quorum fill progress */}
        <circle
          cx={cx}
          cy={cy}
          r={c.quorumRadius}
          fill="none"
          stroke={quorumMet ? "var(--flame-400)" : "var(--smoke)"}
          strokeWidth={c.quorumStroke}
          strokeDasharray={`${quorumCircumference * quorumFraction} ${quorumCircumference * (1 - quorumFraction)}`}
          strokeDashoffset={quorumCircumference * 0.25}
          strokeLinecap="round"
          className="transition-all duration-700"
          opacity={quorumMet ? 0.8 : 0.3}
        />

        {/* ---- Background arcs (track) ---- */}
        <path
          d={describeArc(cx, cy, c.radius, "left")}
          fill="none"
          stroke="var(--charcoal)"
          strokeWidth={c.strokeWidth}
          strokeLinecap="round"
          opacity={0.4}
        />
        <path
          d={describeArc(cx, cy, c.radius, "right")}
          fill="none"
          stroke="var(--charcoal)"
          strokeWidth={c.strokeWidth}
          strokeLinecap="round"
          opacity={0.4}
        />

        {/* ---- Spark arc (left) ---- */}
        {totalVotes > 0 && (
          <path
            d={describeArc(cx, cy, c.radius, "left")}
            fill="none"
            stroke={`url(#${sparkGradientId})`}
            strokeWidth={c.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${sparkDashLen} ${sparkGap}`}
            className="transition-[stroke-dashoffset,stroke-dasharray] duration-600 ease-out"
            style={{
              filter: size === "lg" ? "drop-shadow(0 0 4px var(--lava-glow))" : undefined,
            }}
          />
        )}

        {/* ---- Douse arc (right) ---- */}
        {totalVotes > 0 && (
          <path
            d={describeArc(cx, cy, c.radius, "right")}
            fill="none"
            stroke={`url(#${douseGradientId})`}
            strokeWidth={c.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${douseDashLen} ${douseGap}`}
            className="transition-[stroke-dashoffset,stroke-dasharray] duration-600 ease-out"
            style={{
              filter: size === "lg" ? "drop-shadow(0 0 4px var(--douse-glow))" : undefined,
            }}
          />
        )}

        {/* ---- Center text ---- */}
        {size === "lg" ? (
          <>
            <text
              x={cx}
              y={cy - 4}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-foreground"
              style={{ fontSize: c.fontSize, fontWeight: 700, fontFamily: "var(--font-mono)" }}
            >
              {totalVotes > 0 ? `${sparkPercent}%` : "--"}
            </text>
            <text
              x={cx}
              y={cy + 16}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-smoke"
              style={{ fontSize: c.labelSize, fontFamily: "var(--font-mono)" }}
            >
              {totalVotes > 0 ? "spark" : "no votes"}
            </text>
          </>
        ) : (
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-foreground"
            style={{ fontSize: c.fontSize, fontWeight: 700, fontFamily: "var(--font-mono)" }}
          >
            {totalVotes > 0 ? `${sparkPercent}` : "--"}
          </text>
        )}
      </svg>

      {/* Quorum met badge — lg only */}
      {size === "lg" && quorumMet && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-flame-500/20 border border-flame-500/30 px-2 py-0.5">
          <span className="text-[9px] font-mono font-medium text-flame-400 uppercase tracking-wider">
            Quorum Met
          </span>
        </div>
      )}
    </div>
  );
}
