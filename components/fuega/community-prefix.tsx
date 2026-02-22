/**
 * Displays community name in the correct format: f | name
 * URL routes still use /f/[community] (slash in URL path is fine)
 */
export function CommunityPrefix({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span className={className}>
      <span className="text-lava-hot">f</span>
      <span className="text-smoke mx-1">|</span>
      <span>{name}</span>
    </span>
  );
}

/**
 * Normalizes community query input to handle all formats:
 * "f | name", "f|name", "f/name", "f/ name", just "name"
 */
export function normalizeCommunityQuery(input: string): string {
  return input.replace(/^f\s*[|/]\s*/i, "").trim();
}
