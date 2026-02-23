# QA SWEEP 2 — Post-Deployment Fixes

**Date:** 2026-02-22
**Trigger:** Production deployment revealed old terminology, broken column names, bad copy

---

## Issues Found

### CRITICAL — Blocks functionality

| # | File | Issue | Fix |
|---|------|-------|-----|
| C1 | `app/api/auth/signup/route.ts` | ✅ FIXED — used `founder_badge_number` (column renamed to `founder_number`) | Column name updated |
| C2 | `app/api/auth/login/route.ts` | ✅ FIXED — used `founder_badge_number`, `post_sparks`, `comment_sparks` | Column names updated |
| C3 | `next.config.js` | ✅ FIXED — CSP `strict-dynamic` blocked all JS on production | Removed strict-dynamic |
| C4 | `isomorphic-dompurify` | ✅ FIXED — ERR_REQUIRE_ESM on Railway build | Replaced with lightweight sanitizer |

### HIGH — Old terminology / wrong copy in user-facing pages

| # | File | Line | Issue | Fix |
|---|------|------|-------|-----|
| H1 | `app/page.tsx` | hero | "campfire" used twice on hero — new users don't know what it means | Use "community" in marketing copy, define "campfire" when introduced |
| H2 | `app/join/page.tsx` | ~41 | "You're already part of the fuega campfire" — confusing | → "You already have an account" |
| H3 | `app/(app)/u/[username]/page.tsx` | ~356 | `{comment.sparkCount} sparks` — should be glow | → `glow` |
| H4 | `app/how-it-works/page.tsx` | ~263 | "like a dedicated discussion space" repeats "discussion space" | Rewrite |
| H5 | `app/how-it-works/page.tsx` | ~277 | `f \| campfire-name` pipe format — should be `/f/campfire-name` | Fix route notation |
| H6 | `app/security/page.tsx` | ~239 | "7-layer security architecture" but there are 8 layers | → "8-layer" |
| H7 | `components/fuega/header.tsx` | — | `sparkScore` prop name still used | → `glow` |
| H8 | `components/fuega/Navbar.tsx` | — | Shows `{user.sparkScore} glow` — wrong prop | → `{user.glow} glow` |

### MEDIUM — Backend old architecture (three-tier → flat)

| # | File | Issue | Fix |
|---|------|-------|-----|
| M1 | `lib/moderation/moderate.ts` | `agent_level` includes "cohort" \| "category" — flat model has neither | Remove cohort/category from union type |
| M2 | `lib/ai/prompt-builder.ts` | `buildCategoryPrompt()` function exists — no categories in flat model | Remove entire function |
| M3 | `lib/ai/prompt-builder.ts` | Tier logic includes "cohort" and "category" | Simplify to "campfire" \| "platform" |
| M4 | `lib/ai/moderation.service.ts` | Three-tier pipeline: Platform → Category → Community | Simplify to Platform → Campfire |
| M5 | `lib/ai/moderation.service.ts` | Imports `buildCategoryPrompt` | Remove import |
| M6 | `lib/moderation/moderate.ts` | Comment references "moderation_log table" (renamed) | Fix comment |

### LOW — Incomplete pages / placeholders

| # | File | Issue |
|---|------|-------|
| L1 | `app/principles/page.tsx` | "Full text coming soon" placeholder |
| L2 | `app/supporters/page.tsx` | "page is coming soon" placeholder |
| L3 | `app/terms/page.tsx` | "being finalized" placeholder |
| L4 | `app/privacy/page.tsx` | "being finalized" placeholder |

---

## Execution Plan

1. **H1-H8**: Fix all user-facing copy (hero, join, profile, how-it-works, security, header, navbar)
2. **M1-M6**: Flatten moderation pipeline (remove category/cohort/tier logic)
3. **L1-L4**: Leave as-is (expected for pre-launch)
4. Build, commit, push
