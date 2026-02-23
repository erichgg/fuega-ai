# fuega.ai — V1 Overview & Test Scripts

## What Exists Right Now

### Pages (33 total)

#### Public (no login required)
| Page | Route | Status |
|------|-------|--------|
| Landing page | `/` | Full |
| How It Works | `/how-it-works` | Full |
| About | `/about` | Full |
| Security | `/security` | Full |
| Join / Signup | `/join` | Full |
| Login | `/login` | Full |
| Signup | `/signup` | Full |
| Forgot Password | `/forgot-password` | Stub |
| Terms | `/terms` | Stub |
| Privacy | `/privacy` | Stub |
| Principles | `/principles` | Stub |
| Supporters | `/supporters` | Stub |

#### Authenticated (login required)
| Page | Route | Status |
|------|-------|--------|
| Home feed | `/home` | Full |
| Campfire hearth | `/f/[name]` | Full |
| Post detail | `/f/[name]/[postId]` | Full |
| All campfires | `/campfires` | Stub |
| Create campfire | `/create-campfire` | Stub |
| New post | `/new` | Stub |
| Submit post | `/submit` | Stub |
| Trending | `/trending` | Stub |
| User profile | `/u/[username]` | Full |
| User badges | `/u/[username]/badges` | Full |
| Badges gallery | `/badges` | Full |
| Notifications | `/notifications` | Full |
| Governance proposals | `/governance` | Full |
| Proposal detail | `/governance/[id]` | Full |
| Mod log | `/mod-log` | Full |
| Settings: Profile | `/settings/profile` | Full |
| Settings: Account | `/settings/account` | Full |
| Settings: Privacy | `/settings/privacy` | Full |
| Settings: Notifications | `/settings/notifications` | Full |
| Settings: Referrals | `/settings/referrals` | Full |

### API Endpoints (44 total)

#### Auth
- `POST /api/auth/signup` — Create account (+ founder badge if < 5000 users)
- `POST /api/auth/login` — Login with username/password
- `POST /api/auth/logout` — Logout (clears cookie)
- `GET /api/auth/me` — Get current user

#### Posts
- `GET /api/posts` — List posts (with sort/filter)
- `POST /api/posts` — Create post (AI-moderated in real-time)
- `GET /api/posts/[id]` — Get single post
- `PATCH /api/posts/[id]` — Edit post
- `DELETE /api/posts/[id]` — Soft-delete post
- `GET /api/posts/[id]/comments` — Get threaded comments
- `POST /api/posts/[id]/comments` — Add comment
- `POST /api/posts/[id]/vote` — Spark or douse a post
- `DELETE /api/posts/[id]/vote` — Remove vote from post

#### Comments
- `PATCH /api/comments/[id]` — Edit comment
- `DELETE /api/comments/[id]` — Soft-delete comment
- `POST /api/comments/[id]/vote` — Spark or douse a comment
- `DELETE /api/comments/[id]/vote` — Remove vote from comment

#### Campfires
- `GET /api/campfires` — List all campfires
- `POST /api/campfires` — Create a campfire
- `GET /api/campfires/[id]` — Get campfire details
- `PATCH /api/campfires/[id]` — Update campfire
- `POST /api/campfires/[id]/join` — Join campfire
- `POST /api/campfires/[id]/leave` — Leave campfire
- `GET /api/campfires/[id]/ai-config` — Get Tender config
- `PUT /api/campfires/[id]/ai-config` — Update Tender config
- `GET /api/campfires/[id]/config-proposals` — List config proposals
- `POST /api/campfires/[id]/config-proposals` — Create config proposal
- `POST /api/campfires/[id]/config-proposals/[id]/vote` — Vote on config proposal

#### Governance (old model)
- `GET /api/proposals` — List governance proposals
- `POST /api/proposals` — Create proposal
- `GET /api/proposals/[id]` — Get proposal detail
- `POST /api/proposals/[id]/vote` — Vote on proposal

#### Badges
- `GET /api/badges` — List all badge definitions
- `GET /api/badges/[id]` — Get badge detail
- `GET /api/users/[id]/badges` — Get user's earned badges
- `PUT /api/users/[id]/primary-badge` — Set primary displayed badge

#### Notifications
- `GET /api/notifications` — Get user notifications
- `PUT /api/notifications/[id]/read` — Mark one as read
- `PUT /api/notifications/read-all` — Mark all as read
- `GET /api/notifications/preferences` — Get notification prefs
- `PUT /api/notifications/preferences` — Update notification prefs
- `POST /api/notifications/push-subscribe` — Subscribe to push
- `DELETE /api/notifications/push-subscribe` — Unsubscribe from push

#### Referrals
- `GET /api/referrals/link` — Get referral code + link
- `GET /api/referrals/stats` — Get referral count + next badge
- `GET /api/referrals/history` — Get referral signup history

