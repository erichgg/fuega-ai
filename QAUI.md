# QAUI.md -- Comprehensive UI/UX Quality Audit

**Date:** 2026-02-24
**Auditor:** Claude Opus 4.6
**Scope:** Every page in `app/(app)/`, all public pages in `app/`, layout, navbar, sidebar, footer, and key shared components.

---

## Priority Legend

- **P0** -- Broken or confusing. Users will hit this and be stuck or misled.
- **P1** -- Annoying or inconsistent. Degrades trust or usability.
- **P2** -- Polish or nice-to-have. Would improve the experience but not blocking.

---

## 1. Duplicate / Overlapping Navigation

The app has THREE navigation surfaces: Navbar (top bar), Mobile Nav Sheet (right drawer in Navbar), and Sidebar (left drawer + persistent desktop column). Several destinations appear in two or all three, creating confusion about which nav surface is "canonical."

### Navigation Map

| Destination | Navbar Desktop | Navbar Mobile Sheet | Sidebar |
|-------------|:-:|:-:|:-:|
| Home / Feed | Feed (/home) | Home (/home) | Home (/home) |
| Campfires | /campfires | /campfires | /campfires |
| Governance | /governance | /governance | /governance |
| About | /about | /about | -- |
| Mod Log | -- | /mod-log | /mod-log |
| Trending | -- | -- | /trending |
| New | -- | -- | /new |
| Search | (search bar) | -- | -- |

### Issues

| # | Priority | Issue | Location |
|---|----------|-------|----------|
| 1.1 | **P1** | **"Campfires" appears in all three nav surfaces.** User sees it in the navbar, the mobile drawer, AND the sidebar. Redundant and clutters the navigation. | `Navbar.tsx` line ~46, mobile sheet ~line 74; `sidebar.tsx` discover links |
| 1.2 | **P1** | **"Governance" appears in both navbar and sidebar.** Two entry points to the same page that requires a `?campfire=` param to function (see issue 7.1). | `Navbar.tsx` ~line 48; `sidebar.tsx` discover links |
| 1.3 | **P1** | **Navbar labels "Feed" but sidebar labels "Home" -- same destination (/home).** Inconsistent naming for the same page. | `Navbar.tsx` ~line 44 vs `sidebar.tsx` main links |
| 1.4 | **P2** | **Mod Log in mobile sheet + sidebar but NOT in desktop navbar.** Desktop users must use sidebar to reach mod log. Mobile sheet exposes it but it is missing from the primary top-level nav. | `Navbar.tsx` mobile sheet ~line 77; absent from desktop links |
| 1.5 | **P2** | **About in navbar but NOT in sidebar.** Sidebar has its own set of links that partially overlap with navbar but never fully match. | `Navbar.tsx` ~line 50; `sidebar.tsx` has no About link |
| 1.6 | **P2** | **"Trending" and "New" only exist in sidebar.** These are essentially pre-sorted feed views (`usePosts({ sort: "hot" })` and `usePosts({ sort: "new" })`). They are not reachable from any nav surface on mobile except the sidebar drawer. Consider whether these pages are needed at all vs. just using FeedSort on the home page. | `sidebar.tsx` main links; `app/(app)/trending/page.tsx`; `app/(app)/new/page.tsx` |

---

## 2. Missing Filters, Sort Controls, or Search

| # | Priority | Issue | File | Line(s) |
|---|----------|-------|------|---------|
| 2.1 | **P1** | **Campfires page has search but NO sort control.** Cannot sort campfires by member count, creation date, or activity. Users can only search by name. | `app/(app)/campfires/page.tsx` | Full file -- no sort UI |
| 2.2 | **P1** | **Badges page has NO filters, search, or sort.** Just dumps all badges in a flat list. No way to filter by category, earned status, or search by name. | `app/(app)/badges/page.tsx` | Full file |
| 2.3 | **P1** | **Governance page has NO campfire selector UI.** It reads `?campfire=` from the URL but provides no dropdown or picker for the user to choose a campfire. If you navigate to `/governance` directly, you see "Select a campfire to view its proposals" with no way to do so. | `app/(app)/governance/page.tsx` | Lines 117-121, 240-244 |
| 2.4 | **P2** | **Notifications page -- unknown filters.** Delegated to `NotificationInbox` component (not examined in detail), but the page itself adds no filter controls. | `app/(app)/notifications/page.tsx` | -- |
| 2.5 | **P2** | **User profile has no "Comments" tab.** Only shows a "Posts" tab. The user has no way to browse their own comment history. | `app/(app)/u/[username]/page.tsx` | -- |

