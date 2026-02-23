# FUEGA.AI - V1 SCOPE & REQUIREMENTS

**Last Updated:** February 22, 2026
**Status:** Architecture Redesign (flat model + governance variables)

---

## EXECUTIVE SUMMARY

Fuega.ai is an AI-moderated, community-governed discussion platform. Communities ("campfires") govern themselves through structured governance variables that compile into an AI moderation prompt ("Tender"). No human writes moderation rules directly — communities vote on settings, and the system compiles them into a secure AI prompt.

**Core Innovation:** Structured governance variables replace free-form AI prompts. Communities set dials and knobs; the Tender compiler produces the AI instructions. Injection-proof by design.

---

## THE PROBLEM WE'RE SOLVING

### Current State
- **X/Twitter:** Algorithmic manipulation, inconsistent moderation
- **Reddit:** Human moderators with unchecked power, no transparency, inconsistent enforcement
- **Existing platforms:** Anonymity enables abuse OR removing anonymity stifles free speech

### Our Solution
- **AI-moderated campfires** with publicly visible governance settings
- **Flat community model** — each campfire self-governs within platform Principles
- **Radical transparency** + uncompromising security
- **Governance variables** — communities vote on settings, not raw prompts

---

## V1 MUST-HAVE FEATURES

### 1. CORE PLATFORM PARITY

#### Content Creation & Interaction
- **Posts**
  - Text posts (title + body, markdown support)
  - Link posts (URL + title)
  - Image posts (single image upload)
  - Character limits: Title 300 chars, Body 40,000 chars
- **Comments**
  - Threaded/nested comments (unlimited depth)
  - Markdown formatting
  - Edit history visible (transparency requirement)
  - Delete with [deleted] placeholder
- **Voting**
  - Spark (upvote) on posts and comments
  - Douse (downvote) on posts and comments
  - Vote fuzzing (prevent manipulation)
  - Vote weight = 1 per user per item

#### Campfire Features
- **Browse Campfires** (displayed as `f/[name]`)
  - Search by name
  - Sort: Hot, New, Top (hour/day/week/month/all), Rising
- **Subscribe/Join**
  - Follow campfires
  - Personal feed of subscribed campfires
  - All/Popular feed for discovery
- **Campfire Pages**
  - Hearth (homepage): post feed, description, rules
  - Governance settings prominently displayed
  - Tender name + version shown
  - Member count
  - Sidebar with info

#### User Features
- **Profiles** (anonymous by default, customizable by choice)
  - Username (immutable)
  - Account age
  - Glow (reputation = post glow + comment glow)
  - Post/comment history
  - Brand (user flair — customizable text)
  - **Founder Badge** (first 5000 users, numbered)
  - **Optional profile fields** — all empty by default, all user-controlled:
    - Display name (shown alongside username)
    - Bio (500 chars max)
    - Location (free text)
    - Website URL
    - Social links (Twitter/X, GitHub, Discord, etc. — JSONB)
    - Profile visibility toggle (hide from public view)
  - No field is ever required. fuega never asks for real name, photo, phone, or email.
- **Glow System**
  - Post glow = sparks received on posts
  - Comment glow = sparks received on comments
  - Decay/aging algorithm (prevent manipulation)
  - Used for campfire entry requirements

#### Navigation & Discovery
- **Homepage**
  - Logged out: Popular posts
  - Logged in: Subscribed campfires feed
- **Sorting**
  - Hot (default): Time-weighted popularity
  - New: Chronological
  - Top: Highest voted (timeframes)
  - Rising: Trending upward
  - Controversial: High engagement, mixed votes
- **Search**
  - Search posts by title/content
  - Search campfires by name

---

## FUEGA-SPECIFIC FEATURES (DIFFERENTIATORS)

### 2. AI MODERATION SYSTEM

#### Architecture: Flat + Principles
```
Platform Principles (immutable, enforced everywhere)
    ↓
Campfire Tender (compiled from governance variables)
    ↓
Per-post/comment moderation decisions
```

Route: `f/[campfire-name]`
No tiers. No categories. No nesting. Each campfire is sovereign within Principles.

#### Tender System (Compiled AI Prompt)
- **Governance Variables:** Structured settings (toxicity threshold, spam sensitivity, etc.)
- **Tender Compiler:** Combines Principles + variable values + security wrapper into AI prompt
- **No raw prompts:** Communities never write AI instructions directly
- **Security sandwich:** Principles (top) -> structured vars -> free-text vars (untrusted) -> anti-injection (bottom)
- Communities vote on variable changes through governance proposals

