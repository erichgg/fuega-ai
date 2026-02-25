/**
 * Seed script: creates system user only. No starter campfires.
 * Users create all campfires organically.
 * Run: DATABASE_URL=... node scripts/seed-data.js
 */
const { Pool } = require("pg");

const connStr = process.env.DATABASE_URL || "";
const isRemote =
  connStr.includes("rlwy.net") ||
  connStr.includes("railway") ||
  process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: connStr,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Ensure system user exists (for platform-level actions)
    await client.query(
      `INSERT INTO users (id, username, password_hash, post_glow, comment_glow)
       VALUES ($1, $2, $3, 0, 0)
       ON CONFLICT (id) DO NOTHING`,
      [
        "00000000-0000-0000-0000-000000000001",
        "system",
        "$2b$12$placeholder.hash.not.for.login.000000000000000000000",
      ],
    );

    await client.query("COMMIT");
    console.log("Seed complete! No campfires seeded — users create them.");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});
