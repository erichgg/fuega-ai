import { query } from "@/lib/db";

// ─── Types ───────────────────────────────────────────────────

export interface SearchResult {
  type: "post" | "campfire" | "user";
  id: string;
  title: string;
  snippet: string;
  meta?: {
    campfire?: string;
    author?: string;
    sparkCount?: number;
    memberCount?: number;
    createdAt?: string;
  };
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

// ─── Helpers ─────────────────────────────────────────────────

function clampLimit(limit: number | undefined): number {
  const n = limit ?? 25;
  return Math.max(1, Math.min(n, 100));
}

function clampOffset(offset: number | undefined): number {
  return Math.max(0, offset ?? 0);
}

// ─── Search Posts ────────────────────────────────────────────

export async function searchPosts(
  q: string,
  limit?: number,
  offset?: number,
): Promise<SearchResponse> {
  const lim = clampLimit(limit);
  const off = clampOffset(offset);

  const countResult = await query<{ total: string }>(
    `SELECT COUNT(*) AS total
     FROM posts p
     WHERE p.deleted_at IS NULL
       AND p.is_removed = FALSE
       AND p.search_vector @@ plainto_tsquery('english', $1)`,
    [q],
  );
  const total = parseInt(countResult.rows[0]?.total ?? "0", 10);

  const rows = await query<{
    id: string;
    title: string;
    body: string | null;
    campfire_name: string;
    author_username: string;
    sparks: number;
    created_at: string;
    rank: number;
  }>(
    `SELECT
       p.id,
       p.title,
       p.body,
       c.name AS campfire_name,
       u.username AS author_username,
       p.sparks,
       p.created_at,
       ts_rank(p.search_vector, plainto_tsquery('english', $1)) AS rank
     FROM posts p
     JOIN campfires c ON c.id = p.campfire_id
     JOIN users u ON u.id = p.author_id
     WHERE p.deleted_at IS NULL
       AND p.is_removed = FALSE
       AND p.search_vector @@ plainto_tsquery('english', $1)
     ORDER BY rank DESC, p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [q, lim, off],
  );

  const results: SearchResult[] = rows.rows.map((r) => ({
    type: "post" as const,
    id: r.id,
    title: r.title,
    snippet: r.body ? r.body.slice(0, 200) : "",
    meta: {
      campfire: r.campfire_name,
      author: r.author_username,
      sparkCount: r.sparks,
      createdAt: r.created_at,
    },
  }));

  return { results, total, query: q };
}

// ─── Search Campfires ────────────────────────────────────────

export async function searchCampfires(
  q: string,
  limit?: number,
  offset?: number,
): Promise<SearchResponse> {
  const lim = clampLimit(limit);
  const off = clampOffset(offset);

  const pattern = `%${q}%`;

  const countResult = await query<{ total: string }>(
    `SELECT COUNT(*) AS total
     FROM campfires c
     WHERE c.deleted_at IS NULL
       AND c.is_banned = FALSE
       AND (c.name ILIKE $1 OR c.description ILIKE $1)`,
    [pattern],
  );
  const total = parseInt(countResult.rows[0]?.total ?? "0", 10);

  const rows = await query<{
    id: string;
    name: string;
    description: string;
    member_count: number;
    created_at: string;
    sim: number;
  }>(
    `SELECT
       c.id,
       c.name,
       c.description,
       c.member_count,
       c.created_at,
       GREATEST(
         similarity(c.name, $1),
         similarity(c.description, $1)
       ) AS sim
     FROM campfires c
     WHERE c.deleted_at IS NULL
       AND c.is_banned = FALSE
       AND (c.name ILIKE $2 OR c.description ILIKE $2)
     ORDER BY sim DESC, c.member_count DESC
     LIMIT $3 OFFSET $4`,
    [q, pattern, lim, off],
  );

  const results: SearchResult[] = rows.rows.map((r) => ({
    type: "campfire" as const,
    id: r.id,
    title: r.name,
    snippet: r.description ? r.description.slice(0, 200) : "",
    meta: {
      memberCount: r.member_count,
      createdAt: r.created_at,
    },
  }));

  return { results, total, query: q };
}

// ─── Search Users ────────────────────────────────────────────

export async function searchUsers(
  q: string,
  limit?: number,
  offset?: number,
): Promise<SearchResponse> {
  const lim = clampLimit(limit);
  const off = clampOffset(offset);

  const pattern = `%${q}%`;

  const countResult = await query<{ total: string }>(
    `SELECT COUNT(*) AS total
     FROM users u
     WHERE u.deleted_at IS NULL
       AND u.is_banned = FALSE
       AND u.username ILIKE $1`,
    [pattern],
  );
  const total = parseInt(countResult.rows[0]?.total ?? "0", 10);

  const rows = await query<{
    id: string;
    username: string;
    created_at: string;
    sim: number;
  }>(
    `SELECT
       u.id,
       u.username,
       u.created_at,
       similarity(u.username, $1) AS sim
     FROM users u
     WHERE u.deleted_at IS NULL
       AND u.is_banned = FALSE
       AND u.username ILIKE $2
     ORDER BY sim DESC, u.created_at DESC
     LIMIT $3 OFFSET $4`,
    [q, pattern, lim, off],
  );

  const results: SearchResult[] = rows.rows.map((r) => ({
    type: "user" as const,
    id: r.id,
    title: r.username,
    snippet: "",
    meta: {
      createdAt: r.created_at,
    },
  }));

  return { results, total, query: q };
}

// ─── Search All ──────────────────────────────────────────────

export async function searchAll(
  q: string,
  limit?: number,
  offset?: number,
): Promise<SearchResponse> {
  // Distribute results across types: posts get half, campfires and users split the rest
  const lim = clampLimit(limit);
  const postLimit = Math.ceil(lim / 2);
  const campfireLimit = Math.ceil(lim / 4);
  const userLimit = lim - postLimit - campfireLimit;

  const [posts, campfires, users] = await Promise.all([
    searchPosts(q, postLimit, 0),
    searchCampfires(q, campfireLimit, 0),
    searchUsers(q, userLimit, 0),
  ]);

  // For "all" search, offset/limit apply to the combined view but we ignore
  // pagination on individual types for simplicity (the page handles tab switching).
  const results = [
    ...posts.results,
    ...campfires.results,
    ...users.results,
  ];

  const total = posts.total + campfires.total + users.total;

  return { results, total, query: q };
}
