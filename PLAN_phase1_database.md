# Phase 1: PostgreSQL Schema — Implementation Plan

## Context Review
- **Existing files:** Next.js project scaffolded (Phase 0.3 complete), `migrations/run.js` exists
- **Last work done:** Phase 0.3 — project init, config files, app scaffolds, build passing
- **Current state:** Phase 0 complete, no SQL migrations written yet
- **Source of truth:** DATA_SCHEMA.md (13 tables fully specified with columns, constraints, indexes)

---

## Migration Structure

### File: `migrations/001_initial_schema.sql`
**All 13 tables + constraints + basic indexes inline**

Creates tables in dependency order:

1. **`categories`** — no FK dependencies
   - UUID PK, name (unique, lowercase regex), description
   - AI prompt + version for category-level agent
   - `created_at` timestamp

2. **`users`** — no FK dependencies
   - UUID PK, username (unique, 3-30 chars), password_hash (bcrypt)
   - Spark scores: `post_sparks`, `comment_sparks` (CHECK >= 0)
   - Founder badge: `founder_badge_number` (unique, nullable, 1-5000)
   - IP privacy: `ip_address_hash` (SHA-256), `ip_last_seen` (auto-delete after 30d)
   - Ban fields: `is_banned`, `ban_reason`, `banned_at`, `banned_by` (self-ref FK)
   - Soft delete: `deleted_at`
   - `created_at`, `last_login_at`

3. **`communities`** — FK to `users(id)`, `categories(id)`
   - UUID PK, name (unique, lowercase regex, 3-50), display_name, description
   - AI prompt + version
   - `governance_config` JSONB (voting type, quorum %, proposal hours, spark requirements)
   - Stats: `member_count`, `post_count`
   - Ban fields, soft delete, `created_at`, `created_by`

4. **`community_memberships`** — FK to `users(id)`, `communities(id)`
   - UUID PK, UNIQUE(user_id, community_id)
   - `role` (member/moderator/admin), `joined_at`

5. **`posts`** — FK to `communities(id)`, `users(id)`
   - UUID PK, title (1-300), body (up to 40k), post_type (text/link/image)
   - url, image_url
   - Sparks/douses (CHECK >= 0), comment_count
   - Moderation: `is_approved`, `is_removed`, `removal_reason`, `moderated_at`, `moderated_by_agent`
   - Soft delete, `created_at`, `edited_at`

6. **`comments`** — FK to `posts(id)`, `users(id)`, self-ref `parent_id`
   - UUID PK, body (1-10k), depth (0-99)
   - Sparks/douses, moderation fields (same pattern as posts)
   - Soft delete, `created_at`, `edited_at`

7. **`votes`** — FK to `users(id)` (polymorphic on `votable_type`/`votable_id`)
   - UUID PK, UNIQUE(user_id, votable_type, votable_id)
   - `vote_value` SMALLINT: 1 (spark) or -1 (douse)
   - `anonymized` boolean (after 24h)
   - `created_at`

8. **`proposals`** — FK to `communities(id)`, `users(id)`
   - UUID PK, proposal_type (7 types), title, description
   - `proposed_changes` JSONB
   - Lifecycle: discussion_ends_at, voting_ends_at, status (5 states)
   - Vote counts: for/against/abstain, `implemented_at`

9. **`proposal_votes`** — FK to `proposals(id)`, `users(id)`
   - UUID PK, UNIQUE(proposal_id, user_id)
   - `vote` (for/against/abstain)

10. **`moderation_appeals`** — FK to `users(id)` (moderation_log FK added later via ALTER)
    - UUID PK, appellant_id, appeal_text (500 char max)
    - Status: pending/upheld/overturned
    - `resolved_at`, `resolution_reason`, `resolved_by_agent`
    - Created before `moderation_log` to resolve circular FK

11. **`moderation_log`** — FK to `communities(id)`, `users(id)`, `moderation_appeals(id)`
    - UUID PK, content_type (post/comment), content_id
    - Agent level (community/category/platform), decision (approved/removed/flagged/warned)
    - `reason`, `ai_model`, `prompt_version`
    - `appealed` boolean, `appeal_id`

12. **`ai_prompt_history`** — FK to `users(id)`, `proposals(id)`
    - UUID PK, entity_type (community/category/platform), entity_id
    - `prompt_text`, `version`
    - `created_at`, `created_by`, `proposal_id`

13. **`council_members`** — FK to `categories(id)`, `communities(id)`, `users(id)`
    - UUID PK, term_start, term_end, is_active
    - Partial unique constraint: one active council member per category+community

**Circular FK resolution:**
- `moderation_appeals` references `moderation_log(id)` — add FK via ALTER TABLE after both exist
- `moderation_log` references `moderation_appeals(id)` — add FK via ALTER TABLE after both exist
- `ai_prompt_history` references `proposals(id)` — proposals created first, so straightforward