---

## 3. Layout / Width Issues (No max-width Constraint)

The app layout (`app/(app)/layout.tsx` line 64-68) sets `flex-1 min-w-0 px-3 py-4 sm:px-6 lg:px-8` on the main content area with NO max-width. This means content stretches to fill the remaining space after the sidebar. On wide screens (1440px+), content becomes uncomfortably wide unless individual pages set their own max-width.

### Pages that SET their own max-width (good)

| Page | Constraint | File |
|------|-----------|------|
| Submit | `max-w-2xl` | `app/submit/page.tsx` |
| Campfire Settings | `max-w-3xl` | `app/(app)/f/[campfire]/settings/page.tsx` |
| Create Campfire | `max-w-lg` | `app/create-campfire/page.tsx` |
| Settings/Profile | `max-w-2xl` | `app/(app)/settings/profile/page.tsx` |
| Settings/Account | `max-w-2xl` | `app/(app)/settings/account/page.tsx` |
| Settings/Privacy | `max-w-xl` | `app/(app)/settings/privacy/page.tsx` |
| Settings/Notifications | `max-w-2xl` | `app/(app)/settings/notifications/page.tsx` |
| Settings/Referrals | `max-w-2xl` | `app/(app)/settings/referrals/page.tsx` |

### Pages MISSING max-width (will stretch too wide on large screens)

| # | Priority | Page | File |
|---|----------|------|------|
| 3.1 | **P1** | Trending | `app/(app)/trending/page.tsx` |
| 3.2 | **P1** | New | `app/(app)/new/page.tsx` |
| 3.3 | **P1** | Campfires browse | `app/(app)/campfires/page.tsx` |
| 3.4 | **P1** | Mod Log | `app/(app)/mod-log/page.tsx` |
| 3.5 | **P1** | Governance | `app/(app)/governance/page.tsx` |
| 3.6 | **P1** | Badges | `app/(app)/badges/page.tsx` |
| 3.7 | **P1** | Search | `app/(app)/search/page.tsx` |
| 3.8 | **P1** | Notifications | `app/(app)/notifications/page.tsx` |
| 3.9 | **P1** | User Profile | `app/(app)/u/[username]/page.tsx` |
| 3.10 | **P1** | User Badges | `app/(app)/u/[username]/badges/page.tsx` |
| 3.11 | **P1** | Campfire Hearth | `app/(app)/f/[campfire]/page.tsx` |
| 3.12 | **P1** | Post Detail | `app/(app)/f/[campfire]/[postId]/page.tsx` |

**Note:** Home page (`app/(app)/home/page.tsx`) has a right rail at `w-64` on xl+ screens which constrains the feed width somewhat, but on lg screens (no right rail, sidebar present) the feed still stretches full width.

**Recommendation:** Add `max-w-4xl` (or `max-w-3xl`) to the layout's `<main>` element or require all page components to set their own constraint.

---

## 4. Inconsistent Patterns Across Pages

