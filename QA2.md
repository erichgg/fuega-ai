# QA SWEEP 2 — Post-Wiring Integration Check

**Date:** 2026-02-22
**Trigger:** Frontend wired to real APIs + light/dark mode overhaul. Need to verify everything actually works together.

**Each agent gets:** The project directory, this file (its section), and one job.
**Rule:** Report only. Do not fix anything.

---

## Agent 1: Hook ↔ API Alignment

```
Check every custom hook in lib/hooks/ and verify:
1. The API endpoint each hook calls actually EXISTS in app/api/
2. The HTTP method matches (GET vs POST vs PUT vs DELETE)
3. The request body shape the hook sends matches the Zod schema the API route validates against
4. The response shape the hook expects (TypeScript generic) matches what the API route actually returns
5. Query params the hook sends are actually read by the API route

Cross-reference: lib/hooks/usePosts.ts, useCampfires.ts, useVoting.ts, useComments.ts
Against: app/api/posts/route.ts, app/api/campfires/*/route.ts, app/api/votes/route.ts, app/api/comments/route.ts

Report every mismatch between what hooks send/expect and what APIs accept/return.
Output format:
AGENT: hook-api-alignment
STATUS: PASS | FAIL
ISSUES:
- usePosts sends `author` param but GET /api/posts doesn't read it
- useCreatePost expects `{ post, moderation }` but API returns `{ data }`
```

## Agent 2: Theme Variable Completeness

```
Check that light/dark mode works across the ENTIRE UI:
1. Search app/ and components/ for ANY hardcoded color values:
   - Hex colors (#xxx, #xxxxxx) in className strings (NOT in CSS files)
   - rgb/rgba values in className strings
   - Tailwind color classes that DON'T use the ash/flame/ember scale (e.g. text-gray-400, bg-slate-900, text-white, bg-black, text-zinc-*)
2. In globals.css, find any CSS that uses hardcoded colors instead of var(--xxx)
3. Check that EVERY ash-* and flame-* usage in Tailwind classes has a corresponding CSS variable defined in globals.css
4. Check for missing light mode overrides in the .light {} selector
5. Look for any opacity values that would look wrong on light backgrounds (e.g. bg-black/50)

Report every hardcoded color or missing theme variable.
Output format:
AGENT: theme-completeness
STATUS: PASS | FAIL
ISSUES:
- components/post-card.tsx:42 — uses text-gray-500 instead of text-ash-500
- app/globals.css:156 — hardcoded #FF4500 instead of var(--flame-500)
```

## Agent 3: Loading & Error State Coverage

```
Check every page and component that fetches data:
1. Every page in app/ that uses a hook (usePosts, useCampfire, useAuth, etc.) must have:
   - A loading state (skeleton, spinner, or "Loading..." text)
   - An error state (error message displayed to user)
   - An empty state (when data loads but is empty — "No posts yet" etc.)
2. Every form submission must handle:
   - Loading/submitting state (button disabled, shows spinner)
   - Error state (displays error message)
   - Success state (redirect, toast, or confirmation)
3. Check for race conditions: components that fetch data in useEffect but don't use cleanup/cancelled pattern
4. Check for missing Suspense boundaries around useSearchParams()

Report every page/component missing proper loading, error, or empty states.
Output format:
AGENT: loading-error-states
STATUS: PASS | FAIL
ISSUES:
- app/(app)/home/page.tsx — no empty state when posts array is empty
- app/create-campfire/page.tsx — form has no error display
- app/(app)/f/[campfire]/page.tsx:75 — useEffect fetch without cleanup
```

## Agent 4: Auth Flow & Protected Routes

```
Check the entire authentication flow:
1. Every page in app/(app)/ must check auth — either via useAuth() or middleware
2. The middleware.ts file — what routes does it protect? Are any missing?
3. Login page: does it redirect to /home after successful login?
4. Signup page: does it redirect after successful signup?
5. Landing page: does it redirect logged-in users away?
6. Logout: does it clear cookies AND redirect?
7. Every API route that requires auth — does it call authenticate()?
8. Token refresh — is there a mechanism? Does it work?
9. CSRF tokens — are they sent on every state-changing request?
10. Check for auth state flicker (brief "login" UI shown before auth resolves)

Report every auth gap.
Output format:
AGENT: auth-flow
STATUS: PASS | FAIL
ISSUES:
- app/(app)/settings/page.tsx — no auth check, unprotected page
- middleware.ts — /submit not in protected routes list
- app/api/posts/route.ts POST — no authenticate() call
```

## Agent 5: Component Props & Type Safety

```
Check all custom components in components/fuega/ for:
1. Props interface defined and exported? Or using inline types?
2. Every prop that's passed to a component — does the component actually accept it?
3. Every required prop — is it always provided by callers?
4. onClick handlers on interactive elements (buttons, links) — do they all work?
5. Key props on mapped lists — present and unique?
6. Any use of `as any`, `as unknown`, or @ts-ignore in components
7. Event handlers with wrong types (e.g. onClick expects MouseEvent but gets FormEvent)
8. Unused props (defined in interface but never used in component body)

Report every type safety issue.
Output format:
AGENT: component-types
STATUS: PASS | FAIL
ISSUES:
- PostCard accepts `post` prop but callers pass extra `campfire` prop not in interface
- components/fuega/feed-sort.tsx — onChange handler type mismatch
```

