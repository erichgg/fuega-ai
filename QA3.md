# QA SWEEP 3 — Post-Overhaul Integration Check

**Date:** 2026-02-24
**Trigger:** Major UI overhaul (typography, layout restructure, multi-room chat, seed cleanup, light mode). Need to verify nothing broke and new features integrate cleanly.

**Each agent gets:** The project directory, this file (its section), and one job.
**Rule:** Report only. Do not fix anything.

---

## Agent 1: Font & Typography Audit

```
Check that the Inter/JetBrains Mono font split is applied correctly:
1. Body text (post bodies, comment text, chat messages, form inputs, descriptions, paragraphs)
   must NOT have font-mono class — should render in Inter (font-sans)
2. Terminal chrome elements MUST have font-mono:
   - Navbar link labels, username, glow display
   - Sidebar section headers (Discover, My Campfires, Popular)
   - Sidebar nav items and campfire links
   - Footer section headers and bottom bar
   - PostCard metadata line (campfire name, author, timestamp)
   - SparkButton vote count
   - Chat room names (#general, #room-name)
   - Any heading with $ command terminal prefix
3. Check app/layout.tsx — body must have font-sans class (NOT font-mono)
4. Check globals.css — --font-sans must be "Inter", --font-mono must be "JetBrains Mono"
5. Look for any remaining font-mono on body text that should be readable (paragraphs, descriptions)
6. Check that both font CSS variables are applied to <body> tag

Report every misapplied font class.
Output format:
AGENT: typography
STATUS: PASS | FAIL
ISSUES:
- components/fuega/comment-card.tsx:42 — comment body has font-mono (should be font-sans)
- components/fuega/chat-message.tsx:15 — message text missing font-sans / has font-mono
```

## Agent 2: Border Radius Consistency

```
Check that the new radius values are applied properly:
1. In globals.css — verify these values exist:
   --radius: 4px, --radius-sm: 2px, --radius-md: 4px, --radius-lg: 6px, --radius-xl: 8px
2. Scan ALL components for hardcoded rounded-none that overrides the theme radius
   (some are intentional for the terminal aesthetic, but flag all for review)
3. Check that Card, Button, Input, Dialog, and Sheet components use radius vars
4. Look for inconsistent rounding: some elements using rounded-md while siblings use rounded-none
5. Check shadcn/ui components in components/ui/ — do they reference --radius vars?
6. Verify no components have rounded-full on containers (should only be on avatars/badges)

Report every radius inconsistency.
Output format:
AGENT: border-radius
STATUS: PASS | FAIL
ISSUES:
- components/ui/card.tsx:15 — still uses rounded-none instead of rounded-md
- components/fuega/post-card.tsx:42 — rounded-md on card but rounded-none on action buttons
```

## Agent 3: Layout & Sidebar Regression

```
Check the sidebar-to-drawer conversion didn't break navigation:
1. Sidebar is now a Sheet overlay — verify it opens/closes properly:
   - Navbar menu button triggers onOpenSidebar callback
   - app/(app)/layout.tsx passes onOpenSidebar to Navbar
   - Sidebar component receives open/onClose props
   - Sheet slides from left side
2. No persistent sidebar in the DOM — main content should NOT have a flex sibling <aside>
3. Feed content is centered at max-w-2xl — verify layout.tsx has mx-auto max-w-2xl
4. Check that ALL pages inside app/(app)/ render correctly without a persistent sidebar:
   - /home, /trending, /new, /campfires, /governance, /mod-log
   - /f/[campfire], /f/[campfire]/[postId]
   - /u/[username], /settings/*, /submit, /notifications
5. The old sidebar had defaultPopular hardcoded campfires — verify this is REMOVED
6. Popular campfires should come from API (/api/campfires) or show nothing
7. Mobile: verify the mobile nav Sheet (hamburger) still works separately from the sidebar Sheet
8. Check for duplicate Menu icons — sidebar trigger vs mobile nav trigger

Report every layout or navigation issue.
Output format:
AGENT: layout-sidebar
STATUS: PASS | FAIL
ISSUES:
- app/(app)/layout.tsx:42 — still has persistent <Sidebar> in flex layout
- components/fuega/sidebar.tsx — defaultPopular array still exists
- Navbar has two Menu buttons that do different things
```

## Agent 4: PostCard & Voting Refactor