| # | Priority | Issue | Files |
|---|----------|-------|-------|
| 4.1 | **P1** | **Massive code duplication for voting logic.** `trending/page.tsx`, `new/page.tsx`, `home/page.tsx`, and `f/[campfire]/page.tsx` all duplicate ~40-50 lines of identical optimistic vote handling (handleVote, votes state, sparkDeltas state). This should be extracted to a custom hook. | `home/page.tsx` lines 52-73, `trending/page.tsx` similar, `new/page.tsx` similar, `f/[campfire]/page.tsx` lines 61-82 |
| 4.2 | **P1** | **Duplicate `timeAgo` utility.** Defined separately in `post-card.tsx` (line 33), `comment-card.tsx` (line 28), `mod-log/page.tsx` (line 61), `f/[campfire]/[postId]/page.tsx` (line 30), and `search/page.tsx`. Each has slightly different formatting (some append "ago", some don't). | Multiple files |
| 4.3 | **P1** | **Card styling inconsistency.** Post cards use `rounded-md` (`post-card.tsx` line 58). Campfire cards use shadcn `Card` with `border-charcoal bg-charcoal/50` (`campfire-card.tsx` line 31). Governance cards use `rounded-lg border border-charcoal bg-charcoal/50` (`governance/page.tsx` line 264). Mod log entries use `rounded-lg border border-charcoal bg-charcoal/50` (same as governance). Settings pages use `terminal-card` class. No consistent card pattern. | Multiple component files |
| 4.4 | **P2** | **Terminology violation in search results.** Line 305 of `search/page.tsx` displays `{result.meta.sparkCount} sparks` -- should use "Spark count" or similar, NOT "sparks" as a noun label. The platform term is "Spark" (the action), not "sparks" (the unit). | `app/(app)/search/page.tsx` line 305 |
| 4.5 | **P2** | **Inconsistent border radius.** Campfires page search input uses `rounded-lg` but campfire list items use `rounded-md`. Governance proposals use `rounded-lg`. Post cards use `rounded-md`. No pattern for when to use which. | Multiple files |
| 4.6 | **P2** | **Inconsistent empty state styling.** Some pages show icon + text (governance, mod-log), others show just text (campfires), others show a decorative circle + icon + text (home, campfire hearth). | Multiple page files |

---

## 5. Dead / Stub / Non-functional UI Elements

| # | Priority | Issue | File | Line(s) |
|---|----------|-------|------|---------|
| 5.1 | **P0** | **Mod Log page is completely empty.** `useEffect` hardcodes `setEntries([])`. Comment says "No mod-log API endpoint yet." The page renders beautiful filter UI that filters nothing. Users see "No moderation entries found" always. | `app/(app)/mod-log/page.tsx` | 80-84 |
| 5.2 | **P0** | **Governance "Create Proposal" button does nothing.** The `<Button>` has no `onClick` handler and no `<Link>` wrapper. Clicking it has zero effect. | `app/(app)/governance/page.tsx` | 203-206 |
| 5.3 | **P0** | **Post detail Share/Report/Edit/Delete buttons are all no-ops.** All four buttons render with hover styling but have no `onClick` handlers. Users expect these to work. | `app/(app)/f/[campfire]/[postId]/page.tsx` | 221-238 |
| 5.4 | **P1** | **Comment Reply and Report buttons are permanently disabled.** Both have `disabled` and `cursor-not-allowed opacity-50` hardcoded. No tooltip or explanation for why. | `components/fuega/comment-card.tsx` | 88-95 |
| 5.5 | **P1** | **Forgot Password is a client-side stub.** `handleSubmit` does `setTimeout(resolve, 800)` then shows success. No API call. Always succeeds. | `app/forgot-password/page.tsx` | 16-23 |
| 5.6 | **P1** | **Badges "In Progress" section never renders.** `progressMap` is initialized as `{}` and never populated, so the "In Progress" filter tab exists but always shows 0 items. | `app/(app)/badges/page.tsx` | ~lines 17-19 |
| 5.7 | **P1** | **Keyboard shortcut "c" (create post) is a no-op.** Comment in Navbar says "Navigate to create post (future)" but the handler does nothing. The shortcuts dialog still lists it. | `components/fuega/Navbar.tsx` | ~line 91-92 |
| 5.8 | **P2** | **PostCard onClickComments, onShare, onReport props are optional and never passed** on the home feed, trending, or new pages. The buttons render but do nothing when wrapped in a Link (the Link captures the click). | `components/fuega/post-card.tsx` lines 113-139; `home/page.tsx` lines 130-137 |
| 5.9 | **P2** | **Landing page links to campfires that may not exist.** Hero section links to `f/tech`, `f/privacy`, `f/gaming`. These are hardcoded examples that may not exist in the database. | `app/page.tsx` | (hero section) |

---

## 6. Mobile Responsiveness Issues

| # | Priority | Issue | File | Line(s) |
|---|----------|-------|------|---------|
| 6.1 | **P1** | **Home right rail is hidden below xl (1280px).** On lg screens (1024-1279px), users lose Trending Campfires, Active Votes, and Quick Links. These features are invisible to a large percentage of users. | `app/(app)/home/page.tsx` | Line 153: `hidden xl:flex` |
| 6.2 | **P1** | **Sidebar trigger button has a confusing visibility range.** It is `hidden` on mobile (< md), visible on md-lg, and `hidden` on lg+. But the mobile hamburger menu also exists. Users on medium tablets see both. | `components/fuega/Navbar.tsx` | Sidebar toggle button class |
| 6.3 | **P1** | **Campfire banner text may be unreadable on small screens.** The campfire name, member count, and join button are crammed into a narrow banner area with `absolute bottom-3 left-4 right-4`. On narrow screens with long campfire names, content may overflow. | `app/(app)/f/[campfire]/page.tsx` | Lines 141-169 |
| 6.4 | **P2** | **PostCard campfire chip metadata line wraps awkwardly on mobile.** The line contains: campfire name, dot, avatar, author, dot, timestamp, and possibly a mod badge. On narrow screens this wraps into multiple lines. | `components/fuega/post-card.tsx` | Lines 64-86 |
| 6.5 | **P2** | **Settings pages lack mobile-optimized tab navigation.** The settings sidebar (profile/account/privacy/notifications/referrals) is likely handled by a parent layout, but each settings page renders as a form with no back button to the settings index on mobile. | `app/(app)/settings/*/page.tsx` | -- |

---

## 7. Interactive Issues (Broken or Confusing User Flows)

| # | Priority | Issue | File | Line(s) |
|---|----------|-------|------|---------|
| 7.1 | **P0** | **Governance page is unusable without URL parameter.** Navigating to `/governance` from the navbar or sidebar shows "Select a campfire to view its proposals" with NO campfire picker, dropdown, or search. The only way to use the page is to manually add `?campfire=name` to the URL or navigate from a campfire's quick links. | `app/(app)/governance/page.tsx` | 117-121, 240-244 |
| 7.2 | **P0** | **Campfire "Governance" quick link points to settings, not governance.** The quick link labeled "Governance" with a Vote icon has `href={/f/${campfire.name}/settings}` -- identical to the "Settings" link above it. It should link to `/governance?campfire=${campfire.name}`. | `app/(app)/f/[campfire]/page.tsx` | 219-225 |
| 7.3 | **P1** | **PostCard is wrapped in a Link but has clickable buttons inside.** On the home feed, each PostCard is wrapped in `<Link href={/f/${post.campfire}/${post.id}}>`. Inside PostCard, the Spark/Douse buttons, Comment button, Share button, and Report button all have `onClick` handlers. Clicking any of these buttons navigates to the post detail page because the outer Link captures the event. The vote `onClick` fires (via `e.stopPropagation` in SparkButton) but Share/Report/Comments don't stop propagation and just navigate away. | `app/(app)/home/page.tsx` lines 130-137; `components/fuega/post-card.tsx` lines 113-139 |
| 7.4 | **P1** | **Campfire joined state resets on navigation.** `joined` state is initialized as `false` on every render. There is no check against the API to see if the current user is already a member. The Join/Leave toggle always starts at "Join." | `app/(app)/f/[campfire]/page.tsx` | Line 59 |
| 7.5 | **P2** | **Keyboard shortcuts dialog doesn't trap focus.** The "?" shortcut opens a `<Dialog>` but there is no visible focus trap implementation. Pressing Tab may move focus behind the dialog. | `components/fuega/Navbar.tsx` | Shortcuts dialog section |

---

## 8. Visual Consistency Issues

| # | Priority | Issue | File | Line(s) |
|---|----------|-------|------|---------|
| 8.1 | **P1** | **Public pages have inconsistent navigation.** `about/page.tsx`, `how-it-works/page.tsx`, and `security/page.tsx` each render their own standalone navbar. `principles/page.tsx` and `supporters/page.tsx` have NO navbar at all. `terms/page.tsx` and `privacy/page.tsx` also have no navbar. Users navigating between these pages experience jarring nav changes. | `app/principles/page.tsx`, `app/supporters/page.tsx`, `app/terms/page.tsx`, `app/privacy/page.tsx` |
| 8.2 | **P1** | **Public pages use `bg-background` while app layout uses `bg-void`.** The landing page uses custom gradients. About/how-it-works/security use `bg-void` (via their own navs). Principles/supporters/terms/privacy use `bg-background`. This creates visible background color shifts when navigating between pages. | Multiple files |
| 8.3 | **P1** | **Footer section title "Campfire" is misleading.** The footer has four column titles: About, Platform, Legal, and "Campfire." The "Campfire" column contains GitHub, Join, and Referrals -- these are not related to a specific campfire. The title should be "Community" or "Connect." | `components/fuega/Footer.tsx` | Lines 31-37 |
| 8.4 | **P2** | **FeedSkeleton shows vertical voting layout but PostCard uses horizontal voting.** The skeleton renders a vertical spark button column (up/count/down stacked) but actual PostCard uses `variant="horizontal"` (inline). The loading state does not match the rendered state. | `components/fuega/page-skeleton.tsx` lines 10-15 vs `post-card.tsx` line 107 |
| 8.5 | **P2** | **Login page uses `bg-background` but Join page uses `bg-void`.** Both are auth-related pages but have different background colors. | `app/login/page.tsx` line 43 vs `app/join/page.tsx` line 57 |
| 8.6 | **P2** | **Supporters page says "create communities" instead of "create campfires."** Line 107: "the best way to support fuega.ai is to use it, create communities, and invite others." Per CLAUDE.md, "community" is valid in marketing prose, but "create communities" implies the user action which should use "campfire." | `app/supporters/page.tsx` | Line 107 |

---

## 9. Accessibility Gaps

| # | Priority | Issue | File | Line(s) |
|---|----------|-------|------|---------|
| 9.1 | **P1** | **Campfire view mode tabs have no ARIA role.** The Posts/Chat toggle buttons don't use `role="tablist"` / `role="tab"` / `aria-selected`. Screen readers cannot identify them as tabs. | `app/(app)/f/[campfire]/page.tsx` | Lines 242-274 |
| 9.2 | **P1** | **Governance status filter buttons have no ARIA role group.** Same issue -- filter buttons use `rounded-full` pill styling but no `role="group"` or `aria-label` for the filter set. | `app/(app)/governance/page.tsx` | Lines 211-229 |
| 9.3 | **P1** | **Mod log decision filter buttons have no ARIA role group.** Same pattern as governance. | `app/(app)/mod-log/page.tsx` | Lines 145-161 |
| 9.4 | **P1** | **`<details>` elements in mod log lack accessible names.** The `<summary>` contains complex markup but no `aria-label` to describe what expanding it does. | `app/(app)/mod-log/page.tsx` | Lines 179-218 |
| 9.5 | **P2** | **PostCard metadata links have no distinguishing accessible labels.** The campfire name and author name both render as plain text with `cursor-pointer` and `hover:underline` but are NOT actual links (just `<span>` elements). Screen readers see plain text, not clickable elements. | `components/fuega/post-card.tsx` | Lines 65-73 |
| 9.6 | **P2** | **Color-only status indicators.** Governance vote bars use green/red colors with no text alternative for colorblind users. The percentage text helps, but the bar itself conveys meaning through color alone. | `app/(app)/governance/page.tsx` | Lines 301-310 |
| 9.7 | **P2** | **SparkButton aria-label says "sparks" not "Spark count."** `aria-label={\`${sparkCount} sparks\`}` should say "Spark count: {sparkCount}" to match terminology. | `components/fuega/spark-button.tsx` | Lines 69, 144 |

---

## 10. Sidebar vs. Navbar Redundancy (Detailed Analysis)

### Current State

The navbar and sidebar serve overlapping purposes with no clear separation of concerns:

- **Navbar** acts as global navigation (Feed, Campfires, Governance, About) + search + user menu.
- **Sidebar** acts as quick navigation (Home, Trending, New) + discovery (Campfires, Mod Log, Governance) + personal (My Campfires) + social proof (Popular Campfires).
- **Mobile sheet** in navbar duplicates sidebar links partially.

### Redundancy Matrix

| Link | In Navbar? | In Sidebar? | In Mobile Sheet? | Verdict |
|------|:---:|:---:|:---:|---------|
| Home/Feed | Yes | Yes | Yes | **Triple redundancy** |
| Campfires | Yes | Yes | Yes | **Triple redundancy** |
| Governance | Yes | Yes | Yes | **Triple redundancy** |
| About | Yes | No | Yes | OK (public info) |
| Mod Log | No | Yes | Yes | Sidebar + mobile only |
| Trending | No | Yes | No | **Sidebar only; unreachable on mobile without sidebar drawer** |
| New | No | Yes | No | **Sidebar only; unreachable on mobile without sidebar drawer** |
| Search | Yes (bar) | No | No | Navbar only |

### Recommendations

1. **Remove Campfires and Governance from the sidebar.** They are in the navbar already. The sidebar should be for contextual/personalized navigation (My Campfires, Trending, New, Popular).
2. **Add Trending and New to the mobile nav sheet**, or remove them as standalone pages entirely (they are just pre-filtered feeds).
3. **Rename "Feed" in navbar to "Home"** (or vice versa) so the label matches everywhere.
4. **Add a campfire picker to the Governance page** so users can actually use it without URL manipulation.

---

## Summary by Priority

| Priority | Count | Examples |
|----------|------:|---------|
| **P0** | 5 | Governance page unusable (7.1), "Governance" link goes to settings (7.2), Mod Log empty (5.1), Create Proposal button dead (5.2), Post action buttons dead (5.3) |
| **P1** | 28 | No max-width on 12 pages (3.x), triple nav redundancy (1.x), code duplication (4.1), missing filters (2.x), click-through issues (7.3), accessibility gaps (9.x) |
| **P2** | 17 | Terminology issues (4.4), skeleton mismatch (8.4), polish items |

**Total issues found: 50**

---

## Top 10 Fixes by Impact

1. **Add max-width constraint to app layout `<main>`.** Fixes 12 pages at once. (`app/(app)/layout.tsx` line 64)
2. **Fix campfire "Governance" quick link.** Change href from `/f/${name}/settings` to `/governance?campfire=${name}`. (`app/(app)/f/[campfire]/page.tsx` lines 219-225)
3. **Add campfire selector to Governance page.** A dropdown or search input that sets the `?campfire=` param. (`app/(app)/governance/page.tsx`)
4. **Implement Post detail Share/Report/Edit/Delete handlers.** Or remove the buttons until implemented. (`app/(app)/f/[campfire]/[postId]/page.tsx` lines 221-238)
5. **Fix PostCard click-through issue.** Use `e.stopPropagation()` on inner buttons, or restructure so only the title/body area is the link. (`components/fuega/post-card.tsx`)
6. **Extract voting logic into a shared hook.** `useOptimisticVoting()` that replaces 40+ duplicated lines across 4 pages.
7. **Add "Create Proposal" onClick handler** or wrap in a Link to a create-proposal page. (`app/(app)/governance/page.tsx` line 203)
8. **Mark Mod Log as "Coming Soon"** or implement the API endpoint. Currently misleading. (`app/(app)/mod-log/page.tsx`)
9. **Unify public page navigation.** All public pages should share a common nav component. Principles, supporters, terms, and privacy currently have none.
10. **Remove triple-redundant nav items.** Campfires and Governance should live in ONE nav surface, not three.
