/**
 * Seed script: creates starter campfires only.
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

    const systemId = "00000000-0000-0000-0000-000000000001";

    // All starter campfires (includes existing seeds from migration 004 + new ones)
    const campfires = [
      ["meta", "Meta", "Discuss fuega.ai itself — feature requests, bug reports, and platform feedback."],
      ["general", "General", "Talk about anything. The campfire for everything that doesn't fit elsewhere."],
      ["tech", "Technology", "Technology, programming, gadgets, and digital culture."],
      ["gaming", "Gaming", "Video games, board games, tabletop RPGs — all gaming welcome."],
      ["science", "Science", "Scientific discoveries, research, and evidence-based discussion."],
      ["music", "Music", "Share and discuss music — any genre, any era."],
      ["movies", "Movies & TV", "Film, television, streaming — discuss what you're watching."],
      ["books", "Books & Reading", "Book recommendations, reviews, and literary discussion."],
      ["art", "Art & Design", "Visual art, graphic design, photography, and creative work."],
      ["fitness", "Fitness & Health", "Exercise, nutrition, and wellness discussion."],
      ["cooking", "Cooking & Food", "Recipes, restaurant reviews, and food culture."],
      ["philosophy", "Philosophy", "Ethics, metaphysics, epistemology — deep thinking welcome."],
      ["politics", "Politics", "Political news and civil discourse. All viewpoints welcome."],
      ["sports", "Sports", "All sports — scores, analysis, and fan discussion."],
      ["humor", "Humor", "Jokes, memes, and funny content."],
    ];

    const defaultPrompt = "Be respectful and constructive. Follow the community rules.";

    let created = 0;
    for (const [name, display, desc] of campfires) {
      const { rowCount } = await client.query(
        `INSERT INTO campfires (name, display_name, description, ai_prompt, created_by)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (name) DO NOTHING`,
        [name, display, desc, defaultPrompt, systemId],
      );
      if (rowCount > 0) created++;
    }

    await client.query("COMMIT");

    const { rows } = await client.query("SELECT COUNT(*) as total FROM campfires");
    console.log(`${created} new campfires created. Total: ${rows[0].total}`);
    console.log("Seed complete!");
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
