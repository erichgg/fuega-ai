"use client";

import { useEffect, useState, useCallback, useRef } from "react";

const KONAMI_SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "KeyB",
  "KeyA",
] as const;

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  emoji: string;
}

function generateParticles(count: number): Particle[] {
  const emojis = ["🔥", "✨", "💥", "⚡", "🌟"];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 16 + Math.random() * 40,
    delay: Math.random() * 0.8,
    duration: 1 + Math.random() * 1.5,
    emoji: emojis[Math.floor(Math.random() * emojis.length)] ?? "🔥",
  }));
}

export function KonamiCode() {
  const [activated, setActivated] = useState(false);
  const [particles] = useState<Particle[]>(() => generateParticles(30));
  const bufferRef = useRef<string[]>([]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (activated) return;

      bufferRef.current.push(e.code);

      // Keep buffer trimmed to sequence length
      if (bufferRef.current.length > KONAMI_SEQUENCE.length) {
        bufferRef.current = bufferRef.current.slice(-KONAMI_SEQUENCE.length);
      }

      // Check for match
      if (bufferRef.current.length === KONAMI_SEQUENCE.length) {
        const match = bufferRef.current.every(
          (code, i) => code === KONAMI_SEQUENCE[i]
        );
        if (match) {
          setActivated(true);
          bufferRef.current = [];
        }
      }
    },
    [activated]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    if (!activated) return;
    const timer = setTimeout(() => setActivated(false), 3000);
    return () => clearTimeout(timer);
  }, [activated]);

  if (!activated) return null;

  return (
    <div
      className="konami-overlay"
      aria-hidden="true"
      onClick={() => setActivated(false)}
    >
      {/* Center flame */}
      <div className="konami-center-flame">🔥</div>

      {/* Title text */}
      <div className="konami-title">FUEGA.AI</div>

      {/* Particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="konami-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        >
          {p.emoji}
        </span>
      ))}

      <style jsx>{`
        .konami-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: radial-gradient(
            circle at center,
            rgba(255, 107, 44, 0.3) 0%,
            rgba(0, 0, 0, 0.9) 70%
          );
          animation: konami-fade-in 0.3s ease-out forwards,
            konami-fade-out 0.6s ease-in 2.4s forwards;
          cursor: pointer;
          overflow: hidden;
        }

        .konami-center-flame {
          font-size: 120px;
          animation: konami-pulse 0.6s ease-in-out infinite alternate;
          filter: drop-shadow(0 0 40px rgba(255, 107, 44, 0.8));
          user-select: none;
        }

        .konami-title {
          margin-top: 16px;
          font-size: 48px;
          font-weight: 900;
          letter-spacing: 12px;
          color: #ff6b2c;
          text-shadow: 0 0 30px rgba(255, 107, 44, 0.6),
            0 0 60px rgba(255, 107, 44, 0.3);
          animation: konami-title-in 0.5s ease-out 0.2s both;
          font-family: var(--font-mono, monospace);
          user-select: none;
        }

        .konami-particle {
          position: absolute;
          pointer-events: none;
          user-select: none;
          animation: konami-burst ease-out both;
          opacity: 0;
        }

        @keyframes konami-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes konami-fade-out {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        @keyframes konami-pulse {
          from {
            transform: scale(1);
          }
          to {
            transform: scale(1.15);
          }
        }

        @keyframes konami-title-in {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes konami-burst {
          0% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          30% {
            opacity: 1;
            transform: scale(1.2) rotate(180deg);
          }
          100% {
            opacity: 0;
            transform: scale(0.5) rotate(360deg) translateY(-40px);
          }
        }
      `}</style>
    </div>
  );
}
