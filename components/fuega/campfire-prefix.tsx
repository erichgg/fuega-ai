import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Displays campfire name in the correct format: f | name
 * URL routes use /f/[campfire-name]
 * When linked=true, renders as a clickable link to /f/[name]
 */
export function CampfirePrefix({
  name,
  className,
  linked = false,
}: {
  name: string;
  className?: string;
  linked?: boolean;
}) {
  const content = (
    <span className={cn("inline-flex items-baseline font-semibold", className)}>
      <span className="text-lava-hot">f</span>
      <span className="text-smoke mx-1">|</span>
      <span className="text-foreground">{name}</span>
    </span>
  );

  if (linked) {
    return (
      <Link
        href={`/f/${name}`}
        className="inline-flex items-baseline transition-opacity hover:opacity-80"
      >
        {content}
      </Link>
    );
  }

  return content;
}

/**
 * Normalizes campfire query input to handle all formats:
 * "f/name", "f / name", "f| name", just "name"
 */
export function normalizeCampfireQuery(input: string): string {
  return input.replace(/^f\s*[|/]\s*/i, "").trim();
}