## Agent 6: Adapter & Data Shape Integrity

```
Check lib/adapters/post-adapter.ts and all data transformations:
1. toPostCardData() — does it handle ALL fields the PostCard component needs?
2. toCommentCardData() — does it handle ALL fields comment display needs?
3. flattenCommentTree() — does it correctly flatten nested comments?
4. Check every place these adapters are called — are they handling the response correctly?
5. Check the Post type in lib/api/client.ts against what the API actually returns (look at the service layer return shapes)
6. Check for optional fields that could be undefined but aren't handled (null checks)
7. Look for any page that transforms API data WITHOUT using the adapter (doing it inline instead)

Report every data shape mismatch or missing field handling.
Output format:
AGENT: data-integrity
STATUS: PASS | FAIL
ISSUES:
- toPostCardData() doesn't map `author_display_name` field
- PostCard expects `campfire` string but adapter maps it as `campfire_name`
- app/(app)/home/page.tsx:42 — transforms posts inline instead of using adapter
```

## Agent 7: Navigation & Routing Consistency

```
Check all navigation in the app:
1. Every Link href — does the target page exist?
2. Every router.push() — does the target exist?
3. Campfire routes: are they consistently /f/[name] everywhere? (not /f/[id] sometimes)
4. Post routes: are they consistently /f/[campfire]/[postId]?
5. User routes: are they consistently /u/[username]?
6. Back buttons — do they go to sensible places?
7. After form submission — do redirects go to the right place?
8. Navbar links — do they all work? Active state correct?
9. Footer links — do they all work?
10. 404 handling — is there a not-found page?

Report every broken or inconsistent route.
Output format:
AGENT: navigation
STATUS: PASS | FAIL
ISSUES:
- app/(app)/home/page.tsx:42 — links to /f/[campfireId] but should use campfire name
- components/Navbar.tsx — "Create Post" links to /submit but no campfire preselected
```

## Agent 8: Accessibility Basics

```
Check all pages and components for basic accessibility:
1. Every <img> has alt text (or aria-hidden if decorative)
2. Every form input has a <label> or aria-label
3. Every button has visible text or aria-label
4. Color contrast — text-ash-400 on bg-ash-900 might be too low contrast
5. Focus indicators — interactive elements have visible focus states
6. Semantic HTML — using <nav>, <main>, <article>, <section> appropriately
7. Skip navigation link for keyboard users
8. aria-live regions for dynamic content (vote counts, loading states)
9. Tab order makes sense (no tabIndex > 0)
10. Screen reader text for icon-only buttons

Report every a11y issue found.
Output format:
AGENT: accessibility
STATUS: PASS | FAIL
ISSUES:
- components/fuega/post-card.tsx — spark/douse buttons have no aria-label
- app/page.tsx — decorative images missing aria-hidden
```

## Agent 9: Import Health & Bundle Concerns

```
Check all imports across the codebase:
1. Unused imports — imported but never used in the file
2. Missing imports — referenced but not imported (would cause runtime error)
3. Circular imports — A imports B imports A
4. Client components importing server-only modules (database, fs, crypto)
5. "use client" directive — is it on every component that uses hooks, state, or browser APIs?
6. "use client" unnecessarily — server components marked as client
7. Large library imports that could be tree-shaken (import entire lodash vs lodash/get)
8. Imports from _stashed/ directory (archived code leaking into build)
9. Dynamic imports — are they used where appropriate for code splitting?
10. Check that shadcn/ui components are imported from @/components/ui/ consistently

Report every import issue.
Output format:
AGENT: import-health
STATUS: PASS | FAIL
ISSUES:
- app/(app)/home/page.tsx:3 — unused import: Settings from lucide-react
- components/fuega/post-card.tsx — missing "use client" but uses useState
- lib/hooks/usePosts.ts — imports from lib/db (server module in client code)
```

## Agent 10: Build + Lint + Runtime Verification

```
Run these commands and report ALL output:
1. `npx next build 2>&1` — does production build succeed? Report any warnings too.
2. `npx tsc --noEmit 2>&1` — any type errors?
3. Check package.json for:
   - Dependencies imported in code but missing from package.json
   - Dependencies in package.json but never imported anywhere
4. Check for console.log/console.warn/console.error left in production code (not in API routes where logging is expected)
5. Check for TODO/FIXME/HACK comments that indicate unfinished work
6. Check next.config.* for any misconfigurations or deprecated options

Report everything.
Output format:
AGENT: build-runtime
STATUS: PASS | FAIL
ISSUES:
- BUILD WARNING: "Generating static page /submit timed out"
- TSC: 3 type errors in lib/hooks/usePosts.ts
- console.log found in components/fuega/post-card.tsx:42
- TODO: app/(app)/home/page.tsx:15 — "TODO: add infinite scroll"
```

---

## Fix-It Protocol

After all 10 agents report, collect all issues and:
1. Deduplicate (same file+line from multiple agents)
2. Group by severity: CRITICAL (breaks functionality) → HIGH (wrong behavior) → MEDIUM (cleanup)
3. Fix everything in one pass
4. Rebuild and verify
5. Commit and push