#### Moderation Actions
- Approve: Post/comment goes live
- Remove: Post/comment hidden, reason logged publicly
- Flag for review: Escalate to site-level
- Warn user: Add note to user history

#### Decision Logging
- All decisions stored in public campfire mod log
- Reason provided (AI-generated explanation)
- Confidence score, AI model, Tender version tracked
- Appeal mechanism available

#### Platform-Level (Principles — Non-Negotiable)
- No CSAM (child sexual abuse material)
- No direct incitement of violence
- No doxxing/personal info without consent
- No spam/bot networks
- No impersonation
- All platform actions logged in site mod log
- Reasoning required for all bans

### 3. GOVERNANCE SYSTEM

#### Governance Variables
- Registry of all configurable settings (stored in DB, not code)
- Each variable has: key, data type, bounds (min/max), default value, level
- Level: `principle` (immutable) or `campfire` (community votes to change)
- Data types: boolean, integer, string, text, enum, multi_enum
- Adding new variables = DB insert, not code change (scalable)
- Variables can be moved between levels as the platform evolves

#### Campfire Governance
- **Proposal Types**
  - Change setting (modify a governance variable value)
  - Change AI model (vote on which AI provider)
  - Rename Tender (name their AI agent)
  - Amend rules (modify free-text community rules)
- **Voting Mechanisms** (Per-Campfire Configurable)
  - Simple majority (>50%)
  - Supermajority (66%, 75%, etc.)
  - Quorum requirements (configurable via governance variable)
  - Time-locked voting (configurable discussion + voting periods)
- **Proposal Lifecycle**
  1. Draft: User creates proposal
  2. Discussion: Configurable discussion period
  3. Voting: Configurable voting window
  4. Implementation: Automatic if passed — variables updated, Tender recompiled
  5. History: Full audit trail in campfire_settings_history

#### Platform Governance
- **Amendment Process**
  - Petition: 10,000 user signatures
  - Review: Platform team evaluates
  - Vote: All users with 30+ day accounts
  - Threshold: 75% approval
  - Veto: Only for security/legal issues

---

## V1 SCOPE BOUNDARIES

### IN SCOPE (V1)
- Core posting/commenting
- Campfire creation and management
- AI moderation (Tender system)
- Governance (variables + proposals + voting)
- User profiles with Glow
- Brand (user flair)
- Founder badges (first 5000)
- Public mod logs (per-campfire + site-level)
- Search (basic)
- Mobile-responsive web interface
- Badges, cosmetics shop, notifications, referrals, tips

### OUT OF SCOPE (Post-V1)
- Direct messaging
- Chat/real-time features
- Native mobile apps
- Media hosting (video/audio)
- Cryptocurrency integration
- Advanced search (full-text, filters)
- User blocking
- APIs for third parties

---

## USER PROJECTIONS

### Launch Targets (First 6 Months)
- **Month 1:** 100 users (alpha testers)
- **Month 2:** 500 users (closed beta)
- **Month 3:** 2,000 users (open beta)
- **Month 4:** 5,000 users (v1 launch, all founder badges claimed)
- **Month 5:** 10,000 users
- **Month 6:** 25,000 users

### Success Metrics
- **Engagement:** 60%+ of users return weekly
- **Content:** 100+ posts/day by month 3
- **Campfires:** 50+ active campfires by month 3
- **Moderation:** <1% moderation appeals by month 6
- **Trust:** 70%+ user approval of AI moderation (survey)

### Growth Constraints (Intentional)
- Invite-only for first 1000 users
- Slow onboarding to ensure community culture
- Focus on quality over quantity
- Manual review of first 50 campfires

---

## FUNCTIONAL REQUIREMENTS

### User Flows

#### New User Registration
1. Landing page explains vision
2. Username + password (no email required)
3. Read platform Principles
4. Confirm understanding of anonymity model
5. Browse campfires
6. Subscribe to 3+ campfires (suggested)
7. Make first post or comment

#### Creating a Campfire
1. Any user can create a campfire
2. Fill form: Name, description, initial rules
3. Governance variables set to defaults (can customize)
4. Name their Tender (AI agent)
5. Submit for platform review (anti-spam)
6. Campfire goes live (or rejected with reason)

#### Making a Post
1. Select campfire
2. Choose type (text/link/image)
3. Write content
4. Tender evaluates (real-time, <3 seconds)
5. If approved: Post live
6. If rejected: Reason shown, can edit and resubmit
7. Moderation decision logged in campfire mod log

