# fuega.ai Development Context

## Project Overview
AI-moderated discussion platform with transparent community governance.
Flat community model — each Campfire governs itself via structured governance variables.
Spark/douse voting. Glow reputation. Tender = compiled AI governance prompt.

## Tech Stack
- **Framework:** Next.js 14 (App Router), TypeScript strict mode
- **Database:** PostgreSQL 15+ (Railway), single-schema with RLS
- **Styling:** Tailwind CSS + shadcn/ui
- **AI:** Claude API (Anthropic) for moderation
- **Infra:** Railway (hosting + DB) + Cloudflare (DNS, CDN, DDoS)
- **Auth:** JWT (stored httpOnly cookie), bcrypt passwords

## Terminology — ALWAYS USE THESE
| Concept | fuega.ai Term | NEVER Say |
|---------|---------------|-----------|
| Community | Campfire | subreddit, community, sub |
| Community home | Hearth | front page, homepage |
| Upvote | Spark | upvote, like |
| Downvote | Douse | downvote, dislike |
| Reputation | Glow | karma, score, points |
| AI governance prompt | Tender | automod, mod rules |
| User flair | Brand | flair, tag |
| Platform rules | Principles | site rules, TOS |
| AI moderator | (community-named) | mod, moderator, AutoMod |

**Routing:** Flat — `f/[name]`. No tiers, no categories, no nesting.
URL: `/f/[campfire-name]`. Hearth = campfire's main page.

## Governance Architecture
- **Principles:** Immutable platform-level rules. Enforced in every Tender.
- **Governance Variables:** Registry of configurable settings per campfire.
  - Stored in `governance_variables` table (data-driven, not code).
  - Each variable has: key, data_type, bounds (min/max), default, level.
  - Campfire overrides stored in `campfire_settings` with full audit trail.
- **Tender:** Compiled AI prompt = Principles + variable values + security wrapper.
  - Communities never write raw prompts — they set variables, Tender compiles.
  - Security sandwich: Principles (top) → structured vars → free-text vars (untrusted) → anti-injection (bottom).

## File Structure
```
/app            -> Next.js App Router pages & API routes
/components     -> React components (shadcn/ui based)
/lib            -> Business logic, DB queries, utilities
/lib/db         -> Database connection, query helpers
/lib/auth       -> Authentication + rate limiting
/lib/ai         -> Structured AI config (Tender compiler)
/lib/moderation -> AI moderation engine
/lib/services   -> Service layer (votes, comments, badges, etc.)
/lib/validation -> Zod schemas for API input validation
/lib/hooks      -> Client-side React hooks
/lib/api        -> Typed API client for frontend
/lib/monitoring -> Logging, metrics, alerts, cron jobs
/migrations     -> SQL migration files (numbered: 001_, 002_...)
/tests          -> Test files mirroring source structure
/public         -> Static assets
/_stashed       -> Archived/pre-redesign code (excluded from build)
```

## Database Tables

> **NOTE:** Migrations are in pre-redesign state (old naming). The TARGET schema uses
> campfire/campfire_members naming. The ACTUAL current tables from migrations are listed
> separately below. Phase 1.4 migrations will rename and add tables to match the target.

**Target Schema (post-redesign):**
users, campfires, campfire_members, posts, comments, votes,
campfire_mod_logs, site_mod_logs, governance_variables, campfire_settings,
campfire_settings_history, reports, ip_hashes,
badges, user_badges, cosmetics, user_cosmetics, tips, notifications,
user_push_subscriptions, referrals

**Current Migrations (pre-redesign, actual DB):**
users, communities (→ campfires), community_memberships (→ campfire_members),
posts, comments, votes, moderation_log (→ campfire_mod_logs),
moderation_appeals, ai_prompt_history, proposals, council_members, categories,
badges, user_badges, notifications, user_push_subscriptions, referrals,
badge_definitions (from gamification migrations)

## Security Rules — NON-NEGOTIABLE
1. **NEVER** store raw IPs -> SHA-256 hash + rotating salt, delete after 30d
2. **NEVER** concatenate user input into SQL -> parameterized queries ONLY
3. **NEVER** trust client-side data -> validate everything server-side
4. **NEVER** expose user identity -> anonymity is paramount
5. **ALWAYS** use soft deletes (deleted_at timestamp, never DROP/DELETE)
6. **ALWAYS** log AI moderation decisions publicly (per-campfire mod log)
7. **ALWAYS** sanitize HTML output (use DOMPurify or isomorphic-dompurify at render time)
8. **ALWAYS** use CSRF tokens on state-changing requests
9. Rate limit all endpoints (see SECURITY.md for limits)
10. Content Security Policy headers on all responses

