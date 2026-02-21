/**
 * Database test helpers using PGlite (in-memory PostgreSQL)
 * Runs all 4 migrations to create a fully populated test database.
 */
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";

let db: PGlite | null = null;

const MIGRATIONS_DIR = path.join(process.cwd(), "migrations");

/**
 * Get or create a shared PGlite instance with all migrations applied.
 * The instance is reused across all test files in a single vitest run.
 */
export async function getTestDb(): Promise<PGlite> {
  if (db) return db;

  db = new PGlite();

  // Run migrations in order
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
    await db.exec(sql);
  }

  return db;
}

/**
 * Close the shared PGlite instance (call in afterAll at top level).
 */
export async function closeTestDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

// Well-known test IDs from 004_seed_data.sql
export const TEST_IDS = {
  systemUser: "00000000-0000-0000-0000-000000000001",
  testUser1: "20000000-0000-0000-0000-000000000001",
  testUser2: "20000000-0000-0000-0000-000000000002",
  demoAdmin: "20000000-0000-0000-0000-000000000003",
  categoryTech: "10000000-0000-0000-0000-000000000001",
  categoryScience: "10000000-0000-0000-0000-000000000002",
  communityTestTech: "30000000-0000-0000-0000-000000000001",
  communityDemoScience: "30000000-0000-0000-0000-000000000002",
  post1: "40000000-0000-0000-0000-000000000001",
  post2: "40000000-0000-0000-0000-000000000002",
  post3: "40000000-0000-0000-0000-000000000003",
  comment1: "50000000-0000-0000-0000-000000000001",
  comment2: "50000000-0000-0000-0000-000000000002",
  comment3: "50000000-0000-0000-0000-000000000003",
} as const;

// All 13 expected tables
export const ALL_TABLES = [
  "categories",
  "users",
  "communities",
  "community_memberships",
  "posts",
  "comments",
  "votes",
  "proposals",
  "proposal_votes",
  "moderation_log",
  "moderation_appeals",
  "ai_prompt_history",
  "council_members",
] as const;