#### Settings
- `GET /api/settings/profile` — Get profile settings
- `PUT /api/settings/profile` — Update profile (bio, avatar, brand)
- `PUT /api/settings/account` — Change password/email
- `DELETE /api/settings/account` — Delete account (soft)
- `PUT /api/settings/privacy` — Update privacy settings

#### User Profiles
- `GET /api/users/[id]/profile` — Public profile data

#### System
- `GET /api/health` — Health check
- `GET /api/features` — Feature flag states
- `POST /api/moderate` — AI moderation (authed)
- `GET /api/monitoring/metrics` — System metrics
- `GET /api/monitoring/db-stats` — DB stats
- `POST /api/monitoring/cron` — Cron jobs
- `GET/POST /api/monitoring/alerts` — Alert management

### Feature Flags
| Flag | Env Var | Default |
|------|---------|---------|
| Badges | `ENABLE_BADGE_DISTRIBUTION` | off |
| Tip Jar | `ENABLE_TIP_JAR` | off |
| Notifications | `ENABLE_NOTIFICATIONS` | off |
| Cosmetics Shop | `ENABLE_COSMETICS_SHOP` | off |

---

## Test Scripts

### Test Accounts
All passwords: `TestPassword123!`

| Username | Glow | Founder # | Campfire Roles |
|----------|------|-----------|----------------|
| `test_user_1` | 23 | #1 | Creator of f/test_tech |
| `test_user_2` | 8 | #2 | Creator of f/demo_science, member of f/test_tech |
| `demo_admin` | 75 | #3 | Member of both campfires |

### Test Campfires
| Name | Creator | Members | Posts |
|------|---------|---------|-------|
| `f/test_tech` | test_user_1 | 3 | 2 |
| `f/demo_science` | test_user_2 | 2 | 1 |

---

### Script 1: Public Pages Walkthrough
**Goal:** Verify all public pages load without login.

```
1. Go to / (landing page)
   ✓ Hero loads with "Your campfire. Your rules. Your AI."
   ✓ Navbar shows Login / Sign Up buttons
   ✓ "fuega" text is styled orange (text-flame-400)
   ✓ Footer links work

2. Click "How It Works" (or go to /how-it-works)
   ✓ Page loads with governance explanation
   ✓ Security sandwich diagram visible

3. Go to /about
   ✓ Comparison table (fuega vs Reddit vs Discord)
   ✓ Team/mission section

4. Go to /security
   ✓ Security practices displayed

5. Go to /principles
   ✓ Stub page loads (placeholder content)

6. Go to /terms, /privacy, /supporters
   ✓ Each stub page loads without error
```

### Script 2: Signup & Login Flow
**Goal:** Test account creation and authentication.

```
1. Go to /signup
   ✓ Form shows: username, password, confirm password
   ✓ Submit with weak password → validation error
   ✓ Submit with taken username → error

2. Create new account: signup with unique username + "TestPassword123!"
   ✓ Redirects to /home after signup
   ✓ Navbar shows username + avatar
   ✓ JWT cookie set (httpOnly, not visible in JS)
   ✓ CSRF cookie set

3. Click logout (user dropdown → Logout)
   ✓ Redirected to / or /login
   ✓ Navbar shows Login / Sign Up again

4. Go to /login
   ✓ Login with test_user_1 / TestPassword123!
   ✓ Redirects to /home
   ✓ Username shows in navbar

5. Go to /login with wrong password
   ✓ Error message shown
   ✓ No JWT set

6. Rapid login attempts (6+ in 15 min)
   ✓ Rate limited → 429 response
```

### Script 3: Home Feed & Navigation
**Goal:** Test authenticated home experience.

```
Prerequisites: Logged in as test_user_1

1. Go to /home
   ✓ Feed loads with test posts
   ✓ Sort options visible (trending, new, top)
   ✓ Post cards show: title, body preview, sparks/douses, comment count

2. Click a post title → /f/test_tech/[postId]
   ✓ Full post body displayed
   ✓ Comments section loads (threaded)
   ✓ Spark/douse buttons visible
   ✓ Back navigation works

3. Navbar links
   ✓ Home → /home
   ✓ Notifications bell → /notifications
   ✓ User menu dropdown opens
   ✓ "My Campfires" in dropdown
```

### Script 4: Campfire (Community) Experience
**Goal:** Test campfire pages and membership.