## Code Standards
- TypeScript strict mode, no `any` types
- All DB queries parameterized via query helpers
- API routes: validate input -> authenticate -> authorize -> execute -> respond
- Error responses: `{ error: string, code: string }` (never leak internals)
- All moderation actions return `{ decision, confidence, reasoning }`
- Mobile-first responsive design (mobile = desktop priority)
- Components: server components default, 'use client' only when needed

## API Route Pattern
```typescript
// app/api/[resource]/route.ts
export async function POST(req: Request) {
  const body = await req.json()
  const validated = schema.parse(body)        // zod validation
  const user = await authenticate(req)         // JWT verify
  await authorize(user, 'action', resource)    // permission check
  const result = await doThing(validated)       // business logic
  return Response.json(result)
}
```

## Testing
- Framework: Vitest + React Testing Library
- Run: `npm test` (all), `npm test -- path/to/file` (single)
- Coverage target: 80%+
- Test files: `*.test.ts` / `*.test.tsx` next to source

## Environment Variables (see .env.example)
```
DATABASE_URL                 -> PostgreSQL connection (Railway provides)
ANTHROPIC_API_KEY            -> Claude API for moderation
JWT_SECRET                   -> 64-char random string
IP_SALT                      -> 32-char random string (rotate monthly)
NEXT_PUBLIC_APP_URL          -> https://fuega.ai (production)
NEXT_PUBLIC_VAPID_PUBLIC_KEY -> Web Push public key (browser)
VAPID_PUBLIC_KEY             -> Web Push public key (server)
VAPID_PRIVATE_KEY            -> Web Push private key (secret)
VAPID_EMAIL                  -> mailto: address for VAPID
MONITORING_SECRET            -> Secret for /api/monitoring/* endpoints
CRON_SECRET                  -> Secret for cron endpoints
ALERT_WEBHOOK_URL            -> Discord/Slack webhook for alerts
LOG_LEVEL                    -> debug | info | warn | error (default: info)
RAILWAY_ENVIRONMENT          -> Set by Railway (production/staging)
ENABLE_BADGE_DISTRIBUTION    -> "true" to enable badges
ENABLE_TIP_JAR               -> "true" to enable tip jar
ENABLE_NOTIFICATIONS         -> "true" to enable notifications
ENABLE_COSMETICS_SHOP        -> "true" to enable cosmetics
PUBLIC_LAUNCH_DATE           -> ISO date for Founder badge cutoff
```

## Key Design Decisions
- **Sync moderation:** AI checks posts in real-time (<3s), not async queues
- **Public mod logs:** Per-campfire mod log + site-level mod log for platform actions
- **No raw prompts:** Communities set governance variables, Tender compiles the prompt
- **Vote fuzzing:** Display counts are approximate to prevent manipulation
- **Edit history:** All post/comment edits stored and publicly visible
- **Scalable variables:** New governance variables = DB insert, not code change

## Pages
- **How It Works** — explains the platform mechanics
- **About** — team/mission/vision
- **Security** — transparency page on security practices
- **Mod Log** — per-campfire (AI actions) + site-level (platform actions on campfires)

## Critical Reading
- `SCOPE_AND_REQUIREMENTS.md` -> V1 feature spec
- `SECURITY.md` -> 7-layer security architecture
- `DATA_SCHEMA.md` -> All tables with columns and RLS policies
- `DEPLOYMENT.md` -> Railway + Cloudflare infrastructure
- `INJECTION.md` -> AI prompt injection defenses
- `GAMIFICATION.md` -> Badges, cosmetics, notifications, referrals

## Current Phase: Redesign Sweep
- [x] Phase 0: Project setup (0.1-0.3)
- [x] Phase 1: Database schema (1.1-1.3)
- [x] Phase 2: Core backend (2.1-2.4)
- [x] Phase 3: Frontend core (3.1-3.9) — includes badges, notifications, referrals, settings
- [x] QA sweep: Security fixes, terminology, rate limiting, force-dynamic, badge colors
- [ ] Redesign: Flat model + governance variables + new terminology (doc sweep)
- [ ] Phase 1.4: Database migrations (governance + gamification tables)
- [ ] Phase 2: Backend (2.5-2.10) — remaining badges, cosmetics, tips
- [ ] Phase 3: Frontend remaining — cosmetics shop, tip jar UI