#### Proposing a Governance Change
1. Member of campfire for 7+ days
2. Choose proposal type (change_setting, change_model, rename_tender, amend_rules)
3. Select variable(s) and proposed new value(s)
4. Write rationale (required)
5. Submit proposal
6. Discussion period (configurable, default 48hr)
7. Voting period (configurable, default 7 days)
8. If passed: Variables updated, Tender recompiled automatically
9. Full history preserved in audit trail

#### Appealing a Moderation Decision
1. Post/comment removed by campfire Tender
2. Click "Appeal" button
3. Write appeal (500 char max)
4. Appeal reviewed (24hr SLA)
5. Decision: Uphold or overturn
6. If overturned: Content restored
7. All logged publicly

---

## SCREENS/PAGES REQUIRED

### Public (Logged Out)
1. **Landing Page** - Mission, vision, value prop, sign up CTA
2. **How It Works** - Explains governance model, Tender system, voting
3. **About** - Team, mission, vision
4. **Security** - Transparency about data collection, anonymity, practices
5. **Browse Campfires** - Preview of active campfires
6. **Login** - Username + password
7. **Sign Up** - Create account

### Authenticated (Logged In)
8. **Home Feed** - Subscribed campfires' posts
9. **All/Popular** - Global feed
10. **Campfire Hearth** - Posts, rules, governance settings, Tender info
11. **Post Detail** - Full post + threaded comments
12. **Create Post** - Form for new post
13. **User Profile** - Glow, badges, Brand, bio, social links, history
14. **User Settings** - Profile customization, change password, delete account, notifications, privacy
15. **Campfire Settings** (for campfire founders)
    - Edit description
    - Manage governance variables
    - View campfire mod log
16. **Governance Hub** - Active proposals, voting
17. **Proposal Detail** - Full proposal, discussion, vote
18. **Create Proposal** - Form for new governance proposal
19. **Campfire Mod Log** - Per-campfire AI decisions (public)
20. **Site Mod Log** - Platform-level actions (public)
21. **Search Results** - Posts, campfires, users
22. **Create Campfire** - Form for new campfire

### Admin (Platform Team Only)
23. **Admin Dashboard** - System health, metrics
24. **Principles Config** - Manage platform-level governance variables
25. **User Management** - Ban/suspend (rare, logged in site mod log)
26. **Campfire Management** - Review flagged campfires

---

## TECHNICAL REQUIREMENTS

### Performance
- **Page Load:** <2 seconds (median)
- **AI Moderation:** <5 seconds per decision
- **Search Results:** <1 second
- **Uptime:** 99.5%

### Scalability
- Support 25,000 concurrent users
- Handle 1,000 posts/hour
- Process 10,000 AI moderation requests/hour
- Store 1M+ posts, 10M+ comments

### Browser Support
- Chrome 100+, Firefox 100+, Safari 15+, Edge 100+
- Mobile browsers (iOS Safari, Chrome Mobile) — equal priority to desktop

### Accessibility
- WCAG 2.1 Level AA compliance
- Keyboard navigation
- Screen reader compatible
- High contrast mode

---

## DATA RETENTION & PRIVACY

### What We Collect
- Username (chosen by user), Password (bcrypt hashed)
- IP address hash (SHA-256, deleted after 30 days)
- Post/comment content
- Votes (anonymized after 24hrs)
- Moderation decisions (public, permanent)

### What We DON'T Collect
- Email addresses, real names, phone numbers
- Geolocation (beyond IP hash)
- Browsing history, third-party tracking

### Deletion Policy
- Users can delete accounts at any time ([deleted] placeholder)
- Posts/comments deletable (content removed, metadata stays)
- Mod logs never deleted (transparency)
- IP hashes auto-deleted after 30 days

---

## CONTENT POLICY (Principles — Platform Level)

### Absolutely Prohibited
1. Child sexual abuse material (CSAM)
2. Direct incitement to violence
3. Doxxing (sharing personal info without consent)
4. Spam/bot networks
5. Impersonation of individuals or organizations

### Campfire-Governed
- Everything else is up to campfires via governance variables
- Campfires can be more restrictive than Principles
- Campfires cannot be less restrictive than Principles

---

## LAUNCH CRITERIA

V1 is ready to launch when:
- [ ] All must-have features implemented
- [ ] Security audit passed (external)
- [ ] Load testing at 2x target capacity
- [ ] 100 alpha users test for 2 weeks
- [ ] No P0/P1 bugs outstanding
- [ ] Tender pipeline tested at scale
- [ ] Legal review complete
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Founder badges minted (1-5000)

---

**Next Steps:**
1. Review and approve this scope
2. Build governance variable registry
3. Build Tender compiler
4. Begin implementation per PROMPT.md