```
Check the post card redesign (inline voting) works correctly:
1. PostCard no longer wraps content in Card/CardContent from shadcn — verify import removed
2. SparkButton is now used with variant="horizontal" in PostCard action bar
3. The old layout was [vote-column | content] — verify this pattern is GONE
4. New layout: campfire chip → title → body → action bar (spark/douse | comments | share | report)
5. SparkButton horizontal variant renders: [spark-btn] [count] [douse-btn] in a row
6. SparkButton vertical variant still works for post detail pages
7. All pages using PostCard pass the same props interface (no breaking changes)
8. Check: app/(app)/home/page.tsx, trending/page.tsx, new/page.tsx, f/[campfire]/page.tsx
   — all use PostCard correctly with onVote, userVote, etc.
9. Post detail page (f/[campfire]/[postId]/page.tsx) — may still use vertical SparkButton
10. Verify PostCard hover states: left border accent on hover, title color change

Report every voting/card layout issue.
Output format:
AGENT: postcard-voting
STATUS: PASS | FAIL
ISSUES:
- app/(app)/f/[campfire]/[postId]/page.tsx — still uses old SparkButton without variant prop
- PostCard still imports Card from shadcn/ui
```

## Agent 5: Multi-Room Chat Integration

```
Check the entire multi-room chat feature end-to-end:
1. Migration 015_chat_rooms.sql:
   - chat_rooms table has correct columns (id, campfire_id, name, description, is_default, position, created_by, created_at, deleted_at)
   - chat_messages.room_id column exists as nullable UUID FK
   - Indexes on chat_rooms(campfire_id) and chat_messages(room_id, created_at)
   - Backfill logic creates #general for campfires with existing messages
2. Service layer (lib/services/chat.service.ts):
   - getRooms, getOrCreateDefaultRoom, createRoom, deleteRoom all exported
   - sendMessage accepts optional roomId parameter
   - getRecentMessages accepts optional roomId parameter
   - SSE subscribeToRoom scopes by campfireId+roomId
   - Legacy subscribeToCampfire still works for backward compat
3. API routes:
   - GET /api/campfires/[id]/chat/rooms — returns room list, auto-creates #general
   - POST /api/campfires/[id]/chat/rooms — creates new room (auth required)
   - GET /api/campfires/[id]/chat/rooms/[roomId]/messages — fetch + SSE stream
   - POST /api/campfires/[id]/chat/rooms/[roomId]/messages — send message (auth required)
   - All routes have force-dynamic export
   - All routes have proper error handling and rate limiting
4. Hooks (lib/hooks/useChat.ts):
   - useChatRooms(campfireId) hook exists and returns rooms, loading, error, createRoom, refetch
   - useChat accepts optional roomId in options
   - useChat builds correct API path based on presence of roomId
   - SSE stream URL includes roomId when provided
5. Legacy compatibility:
   - Old /api/campfires/[id]/chat route still works (no roomId = campfire-wide)
   - ChatPanel without rooms falls back gracefully

Report every integration gap.
Output format:
AGENT: chat-rooms
STATUS: PASS | FAIL
ISSUES:
- app/api/campfires/[id]/chat/rooms/route.ts — missing force-dynamic export
- useChat SSE connects to wrong URL when roomId is provided
- chat.service.ts sendMessage doesn't validate roomId exists
```

## Agent 6: Chat UI & UX Polish

```
Check the ChatPanel multi-room UI:
1. Room tabs render horizontally with # prefix and room name
2. Active room tab is visually distinct (bg-lava-hot/10, text-lava-hot)
3. Room creation form appears inline when + button is clicked
4. Room name input sanitizes (lowercase, hyphens only, 2-64 chars)
5. Auto-selects default room on first load
6. Switching rooms clears messages and reloads for new room
7. SSE reconnects when switching rooms (old connection cleaned up)
8. Empty state message shows room name: "No messages in #general"
9. Input placeholder shows room name: "Message #general…"
10. Connection status indicator (Wifi icon + "Live" text) works per room
11. Chat message component (chat-message.tsx) — does it still render correctly?
12. Scrollbar behavior — auto-scroll to bottom on new messages
13. Mobile responsiveness — room tabs should horizontally scroll on small screens

Report every UI/UX issue.
Output format:
AGENT: chat-ui
STATUS: PASS | FAIL
ISSUES:
- ChatPanel room tabs overflow on mobile without horizontal scroll
- Switching rooms doesn't reset scroll position
- Chat message component uses old ash-* classes instead of theme vars
```

## Agent 7: Seed Data & Empty States

