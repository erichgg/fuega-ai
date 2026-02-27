"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
}

interface FireParticlesProps {
  className?: string;
  /** Maximum number of particles alive at once (default 80) */
  count?: number;
}

const ORANGE_COLORS = ["#FF6B2C", "#FF8F5C", "#CC4A10"];
const TEAL_COLORS = ["#00D4AA", "#33E0BE"];
const MAGNETIC_RADIUS = 200;
const MAGNETIC_STRENGTH = 0.02;

function pickColor(): string {
  if (Math.random() < 0.85) {
    return ORANGE_COLORS[Math.floor(Math.random() * ORANGE_COLORS.length)] ?? "#FF6B2C";
  }
  return TEAL_COLORS[Math.floor(Math.random() * TEAL_COLORS.length)] ?? "#00D4AA";
}

function spawnParticle(width: number, height: number): Particle {
  return {
    x: Math.random() * width,
    y: height + Math.random() * 20,
    vx: (Math.random() - 0.5) * 0.6,
    vy: -(0.4 + Math.random() * 1.2),
    size: 1.5 + Math.random() * 3,
    opacity: 0.4 + Math.random() * 0.5,
    color: pickColor(),
    life: 0,
    maxLife: 120 + Math.random() * 180,
  };
}

/**
 * Canvas-based fire particles that rise from the bottom with mouse
 * magnetic pull. Replaces the CSS-only EmberParticles component.
 * Respects prefers-reduced-motion.
 */
export function FireParticles({ className, count = 80 }: FireParticlesProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const particlesRef = React.useRef<Particle[]>([]);
  const mouseRef = React.useRef<{ x: number; y: number } | null>(null);
  const rafRef = React.useRef<number>(0);
  const reducedMotion = React.useRef(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = mq.matches;

    const handler = (e: MediaQueryListEvent) => {
      reducedMotion.current = e.matches;
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Mouse tracking relative to canvas
    function handleMouseMove(e: MouseEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }

    function handleMouseLeave() {
      mouseRef.current = null;
    }

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    // Seed some initial particles
    const particles = particlesRef.current;
    for (let i = 0; i < Math.floor(count * 0.3); i++) {
      const p = spawnParticle(width, height);
      p.y = Math.random() * height;
      p.life = Math.random() * p.maxLife * 0.5;
      particles.push(p);
    }

    function tick() {
      if (reducedMotion.current) {
        // Draw static dots — no animation
        ctx!.clearRect(0, 0, width, height);
        for (const p of particles) {
          ctx!.globalAlpha = p.opacity * 0.3;
          ctx!.fillStyle = p.color;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.globalAlpha = 1;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      ctx!.clearRect(0, 0, width, height);

      // Spawn new particles
      while (particles.length < count) {
        particles.push(spawnParticle(width, height));
      }

      const mouse = mouseRef.current;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i] as Particle | undefined;
        if (!p) continue;
        p.life++;

        // Remove dead particles
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        // Mouse magnetic pull
        if (mouse) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAGNETIC_RADIUS && dist > 0) {
            const force = (1 - dist / MAGNETIC_RADIUS) * MAGNETIC_STRENGTH;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        // Slight horizontal drift
        p.vx += (Math.random() - 0.5) * 0.02;

        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Fade in/out based on life
        const lifeRatio = p.life / p.maxLife;
        let alpha = p.opacity;
        if (lifeRatio < 0.1) {
          alpha *= lifeRatio / 0.1;
        } else if (lifeRatio > 0.7) {
          alpha *= 1 - (lifeRatio - 0.7) / 0.3;
        }

        // Draw glow
        ctx!.save();
        ctx!.globalAlpha = alpha * 0.3;
        ctx!.shadowColor = p.color;
        ctx!.shadowBlur = p.size * 4;
        ctx!.fillStyle = p.color;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();

        // Draw core
        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = p.color;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
        ctx!.fill();
      }

      ctx!.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      particles.length = 0;
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("pointer-events-auto absolute inset-0", className)}
      aria-hidden="true"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
