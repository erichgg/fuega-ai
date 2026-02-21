import { cn } from "@/lib/utils";

interface FlameLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  animated?: boolean;
}

const sizeMap = {
  sm: "text-xl",
  md: "text-3xl",
  lg: "text-5xl",
} as const;

export function FlameLogo({
  size = "md",
  className,
  animated = false,
}: FlameLogoProps) {
  return (
    <span
      className={cn(
        "font-bold tracking-tight select-none",
        sizeMap[size],
        animated && "animate-flame-flicker",
        className,
      )}
    >
      <span className="text-gradient-fire">fuega</span>
      <span className="text-ash-400">.ai</span>
    </span>
  );
}
