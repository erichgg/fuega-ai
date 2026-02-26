"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
}

const directionClasses = {
  up: { hidden: "translate-y-4", visible: "translate-y-0" },
  down: { hidden: "-translate-y-4", visible: "translate-y-0" },
  left: { hidden: "translate-x-4", visible: "translate-x-0" },
  right: { hidden: "-translate-x-4", visible: "translate-x-0" },
} as const;

export function FadeIn({
  children,
  className = "",
  delay,
  direction = "up",
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Respect prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const { hidden, visible: visibleTranslate } = directionClasses[direction];

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out ${
        visible ? `opacity-100 ${visibleTranslate}` : `opacity-0 ${hidden}`
      } ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
