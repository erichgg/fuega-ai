/**
 * HTML sanitization utilities — SERVER-SIDE ONLY.
 *
 * SECURITY RULE #7: ALWAYS sanitize HTML output before rendering.
 *
 * Lightweight implementation that avoids heavy jsdom/DOMPurify dependency.
 * - `sanitizeText(str)` — strips ALL tags, returns plain text only.
 * - `sanitizeHtml(dirty)` — basic tag allowlist (for future rich content).
 *
 * For client rendering of user text, React text nodes are already XSS-safe
 * (React escapes all HTML in text content automatically).
 */

/**
 * Strip ALL HTML tags and return plain text.
 * Also decodes common HTML entities and collapses excess whitespace.
 * Use in API routes when producing AI input, meta descriptions,
 * notification bodies, search snippets, or any plain-text context.
 */
export function sanitizeText(str: string): string {
  return str
    .replace(/<[^>]*>/g, "") // strip all HTML tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}

/**
 * Sanitize untrusted HTML for safe rendering via dangerouslySetInnerHTML.
 * Allows a minimal safe subset of formatting tags.
 * Use in API routes or server components before serving rich content.
 *
 * NOTE: This is a basic allowlist approach. If rich HTML rendering becomes
 * a core feature, consider adding a proper HTML parser (e.g., sanitize-html).
 */
export function sanitizeHtml(dirty: string): string {
  const ALLOWED_TAGS = new Set([
    "b", "i", "em", "strong", "a", "code", "pre", "br", "p", "ul", "ol", "li",
  ]);

  // Strip tags not in allowlist, keep their text content
  return dirty.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag) => {
    const lower = tag.toLowerCase();
    if (ALLOWED_TAGS.has(lower)) {
      // For <a> tags, only keep href with http(s) or relative URLs
      if (lower === "a" && match.startsWith("<a")) {
        const hrefMatch = match.match(/href=["']([^"']*?)["']/);
        if (hrefMatch) {
          const href = hrefMatch[1] ?? "";
          if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("/")) {
            return `<a href="${href}" rel="noopener noreferrer nofollow" target="_blank">`;
          }
        }
        return "<a>"; // strip dangerous hrefs (javascript:, data:, etc.)
      }
      return match;
    }
    return ""; // strip disallowed tags
  });
}
