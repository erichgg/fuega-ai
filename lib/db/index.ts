import { Pool, type QueryResult, type QueryResultRow } from "pg";

const connStr = process.env.DATABASE_URL ?? "";
const isRemote = connStr.includes("rlwy.net") || connStr.includes("railway") || process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: connStr,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});

/**
 * Execute a parameterized SQL query.
 * NEVER concatenate user input — always use $1, $2, etc.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

/**
 * Execute a query and return the first row, or null.
 */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] ?? null;
}

/**
 * Execute a query and return all rows.
 */
export async function queryAll<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}

export { pool };