---

### File: `migrations/002_rls_policies.sql`
**Row-Level Security on ALL 13 tables**

Approach: App sets `app.user_id` via `SET LOCAL` on each request.

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| users | All (public profiles) | N/A (app handles) | Own only | N/A (soft delete) |
| communities | All (public) | Authenticated | Own (creator) | N/A |
| community_memberships | All | Own | Own | Own |
| posts | Approved + not removed + not deleted | Own (author_id match) | Own | N/A |
| comments | Approved + not removed + not deleted | Own | Own | N/A |
| votes | Own only (privacy) | Own | Own | Own |
| proposals | Community members | Community members | Creator only | N/A |
| proposal_votes | Own only | Own | N/A | N/A |
| moderation_log | All (transparency!) | N/A (system) | N/A | N/A |
| moderation_appeals | All (transparency) | Own | N/A | N/A |
| ai_prompt_history | All (transparency) | N/A (system) | N/A | N/A |
| council_members | All | N/A (system) | N/A | N/A |
| categories | All | N/A (system) | N/A | N/A |

Special: Service role (`app.role = 'service'`) bypasses RLS for system operations (moderation, governance automation).

---

### File: `migrations/003_indexes.sql`
**Performance indexes beyond what's created inline with tables**

Hot-path queries to optimize:
1. **Hot posts feed** — `(sparks - douses) DESC, created_at DESC` WHERE approved + not removed
2. **New posts feed** — `created_at DESC` WHERE approved + not removed
3. **Community hot posts** — community_id + hot score composite
4. **Comment threading** — post_id + parent_id + created_at WHERE approved
5. **User spark calculation** — votes by user_id + vote_value WHERE not anonymized
6. **Moderation queue** — posts not yet approved, by created_at
7. **Active proposals** — community_id + status + voting_ends_at
8. **IP hash lookup** — users.ip_address_hash (spam prevention)
9. **Founder badge lookup** — founder_badge_number WHERE NOT NULL

---

### File: `migrations/004_seed_data.sql`
**Test data clearly marked for deletion**

Seed data:
- 3 categories: `technology`, `science`, `politics`
- Platform-level AI prompt (hardcoded reasonable default)
- 2 test users: `test_user_1`, `test_user_2` (bcrypt hashed password: "testpassword123!")
- 1 demo admin: `demo_admin`
- 2 test communities: `f/test-tech`, `f/demo-science`
- Community memberships for test users
- 5 sample posts (mix of text/link)
- 10 sample comments (threaded)
- Sample votes
- 1 sample proposal
- All marked with `-- SEED DATA - DELETE BEFORE PRODUCTION`

---

## Key Design Decisions (Pre-Decided)

1. **UUID primary keys** everywhere (gen_random_uuid) — no sequential IDs leaking info
2. **JSONB for governance_config** — flexible per-community settings without schema changes
3. **Polymorphic votes** (votable_type + votable_id) — one table for post + comment votes
4. **Partial indexes** — WHERE clauses exclude deleted/removed content from hot-path queries
5. **Soft deletes only** — `deleted_at` timestamp, never hard DELETE
6. **Circular FK via ALTER TABLE** — moderation_log ↔ moderation_appeals resolved post-creation
7. **No updated_at on every table** — only where edits are tracked (posts, comments have `edited_at`)
   - Add `updated_at` to: users (profile changes), communities (settings), proposals (status changes)
8. **Council member unique constraint** — partial unique index (WHERE is_active = TRUE)

---

## Execution Order

1. Write `001_initial_schema.sql` — all 13 tables + inline indexes + constraints
2. Write `002_rls_policies.sql` — RLS ENABLE + policies for all tables
3. Write `003_indexes.sql` — performance indexes (hot posts, threading, sparks)
4. Write `004_seed_data.sql` — test data with clear deletion markers
5. Update `migrations/run.js` if needed — ensure it can execute .sql files in order
6. Test: Run migrations against local/Railway PostgreSQL
7. Verify: Table count, constraint enforcement, RLS behavior

---

## Validation Checklist

- [ ] All 13 tables created with correct columns and types
- [ ] All FKs resolve (dependency order correct)
- [ ] RLS enabled on ALL tables with appropriate policies
- [ ] Soft delete (deleted_at) on: users, communities, posts, comments
- [ ] IP hashing column exists (VARCHAR(64) for SHA-256 hex)
- [ ] Spark/douse vote tracking with CHECK constraints
- [ ] Performance indexes for: hot posts, new posts, threading, sparks, moderation queue
- [ ] Seed data marked `-- SEED DATA - DELETE BEFORE PRODUCTION`
- [ ] No raw SQL concatenation anywhere in migration runner
- [ ] `created_at` on all tables, `updated_at` where mutations expected