```
Prerequisites: Logged in as test_user_1

1. Go to /f/test_tech
   ✓ Campfire hearth loads
   ✓ Shows campfire name, description, member count
   ✓ Posts listed for this campfire
   ✓ test_user_1 is shown as member

2. Go to /f/demo_science (not a member as test_user_1... wait, they are)
   ✓ Actually test_user_1 is NOT a member of demo_science
   ✓ Should show "Join" option

3. Log in as demo_admin, go to /f/test_tech
   ✓ Shows as member
   ✓ Posts visible

4. Test campfire join/leave via API:
   POST /api/campfires/[demo_science_id]/join (as test_user_1)
   ✓ 200 OK, membership created
   POST /api/campfires/[demo_science_id]/leave (as test_user_1)
   ✓ 200 OK, membership removed
```

### Script 5: Posting & Commenting
**Goal:** Test content creation with AI moderation.

```
Prerequisites: Logged in as test_user_1, ANTHROPIC_API_KEY set

1. Create a post via API:
   POST /api/posts
   Body: { "community_id": "[test_tech_id]", "title": "Test post", "body": "This is a test.", "post_type": "text" }
   ✓ 201 Created
   ✓ Response includes moderation result (approved/flagged/removed)
   ✓ Moderation log entry created

2. Visit the post at /f/test_tech/[newPostId]
   ✓ Post displayed with content
   ✓ Moderation status shown if flagged

3. Add a comment:
   POST /api/posts/[postId]/comments
   Body: { "body": "Great post!" }
   ✓ 201 Created
   ✓ Comment appears in thread

4. Edit the comment:
   PATCH /api/comments/[commentId]
   Body: { "body": "Great post! Updated." }
   ✓ 200 OK, edit saved

5. Delete the comment:
   DELETE /api/comments/[commentId]
   ✓ 200 OK, soft-deleted (deleted_at set)

6. Try posting harmful content:
   POST /api/posts
   Body: { "community_id": "[id]", "title": "Bad post", "body": "[something that violates rules]", "post_type": "text" }
   ✓ AI flags or removes it
   ✓ Moderation log shows decision + reasoning
```

### Script 6: Voting (Spark/Douse)
**Goal:** Test the voting system.

```
Prerequisites: Logged in as test_user_2

1. Spark a post:
   POST /api/posts/[postId]/vote
   Body: { "value": 1 }
   ✓ Returns { vote: 1, sparks: [count], douses: [count], action: "voted" }

2. Change to douse:
   POST /api/posts/[postId]/vote
   Body: { "value": -1 }
   ✓ Returns { vote: -1, ..., action: "changed" }

3. Remove vote:
   DELETE /api/posts/[postId]/vote
   ✓ Returns { vote: null, ..., action: "removed" }

4. Spark a comment:
   POST /api/comments/[commentId]/vote
   Body: { "value": 1 }
   ✓ Works same as post voting

5. Rapid voting (100+ in an hour):
   ✓ Rate limited → 429
```

### Script 7: User Profile & Settings
**Goal:** Test profile viewing and settings changes.

```
Prerequisites: Logged in as test_user_1

1. Go to /u/test_user_1
   ✓ Profile loads: username, glow count, join date
   ✓ Posts by user listed
   ✓ Badges section visible

2. Go to /settings/profile
   ✓ Form shows current bio, avatar URL, brand (flair)
   ✓ Update bio → save → refresh → bio persists
   ✓ Set brand text → appears on profile

3. Go to /settings/account
   ✓ Change password form
   ✓ Change with wrong current password → error
   ✓ Change with valid passwords → success
   ✓ Login with new password works

4. Go to /settings/privacy
   ✓ Privacy toggles load
   ✓ Toggle settings → save → persists

5. View another user: /u/test_user_2
   ✓ Public profile visible
   ✓ Cannot edit their settings
```

### Script 8: Badges
**Goal:** Test badge display and management.

```
Prerequisites: Logged in as test_user_1, ENABLE_BADGE_DISTRIBUTION=true

1. Go to /badges
   ✓ All badge definitions listed
   ✓ Rarity colors: common=slate, uncommon=green, rare=blue, epic=purple, legendary=orange
   ✓ Badge cards show progress bars

2. Go to /u/test_user_1/badges
   ✓ Shows earned badges (founder badge #1)
   ✓ Badge rarity styling correct

3. Check badge API:
   GET /api/users/[test_user_1_id]/badges
   ✓ Returns array of earned badges

4. Set primary badge:
   PUT /api/users/[test_user_1_id]/primary-badge
   Body: { "badge_id": "[founder_badge_id]" }
   ✓ Primary badge updated
   ✓ Shows on profile
```

### Script 9: Notifications
**Goal:** Test notification system.

