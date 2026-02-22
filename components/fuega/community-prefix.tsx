import Link from "next/link";

/**
 * Displays community name in the correct format: f | name
 * URL routes still use /f/[community] (slash in URL path is fine)
 * When linked=true, renders as a clickable link to /f/[name]
 */
export function CommunityPrefix({
  name,
  className,
  linked = false,
}: {
  name: string;
  className?: string;
  linked?: boolean;
}) {
  const content = (
    <span className={`inline-flex items-baseline font-semibold ${className ?? ""}`}>
      <span className="text-flame-500">f</span>
      <span className="text-ash-500 mx-0.5">|</span>
      <span className="text-flame-400">{name}</span>
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
 * Normalizes community query input to handle all formats:
 * "f | name", "f|name", "f/name", "f/ name", just "name"
 */
export function normalizeCommunityQuery(input: string): string {
  return input.replace(/^f\s*[|/]\s*/i, "").trim();
}
