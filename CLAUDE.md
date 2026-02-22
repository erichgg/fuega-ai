# fuega.ai Development Context

## Project Overview
AI-moderated discussion platform with transparent community governance.
Communities write and vote on their own AI moderator prompts.
Spark/douse voting. Three-tier governance (community → category → platform).

## Tech Stack
- **Framework:** Next.js 14 (App Router), TypeScript strict mode
- **Database:** PostgreSQL 15+ (Railway), single-schema with RLS
- **Styling:** Tailwind CSS + shadcn/ui
- **AI:** Claude API (Anthropic) for moderation
- **Infra:** Railway (hosting + DB) + Cloudflare (DNS, CDN, DDoS)
- **Auth:** JWT (stored httpOnly cookie), bcrypt passwords

## Terminology — ALWAYS USE THESE
| Platform Term | fuega.ai Term        | NEVER Say |
|---------------|----------------------|-----------|
| Subreddit     | Community            | subreddit |
| r/name        | f \| name (display)  | r/name    |
| Upvote        | Spark                | upvote    |
| Downvote      | Douse                | downvote  |
| Karma         | Spark score          | karma     |
| Moderator     | AI agent             | mod/moderator |

**Community prefix display:** Always `f | name` (with spaces around pipe).
URL routes still use `/f/[community]`. Search must handle: `f|name`, `f/name`, `f | name`.

## File Structure
```
/app            → Next.js App Router pages & API routes
/components     → React components (shadcn/ui based)
/lib            → Business logic, DB queries, utilities
/lib/db         → Database connection, query helpers
/lib/auth       → Authentication logic
/lib/moderation → AI moderation engine
/migrations     → SQL migration files (numbered: 001_, 002_...)
/tests          → Test files mirroring source structure
/public         → Static assets
```

## Database Tables (13 total)
users, communities, community_members, posts, comments, votes,
moderation_logs, moderation_prompts, prompt_votes, reports,
categories, community_categories, ip_hashes

## Security Rules — NON-NEGOTIABLE
1. **NEVER** store raw IPs → SHA-256 hash + rotating salt, delete after 30d
2. **NEVER** concatenate user input into SQL → parameterized queries ONLY
3. **NEVER** trust client-side data → validate everything server-side
4. **NEVER** expose user identity → anonymity is paramount
5. **ALWAYS** use soft deletes (deleted_at timestamp, never DROP/DELETE)
6. **ALWAYS** log AI moderation decisions publicly
7. **ALWAYS** sanitize HTML output (DOMPurify)
8. **ALWAYS** use CSRF tokens on state-changing requests
9. Rate limit all endpoints (see SECURITY.md for limits)
10. Content Security Policy headers on all responses

## Code Standards
- TypeScript strict mode, no `any` types
- All DB queries parameterized via query helpers
- API routes: validate input → authenticate → authorize → execute → respond
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
DATABASE_URL          → PostgreSQL connection (Railway provides)
ANTHROPIC_API_KEY     → Claude API for moderation
JWT_SECRET            → 64-char random string
IP_SALT               → 32-char random string (rotate monthly)
NEXT_PUBLIC_APP_URL   → https://fuega.ai (production)
```

## Key Design Decisions
- **Sync moderation:** AI checks posts in real-time (<3s), not async queues
- **Public mod logs:** Every AI decision visible with reasoning
- **Community autonomy:** Each community writes its own AI prompt via governance vote
- **Vote fuzzing:** Display counts are approximate to prevent manipulation
- **Edit history:** All post/comment edits stored and publicly visible

## Build Phases (from PROMPT.md)
- Phase 0: Project setup, env, CLAUDE.md ← CURRENT
- Phase 1: Database + Auth (migrations, JWT, registration/login)
- Phase 2: Core features (communities, posts, comments, voting)
- Phase 3: AI moderation engine (Claude integration, prompt system)
- Phase 4: Governance (prompt voting, community settings)
- Phase 5: Polish (search, feeds, notifications, deploy)

## Critical Reading
- `SCOPE_AND_REQUIREMENTS.md` → V1 feature spec
- `SECURITY.md` → 7-layer security architecture
- `DATA_SCHEMA.md` → All 13 tables with columns and RLS policies
- `DEPLOYMENT.md` → Railway + Cloudflare infrastructure
- `INJECTION.md` → AI prompt injection defenses

## Current Phase: 2/3 — Backend + Frontend
- [x] Phase 0: Project setup (0.1-0.3) — COMPLETE
- [x] Phase 1: Database schema (1.1-1.3) — COMPLETE
- [ ] Phase 1.4: Database migrations (gamification tables) — NEXT UP
- [x] Phase 2: Core backend (2.1-2.4) — COMPLETE
- [ ] Phase 2: Backend (2.5-2.10) — badges, notifications, referrals, cosmetics, tips, structured AI
- [x] Phase 3: Frontend core (3.1-3.2) — COMPLETE
- [ ] Phase 3: Frontend remaining (3.3-3.8) — state mgmt, nav, badges UI, notifications UI, shop UI, referral UI
