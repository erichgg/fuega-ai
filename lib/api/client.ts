/**
 * Typed API client for fuega.ai frontend.
 * Wraps fetch with error handling, auth (credentials: include), and JSON parsing.
 * All state-changing requests include CSRF tokens (double-submit cookie pattern).
 */

// ---------------------------------------------------------------------------
// CSRF helper
// ---------------------------------------------------------------------------

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith("fuega_csrf="));
  return match ? match.split("=")[1] ?? null : null;
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export interface ApiErrorBody {
  error: string;
  code: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface RequestOptions {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

async function request<T>(
  method: Method,
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const url = new URL(path, window.location.origin);

  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    ...opts.headers,
  };

  // Include CSRF token on state-changing requests
  if (method !== "GET") {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers["x-csrf-token"] = csrfToken;
    }
  }

  const init: RequestInit = {
    method,
    credentials: "include",
    headers,
    signal: opts.signal,
  };

  if (opts.body !== undefined && method !== "GET") {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(opts.body);
  }

  const res = await fetch(url.toString(), init);

  if (!res.ok) {
    let body: ApiErrorBody;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      body = { error: res.statusText, code: "UNKNOWN_ERROR" };
    }
    throw new ApiError(res.status, body.code, body.error);
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Convenience methods
// ---------------------------------------------------------------------------

export const api = {
  get<T>(path: string, params?: RequestOptions["params"], signal?: AbortSignal) {
    return request<T>("GET", path, { params, signal });
  },
  post<T>(path: string, body?: unknown) {
    return request<T>("POST", path, { body });
  },
  put<T>(path: string, body?: unknown) {
    return request<T>("PUT", path, { body });
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>("PATCH", path, { body });
  },
  delete<T>(path: string, body?: unknown) {
    return request<T>("DELETE", path, { body });
  },
};

// ---------------------------------------------------------------------------
// Shared response types (match API route shapes)
// ---------------------------------------------------------------------------

export interface PaginatedParams {
  limit?: number;
  offset?: number;
}

export interface Post {
  id: string;
  campfire_id: string;
  author_id: string;
  title: string;
  body: string | null;
  post_type: "text" | "link" | "image";
  url: string | null;
  image_url: string | null;
  // DB columns are `sparks` and `douses`, but adapter normalizes to spark_count/douse_count
  sparks: number;
  douses: number;
  spark_count: number;
  douse_count: number;
  comment_count: number;
  is_approved: boolean;
  is_removed: boolean;
  removal_reason: string | null;
  moderation_status: "approved" | "flagged" | "removed" | "pending";
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  author_username?: string;
  campfire_name?: string;
}

export interface Comment {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_id: string;
  body: string;
  sparks: number;
  douses: number;
  spark_count: number;  // alias for adapter compatibility
  douse_count: number;  // alias for adapter compatibility
  is_approved: boolean;
  is_removed: boolean;
  removal_reason: string | null;
  moderation_status: "approved" | "flagged" | "removed" | "pending";  // adapter compatibility
  depth: number;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  author_username?: string;
  replies?: Comment[];
  children?: Comment[];
}

export interface Campfire {
  id: string;
  name: string;
  display_name?: string;
  description: string;
  created_by: string;
  member_count: number;
  post_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  banner_url?: string | null;
  theme_color?: string | null;
  tagline?: string | null;
}

export interface Proposal {
  id: string;
  campfire_id: string;
  author_id: string;
  title: string;
  description: string;
  proposed_changes: Record<string, unknown>;
  status: "discussion" | "voting" | "passed" | "failed" | "implemented";
  votes_for: number;
  votes_against: number;
  votes_abstain: number;
  voting_ends_at: string | null;
  created_at: string;
}

export interface Badge {
  badge_id: string;
  name: string;
  description: string;
  category: "founder" | "engagement" | "contribution" | "governance" | "referral" | "special";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  version: string;
}

export interface UserBadge {
  badge_id: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  earned_at: string;
  metadata: Record<string, unknown> | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  action_url: string;
  content: Record<string, unknown>;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  reply_post: boolean;
  reply_comment: boolean;
  spark: boolean;
  mention: boolean;
  campfire_update: boolean;
  governance: boolean;
  badge_earned: boolean;
  tip_received: boolean;
  referral: boolean;
  push_enabled: boolean;
  push_reply_post: boolean;
  push_reply_comment: boolean;
  push_spark: boolean;
  push_mention: boolean;
  push_governance: boolean;
  push_badge_earned: boolean;
  push_referral: boolean;
}

export interface ReferralStats {
  referral_count: number;
  next_badge_at: number | null;
  next_badge_name: string | null;
  current_badge: string | null;
}

export interface ReferralHistoryEntry {
  referee_username: string;
  joined_at: string;
  status: "active" | "reverted";
}

export interface FeatureFlags {
  badges: boolean;
  tip_jar: boolean;
  notifications: boolean;
}

export interface VoteResult {
  vote: 1 | -1 | null;
  sparks: number;
  douses: number;
  action: "voted" | "changed" | "removed";
}

export interface ModerationResult {
  decision: "approve" | "remove" | "flag";
  confidence: number;
  reasoning: string;
}