```
Check the platform works correctly with zero seeded data:
1. scripts/seed-data.js — only creates system user, NO campfires
2. migrations/014_reset_data.sql — truncates everything, only creates system user, NO campfires
3. sidebar.tsx — no defaultPopular hardcoded array
4. Every page handles empty data gracefully:
   - /home — "No posts yet" with create post CTA
   - /trending — empty state
   - /new — empty state
   - /campfires — "No campfires yet" with create campfire CTA
   - /governance — empty state
   - /mod-log — empty state
5. Sidebar popular section — shows nothing when no campfires exist (not "undefined" or errors)
6. Search — handles zero results
7. User profile — handles user with zero posts/comments

Report every missing empty state or hardcoded data.
Output format:
AGENT: seed-empty-states
STATUS: PASS | FAIL
ISSUES:
- sidebar.tsx:42 — defaultPopular still hardcoded with tech, science, gaming, music
- /campfires page crashes when campfires array is empty
```

## Agent 8: Light Mode Color Verification

```
Check the warm light mode colors are applied correctly:
1. In globals.css .light block, verify these warm values:
   - --void: #FAF9F7 (warm cream background)
   - --coal: #FFFFFF (white cards)
   - --charcoal: #E8E3DB (warm border/muted)
   - --ash: #57534E (stone-600 text)
   - --smoke: #78716C (stone-500 secondary)
   - --foreground: #1C1917 (stone-900 text)
   - --background: #FAF9F7
   - --muted: #F0ECE6
   - --accent: #FEF3C7 (amber hover states)
   - --accent-foreground: #92400E (amber-800)
   - --border: #E8E3DB
   - --input: #E8E3DB
2. Check for hardcoded dark-only colors in components:
   - bg-ash-900, bg-ash-950, text-ash-100 — these won't work in light mode
   - Any bg-black, bg-zinc-900, bg-neutral-900
   - Any text-white that should be text-foreground
3. Check that lava-hot/flame-400 (the brand orange/red) looks good on BOTH backgrounds
4. Check chat panel, post cards, forms — do they use theme vars or hardcoded dark colors?
5. Check the landing page (app/page.tsx) — does it look good in light mode?
6. ThemeToggle component — does it exist and work?

Report every light mode color issue.
Output format:
AGENT: light-mode
STATUS: PASS | FAIL
ISSUES:
- components/fuega/chat-panel.tsx:48 — bg-ash-950/50 won't render well in light mode
- components/fuega/post-card.tsx:12 — text-ash-100 should be text-foreground
```

## Agent 9: force-dynamic & API Route Audit

```
Check that ALL API routes have proper configuration:
1. Every file in app/api/**/*.ts must have `export const dynamic = "force-dynamic"`
   (needed because Next.js caches API routes by default)
2. Every POST/PUT/DELETE route must call authenticate()
3. Every POST/PUT/DELETE route must have rate limiting
4. Error responses must use format: { error: string, code: string }
5. No API route should leak internal errors (stack traces, DB errors)
6. New routes added in this overhaul:
   - app/api/campfires/[id]/chat/rooms/route.ts
   - app/api/campfires/[id]/chat/rooms/[roomId]/messages/route.ts
   Must follow all patterns above.
7. Check that new API routes are accessible (not blocked by middleware)

Report every API route issue.
Output format:
AGENT: api-routes
STATUS: PASS | FAIL
ISSUES:
- app/api/posts/route.ts — missing force-dynamic
- app/api/campfires/[id]/chat/rooms/route.ts — POST has no rate limiting
```

## Agent 10: Build + Type Safety + Runtime

```
Run and report:
1. `npm run build 2>&1` — does production build succeed? Any warnings?
2. `npx tsc --noEmit 2>&1` — any type errors?
3. Check for:
   - Unused imports across modified files
   - console.log left in component code (ok in API routes)
   - TODO/FIXME comments that indicate unfinished overhaul work
   - Dead code from the old layout (pre-overhaul remnants)
4. Check modified files for TypeScript issues:
   - components/fuega/sidebar.tsx — proper Sheet types
   - components/fuega/post-card.tsx — no more Card/CardContent import
   - components/fuega/spark-button.tsx — variant prop typed correctly
   - lib/services/chat.service.ts — ChatRoom type exported
   - lib/hooks/useChat.ts — ChatRoom type exported, useChatRooms exported
5. Check package.json — any new dependencies needed? (Sheet/dialog already in radix)
6. Verify all new files are included in the build (no orphan files)

Report everything.
Output format:
AGENT: build-types
STATUS: PASS | FAIL
ISSUES:
- components/fuega/post-card.tsx:3 — unused import: Card, CardContent
- TSC: lib/hooks/useChat.ts:42 — type error in basePath
```

---

## Fix-It Protocol

After all 10 agents report, collect all issues and:
1. Deduplicate (same file+line from multiple agents)
2. Group by severity: CRITICAL (breaks functionality) → HIGH (wrong behavior) → MEDIUM (cleanup)
3. Fix everything in one pass
4. Rebuild and verify
5. Commit and push