```
Prerequisites: Logged in as test_user_1, ENABLE_NOTIFICATIONS=true

1. Go to /notifications
   ✓ Notification inbox loads
   ✓ Shows any existing notifications

2. Check notification preferences:
   Go to /settings/notifications
   ✓ Toggle switches for each notification type
   ✓ Push notification subscribe/unsubscribe buttons

3. API check:
   GET /api/notifications
   ✓ Returns notifications array

4. Mark as read:
   PUT /api/notifications/[id]/read
   ✓ Notification marked read

5. Mark all read:
   PUT /api/notifications/read-all
   ✓ All notifications marked read

6. Notification bell in navbar
   ✓ Shows unread count badge
   ✓ Dropdown shows recent notifications
```

### Script 10: Referrals
**Goal:** Test referral system.

```
Prerequisites: Logged in as test_user_1

1. Go to /settings/referrals
   ✓ Referral link displayed
   ✓ Copy button works
   ✓ Stats show: referral count, next badge target

2. API checks:
   GET /api/referrals/link
   ✓ Returns { referral_code, referral_link }

   GET /api/referrals/stats
   ✓ Returns { referral_code, referral_count, next_badge_at, next_badge_name }

   GET /api/referrals/history
   ✓ Returns array of referral entries

3. Test referral signup:
   ✓ Sign up with ?ref=[code] in URL
   ✓ Referral tracked in DB
   ✓ Referrer's count increments
```

### Script 11: Governance Proposals
**Goal:** Test proposal creation and voting.

```
Prerequisites: Logged in as test_user_1

1. Go to /governance
   ✓ Proposals list loads
   ✓ Shows status (discussion/voting/passed/failed)

2. Create proposal via API:
   POST /api/proposals
   Body: { "campfire_id": "[id]", "title": "Change rule", "description": "...", "proposed_changes": {} }
   ✓ 201 Created

3. View proposal: /governance/[proposalId]
   ✓ Detail page loads with votes

4. Vote on proposal:
   POST /api/proposals/[id]/vote
   Body: { "value": 1 }
   ✓ Vote recorded

5. Config proposal vote:
   POST /api/campfires/[id]/config-proposals/[id]/vote
   Body: { "vote": "for" }
   ✓ Vote recorded (for/against/abstain)
```

### Script 12: Moderation & Mod Log
**Goal:** Test AI moderation transparency.

```
Prerequisites: Logged in

1. Go to /mod-log
   ✓ Page loads with moderation entries
   ✓ Each entry shows: content type, decision, reasoning, AI model, timestamp
   ✓ Entries are public (transparency)

2. Check seed moderation logs
   ✓ 3 test entries visible (all "approved")
   ✓ Reasoning text displayed

3. After creating a post (Script 5):
   ✓ New moderation entry appears in log
   ✓ Shows decision + confidence + reasoning
```

### Script 13: Security Checks
**Goal:** Verify security measures work.

```
1. CSRF protection:
   ✓ POST to any API without x-csrf-token header → 403
   ✓ POST with valid CSRF token → works

2. Rate limiting:
   ✓ Login: 6th attempt in 15 min → 429
   ✓ Signup: 4th attempt in 1 hour → 429
   ✓ Vote: 101st vote in 1 hour → 429
   ✓ General endpoints: 21st request/min → 429

3. Auth required:
   ✓ GET /api/notifications without JWT → 401
   ✓ POST /api/posts without JWT → 401
   ✓ POST /api/moderate without JWT → 401

4. Security headers (check any response):
   ✓ X-Frame-Options: DENY
   ✓ X-Content-Type-Options: nosniff
   ✓ Referrer-Policy: strict-origin-when-cross-origin
   ✓ Content-Security-Policy present (no unsafe-inline for scripts)

5. Input validation:
   ✓ POST /api/posts with missing title → 400 validation error
   ✓ POST /api/auth/signup with short password → 400
   ✓ SQL injection in username → parameterized, no effect
```

### Script 14: Health & Monitoring
**Goal:** Test system endpoints.

```
1. GET /api/health
   ✓ Returns 200 with status info

2. GET /api/features
   ✓ Returns { badges: bool, tip_jar: bool, notifications: bool }

3. GET /api/monitoring/metrics (requires MONITORING_SECRET)
   ✓ Returns system metrics or 401 if no secret

4. GET /api/monitoring/db-stats (requires MONITORING_SECRET)
   ✓ Returns database statistics or 401
```

---

## What's NOT Built Yet (Future Phases)

| Feature | Status | Phase |
|---------|--------|-------|
| Governance variables (structured, not free-form) | Planned | 1.4 |
| Tender compiler (Principles + vars → prompt) | Planned | 1.4 |
| Campfire settings audit trail | Planned | 1.4 |
| Cosmetics shop | Planned | 3+ |
| Tip jar | Planned | 2.5+ |
| Image/link post types (actual upload) | Planned | Future |
| Search | Not started | Future |
| Real-time updates (WebSocket) | Not started | Future |
| Email verification | Not started | Future |
| Password reset (actual flow) | Stub only | Future |
| Mobile app | Not started | Future |
