const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const MIGRATIONS_DIR = path.join(__dirname);

async function getPool() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });

  // Verify connection
  const client = await pool.connect();
  const {
    rows: [{ current_database }],
  } = await client.query("SELECT current_database()");
  console.log(`Connected to database: ${current_database}`);
  client.release();

  return pool;
}

async function ensureMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getExecutedMigrations(pool) {
  const { rows } = await pool.query(
    "SELECT name FROM _migrations ORDER BY name"
  );
  return new Set(rows.map((r) => r.name));
}

function getMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

async function runMigrations(pool) {
  await ensureMigrationsTable(pool);
  const executed = await getExecutedMigrations(pool);
  const files = getMigrationFiles();

  let ran = 0;
  for (const file of files) {
    if (executed.has(file)) {
      console.log(`  SKIP  ${file} (already executed)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
    console.log(`  RUN   ${file}...`);

    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      await pool.query("COMMIT");
      ran++;
      console.log(`  OK    ${file}`);
    } catch (err) {
      await pool.query("ROLLBACK");
      console.error(`  FAIL  ${file}:`, err.message);
      process.exit(1);
    }
  }

  return ran;
}

async function rollbackLast(pool) {
  await ensureMigrationsTable(pool);
  const { rows } = await pool.query(
    "SELECT name FROM _migrations ORDER BY executed_at DESC LIMIT 1"
  );

  if (rows.length === 0) {
    console.log("No migrations to rollback.");
    return;
  }

  const lastMigration = rows[0].name;
  console.log(`  ROLLBACK  ${lastMigration}...`);

  await pool.query("BEGIN");
  try {
    await pool.query("DELETE FROM _migrations WHERE name = $1", [
      lastMigration,
    ]);
    await pool.query("COMMIT");
    console.log(`  OK    Removed ${lastMigration} from migration history.`);
    console.log(
      "  NOTE  The SQL changes were NOT reversed. To fully rollback,"
    );
    console.log(
      "        drop the affected tables manually or use: npm run migrate:reset"
    );
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(`  FAIL  Rollback of ${lastMigration}:`, err.message);
    process.exit(1);
  }
}

async function resetAll(pool) {
  console.log("  RESET  Dropping all tables and re-running migrations...");

  await pool.query("BEGIN");
  try {
    // Drop all tables in reverse dependency order
    const tables = [
      "council_members",
      "ai_prompt_history",
      "moderation_appeals",
      "moderation_log",
      "proposal_votes",
      "proposals",
      "votes",
      "comments",
      "posts",
      "community_memberships",
      "communities",
      "users",
      "categories",
      "_migrations",
    ];

    for (const table of tables) {
      await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      console.log(`  DROP  ${table}`);
    }

    // Drop trigger function
    await pool.query(
      "DROP FUNCTION IF EXISTS trigger_set_updated_at() CASCADE"
    );
    console.log("  DROP  trigger_set_updated_at()");

    // Drop role if exists
    await pool.query("DROP ROLE IF EXISTS fuega_app");
    console.log("  DROP  fuega_app role");

    await pool.query("COMMIT");
    console.log("  OK    All tables dropped.\n");
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("  FAIL  Reset:", err.message);
    process.exit(1);
  }

  // Re-run all migrations
  const ran = await runMigrations(pool);
  return ran;
}

async function showStatus(pool) {
  await ensureMigrationsTable(pool);
  const executed = await getExecutedMigrations(pool);
  const files = getMigrationFiles();

  console.log("\nMigration Status:");
  console.log("─".repeat(50));
  for (const file of files) {
    const status = executed.has(file) ? "✓" : "○";
    console.log(`  ${status}  ${file}`);
  }
  console.log("─".repeat(50));
  console.log(`  ${executed.size} executed, ${files.length - executed.size} pending\n`);
}

async function main() {
  const command = process.argv[2] || "up";
  const pool = await getPool();

  try {
    switch (command) {
      case "up": {
        const ran = await runMigrations(pool);
        console.log(
          ran > 0
            ? `\n${ran} migration(s) executed successfully.`
            : "\nNo new migrations to run."
        );
        break;
      }
      case "rollback":
        await rollbackLast(pool);
        break;
      case "reset":
        const ran = await resetAll(pool);
        console.log(`\nReset complete. ${ran} migration(s) re-executed.`);
        break;
      case "status":
        await showStatus(pool);
        break;
      default:
        console.log("Usage: node migrations/run.js [up|rollback|reset|status]");
        console.log("  up        Run pending migrations (default)");
        console.log("  rollback  Remove last migration from history");
        console.log("  reset     Drop all tables and re-run migrations");
        console.log("  status    Show migration status");
        process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration runner failed:", err.message);
  process.exit(1);
});
