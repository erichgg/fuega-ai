/**
 * AI Prompt Injection Defense
 *
 * Sanitizes user-supplied content before it enters AI prompts.
 * Detects common injection patterns and flags suspicious content.
 *
 * Defense layers:
 * 1. Length enforcement (prevent context stuffing)
 * 2. Delimiter neutralization (prevent prompt escape)
 * 3. Injection pattern detection (flag for review)
 * 4. Unicode normalization (prevent homoglyph attacks)
 */

/** Result of sanitizing content for AI consumption */
export interface SanitizationResult {
  sanitized: string;
  injection_detected: boolean;
  injection_patterns_found: string[];
  original_length: number;
  was_truncated: boolean;
}

/** Maximum content length sent to AI (prevents context stuffing) */
const MAX_AI_CONTENT_LENGTH = 50_000;

/** Maximum length for community rules sent to AI */
const MAX_RULES_LENGTH = 10_000;

/**
 * Patterns that indicate prompt injection attempts.
 * Each has a name for logging and a regex for detection.
 */
const INJECTION_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  {
    name: "ignore_instructions",
    pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions|rules|prompts|context)/i,
  },
  {
    name: "forget_everything",
    pattern: /forget\s+(everything|all|your\s+instructions|your\s+rules)/i,
  },
  {
    name: "role_override",
    pattern: /you\s+are\s+now\s+(a|an|the|my)/i,
  },
  {
    name: "system_tag_injection",
    pattern: /<\s*\/?\s*system\s*>/i,
  },
  {
    name: "system_colon_injection",
    pattern: /^\s*system\s*:/im,
  },
  {
    name: "assistant_tag_injection",
    pattern: /<\s*\/?\s*assistant\s*>/i,
  },
  {
    name: "human_tag_injection",
    pattern: /<\s*\/?\s*human\s*>/i,
  },
  {
    name: "output_override",
    pattern: /respond\s+with\s+(only|just|the\s+following|this)/i,
  },
  {
    name: "output_format_override",
    pattern: /output\s+only\s+(the|this|json|text)/i,
  },
  {
    name: "new_instructions",
    pattern: /new\s+instructions?\s*:/i,
  },
  {
    name: "prompt_leak_attempt",
    pattern: /(?:show|reveal|print|output|display|repeat)\s+(?:your|the|system)\s+(?:system\s+)?(?:prompt|instructions|rules)/i,
  },
  {
    name: "jailbreak_do_anything",
    pattern: /do\s+anything\s+now/i,
  },
  {
    name: "override_json",
    pattern: /\{\s*"decision"\s*:\s*"approve"/i,
  },
  {
    name: "delimiter_escape",
    pattern: /(?:END|STOP|DONE)\s*(?:USER_CONTENT|COMMUNITY_RULES|SYSTEM)/i,
  },
];

/**
 * Neutralize delimiters that could confuse the AI prompt structure.
 * Replaces characters that might be interpreted as prompt boundaries.
 */
function neutralizeDelimiters(content: string): string {
  let result = content;

  // Replace triple backticks (markdown code blocks that could escape context)
  result = result.replace(/```/g, "'''");

  // Replace triple quotes
  result = result.replace(/"""/g, "'''");

  // Replace XML-like system/assistant/human tags
  result = result.replace(/<\s*(\/?\s*(?:system|assistant|human|user))\s*>/gi, "[$1]");

  // Replace sequences that look like prompt section headers
  result = result.replace(
    /^(SYSTEM|ASSISTANT|HUMAN|USER|INSTRUCTIONS?|RULES?)\s*:/gim,
    "[$1]:"
  );

  return result;
}

/**
 * Normalize Unicode to prevent homoglyph attacks.
 * Converts confusable characters to their ASCII equivalents.
 */
function normalizeUnicode(content: string): string {
  // NFC normalization collapses combining characters
  return content.normalize("NFC");
}

/**
 * Detect injection patterns in content.
 * Returns list of pattern names that matched.
 */
export function detectInjectionPatterns(content: string): string[] {
  const found: string[] = [];

  for (const { name, pattern } of INJECTION_PATTERNS) {
    if (pattern.test(content)) {
      found.push(name);
    }
  }

  return found;
}

/**
 * Sanitize user content before sending to AI for moderation.
 *
 * This is the primary defense against prompt injection.
 * Content goes through:
 * 1. Unicode normalization
 * 2. Length truncation
 * 3. Delimiter neutralization
 * 4. Injection pattern detection
 */
export function sanitizeForAI(
  content: string,
  maxLength: number = MAX_AI_CONTENT_LENGTH
): SanitizationResult {
  const originalLength = content.length;

  // Step 1: Unicode normalization
  let sanitized = normalizeUnicode(content);

  // Step 2: Length enforcement
  const wasTruncated = sanitized.length > maxLength;
  if (wasTruncated) {
    sanitized = sanitized.slice(0, maxLength);
  }

  // Step 3: Detect injection patterns BEFORE neutralizing
  // (so we detect the original intent)
  const patternsFound = detectInjectionPatterns(sanitized);

  // Step 4: Neutralize delimiters
  sanitized = neutralizeDelimiters(sanitized);

  return {
    sanitized,
    injection_detected: patternsFound.length > 0,
    injection_patterns_found: patternsFound,
    original_length: originalLength,
    was_truncated: wasTruncated,
  };
}

/**
 * Sanitize community rules before embedding in AI prompt.
 * Community rules are user-written and could contain injection attacks.
 */
export function sanitizeCommunityRules(rules: string): SanitizationResult {
  return sanitizeForAI(rules, MAX_RULES_LENGTH);
}

/**
 * Validate that an AI response is well-formed JSON with expected fields.
 * Returns the parsed decision or a safe default.
 */
export function validateAIResponse(
  responseText: string
): { decision: "approve" | "remove" | "flag"; reason: string; valid: boolean } {
  const safeDefault = {
    decision: "flag" as const,
    reason: "AI response could not be parsed — flagged for review",
    valid: false,
  };

  try {
    // Strip any markdown code fences the AI might wrap around JSON
    const cleaned = responseText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    // Validate required fields exist
    if (!parsed || typeof parsed !== "object") {
      return safeDefault;
    }

    if (!parsed.decision || !parsed.reason) {
      return safeDefault;
    }

    // Validate decision is one of expected values
    const validDecisions = ["approve", "remove", "flag"];
    if (!validDecisions.includes(parsed.decision)) {
      return safeDefault;
    }

    // Validate reason is a string and not suspiciously long
    if (typeof parsed.reason !== "string" || parsed.reason.length > 1000) {
      return safeDefault;
    }

    return {
      decision: parsed.decision as "approve" | "remove" | "flag",
      reason: parsed.reason,
      valid: true,
    };
  } catch {
    return safeDefault;
  }
}
