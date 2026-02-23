/**
 * HTML sanitization utilities — SERVER-SIDE ONLY.
 *
 * SECURITY RULE #7: ALWAYS sanitize HTML output before rendering.
 * This module uses isomorphic-dompurify (which bundles jsdom for Node.js).
 * Import ONLY in server components, API routes, or server-side utilities.
 * Do NOT import in 'use client' components (causes jsdom SSG issues).
 *
 * For client rendering of user text, React text nodes are already XSS-safe
 * (React escapes all HTML in text content automatically).
 *
 * - `sanitizeHtml(dirty)` — strips dangerous HTML, returns safe markup.
 * - `sanitizeText(str)` — strips ALL tags, returns plain text only.
 */

import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize untrusted HTML for safe rendering via dangerouslySetInnerHTML.
 * Allows a minimal safe subset of formatting tags (bold, italic, links, code).
 * Use in API routes or server components before serving rich content.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "code", "pre", "br", "p", "ul", "ol", "li"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}

/**
 * Strip ALL HTML tags and return plain text.
 * Use in API routes when producing meta descriptions, notification bodies,
 * search snippets, or any context where plain text is expected.
 */
export function sanitizeText(str: string): string {
  return DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}
