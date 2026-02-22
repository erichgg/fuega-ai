# FUEGA.AI - V1 SCOPE & REQUIREMENTS

**Last Updated:** February 21, 2026  
**Status:** Initial Planning Phase

---

## EXECUTIVE SUMMARY

Fuega.ai is an AI-moderated, community-governed discussion platform that solves the disinformation crisis through transparent, multi-level governance and radical user autonomy. Unlike Reddit (human mods with unchecked power) or X (algorithmic manipulation), fuega.ai puts communities in full control of their own AI moderators while maintaining security and accountability.

**Core Innovation:** Communities write and vote on their own AI moderator prompts, creating transparent, auditable moderation without human bias.

---

## THE PROBLEM WE'RE SOLVING

### Current State
- **X/Twitter:** Right-wing bias, "relevant replies" hijacked by extremists, algorithmic manipulation
- **Reddit:** Human moderators with unchecked power, no transparency, inconsistent enforcement
- **Existing platforms:** Anonymity enables abuse OR removing anonymity stifles free speech

### Our Solution
- **AI-moderated communities** with publicly visible prompts
- **Multi-level governance** (cohort → community → category → platform)
- **Radical transparency** + uncompromising security
- **True community self-determination** based on multilevel governance theory (Hooghe & Marks, UNC)

---

## V1 MUST-HAVE FEATURES

### 1. CORE REDDIT PARITY

To avoid losing essential functionality, v1 MUST support:

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
  - Spark (upvote) on posts
  - Douse (downvote) on posts
  - Spark (upvote) on comments
  - Douse (downvote) on comments
  - Vote fuzzing (prevent manipulation)
  - Vote weight = 1 per user per item

#### Community Features
- **Browse Communities** (displayed as `f | category | community`, optionally `f | category | community | cohort`)
  - Search by name
  - Browse by category
  - Sort: Hot, New, Top (hour/day/week/month/all time), Rising
- **Subscribe/Join**
  - Follow communities
  - Personal feed of subscribed communities
  - All/Popular feed for discovery
- **Community Pages**
  - About/Description
  - Rules (AI prompt) prominently displayed
  - Member count
  - Post feed
  - Sidebar with links/info

#### User Features
- **Profiles**
  - Username (immutable)
  - Account age
  - Spark score (post sparks + comment sparks)
  - Post/comment history
  - Optional: Avatar, bio
  - **Founder Badge** (first 5000 users, numbered)
- **Spark System**
  - Post sparks = sparks on posts
  - Comment sparks = sparks on comments
  - Decay/aging algorithm (prevent manipulation)
  - Used for community entry requirements

#### Navigation & Discovery
- **Homepage**
  - Logged out: Popular posts
  - Logged in: Subscribed communities feed
- **Sorting**
  - Hot (default): Time-weighted popularity
  - New: Chronological
  - Top: Highest voted (timeframes)
  - Rising: Trending upward
  - Controversial: High engagement, mixed votes
- **Search**
  - Search posts by title/content
  - Search communities by name
  - Search comments (nice to have, not v1 critical)

---

## FUEGA-SPECIFIC FEATURES (DIFFERENTIATORS)

### 2. AI MODERATION SYSTEM

#### Four-Tier Architecture
```
Platform Agent (Admin)
    ↓
Category Agents (Rotating Council)
    ↓
Community Agents (Community-Configured)
    ↓
Cohort Agents (Hyper-Niche, Community-Configured)
```

Display: `f | category | community | cohort`
URL: `/f/category/community/cohort`

#### Cohort-Level Agent
- **Purpose:** Hyper-niche subgroups within a community (e.g., `f | politics | democrats | dsa-illinois`)
- **Configuration:** Inherits community AI config as baseline, can tighten (never loosen) rules
- **AI Model:** Inherits from parent community by default, can override via governance vote
- **Moderation:** Same action types as community agent (approve, remove, flag, warn)
- **Governance:** Same proposal/voting system as communities, scoped to cohort members

#### Community-Level Agent
- **Configuration**
  - Publicly visible AI prompt (markdown display)
  - Community members propose prompt changes
  - Voting mechanism for approval
  - Version history of all prompts
- **AI Model Selection** (Governance Vote)
  - Communities vote on which AI model API drives their moderation
  - V1: Anthropic (Claude) only — architecture is model-agnostic from day one
  - Future: communities can vote to add/remove model providers (OpenAI, Grok, Llama, etc.)
  - Model changes are governance proposals like any other — propose, vote, majority wins
  - Addresses data legitimacy: the community controls which AI's knowledge drives decisions
  - moderation_log.ai_model field tracks which model made each decision for full auditability
- **Moderation Actions**
  - Approve: Post/comment goes live
  - Remove: Post/comment hidden, reason logged
  - Flag for review: Escalate to category or platform agent
  - Warn user: Add note to user history
- **Decision Logging**
  - All decisions stored in public audit log
  - Reason provided (AI-generated explanation)
  - Timestamp, agent level, content hash
  - Appeal mechanism

#### Category-Level Agent
- **Governance**
  - Rotating council of community representatives
  - Elected by communities within category
  - Term limits (3 months)
  - Consensus voting on category agent prompt
- **Oversight**
  - Review appeals from community agents
  - Monitor community agent patterns
  - Flag problematic communities
  - Suggest prompt improvements

#### Platform-Level Agent (Admin)
- **Universal Rules** (Non-Negotiable)
  - No CSAM (child sexual abuse material)
  - No direct incitement of violence
  - No doxxing/personal info without consent
  - No spam/bot networks
  - No impersonation
- **Final Appeals**
  - Review category agent decisions
  - Ban communities violating platform rules
  - Suspend users across platform
- **Transparency**
  - All platform agent decisions public
  - Reasoning required for all bans
  - Community can propose rule changes (high threshold)

### 3. GOVERNANCE SYSTEM

#### Community Governance
- **Proposal Types**
  - Modify AI prompt (full replacement)
  - Addendum to AI prompt (add new rule without replacing)
  - Change entry requirements
  - Update community rules/description
  - Elect category council representative
  - Remove moderator (human facilitators)
- **Voting Mechanisms** (Per-Community Configurable)
  - Simple majority (>50%)
  - Supermajority (66%, 75%, etc.)
  - Quorum requirements
  - Spark-weighted voting (optional)
  - Time-locked voting (24hr, 7day, etc.)
- **Proposal Lifecycle**
  1. Draft: User creates proposal
  2. Discussion: 24-72hr comment period
  3. Voting: Configured duration
  4. Implementation: Automatic if passed
  5. History: All proposals logged forever

#### Category Governance
- **Council Elections**
  - Communities nominate candidates
  - Ranked-choice voting
  - 3-month terms
  - Max 2 consecutive terms
- **Council Powers**
  - Modify category agent prompt
  - Set category-wide standards
  - Mediate inter-community disputes
  - Recommend new categories

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
✅ Core posting/commenting  
✅ Community creation and management  
✅ AI moderation (4-tier system)
✅ Governance (proposals and voting)  
✅ User profiles with karma  
✅ Founder badges (first 5000)  
✅ Public moderation logs  
✅ Search (basic)  
✅ Mobile-responsive web interface  

### OUT OF SCOPE (Post-V1)
❌ Direct messaging  
❌ Chat/real-time features  
❌ Native mobile apps  
❌ Awards/gilding  
❌ Media hosting (video/audio)  
❌ Cryptocurrency integration  
❌ Advanced search (full-text, filters)  
❌ User blocking  
❌ Mod tools beyond AI configuration  
❌ APIs for third parties  

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
- **Communities:** 50+ active communities by month 3
- **Moderation:** <1% moderation appeals by month 6
- **Trust:** 70%+ user approval of AI moderation (survey)

### Growth Constraints (Intentional)
- Invite-only for first 1000 users
- Slow onboarding to ensure community culture
- Focus on quality over quantity
- Manual review of first 50 communities

---

## FUNCTIONAL REQUIREMENTS

### User Flows

#### New User Registration
1. Landing page explains vision
2. Username + password (no email required)
3. Read platform rules
4. Confirm understanding of anonymity model
5. Browse communities
6. Subscribe to 3+ communities (suggested)
7. Make first post or comment

#### Creating a Community
1. Any user can create a community (no karma requirement for v1)
2. Fill form: Name, description, initial rules
3. Configure AI moderator prompt (template provided)
4. Set governance settings (voting thresholds, etc.)
5. Choose category
6. Submit for platform agent review (anti-spam)
7. Community goes live (or rejected with reason)

#### Making a Post
1. Select community
2. Choose type (text/link/image)
3. Write content
4. AI agent evaluates (real-time, <3 seconds)
5. If approved: Post live
6. If rejected: Reason shown, can edit and resubmit
7. Moderation decision logged

#### Proposing AI Prompt Change
1. Member of community for 7+ days
2. Choose proposal type:
   - **Modify prompt:** Complete replacement of AI prompt
   - **Addendum:** Add new rule/guideline to existing prompt without replacing it
3. Draft new prompt or addendum text (markdown editor)
4. Write rationale (required)
5. Submit proposal
6. 48hr discussion period
7. 7-day voting period
8. If passed: 
   - Modify: Entire prompt replaced
   - Addendum: New text appended to existing prompt
9. History preserved (all versions tracked)

#### Appealing a Moderation Decision
1. Post/comment removed by community agent
2. Click "Appeal" button
3. Write appeal (500 char max)
4. Appeal sent to category agent
5. Category agent reviews (24hr SLA)
6. Decision: Uphold or overturn
7. If overturned: Content restored, community agent adjusted
8. All logged publicly

---

## TECHNICAL REQUIREMENTS

### Performance
- **Page Load:** <2 seconds (median)
- **AI Moderation:** <5 seconds per decision
- **Search Results:** <1 second
- **Uptime:** 99.5% (allows ~3.6hr downtime/month)

### Scalability
- Support 25,000 concurrent users
- Handle 1,000 posts/hour
- Process 10,000 AI moderation requests/hour
- Store 1M+ posts, 10M+ comments

### Browser Support
- Chrome 100+
- Firefox 100+
- Safari 15+
- Edge 100+
- Mobile browsers (iOS Safari, Chrome Mobile) - **equal priority to desktop**

### Platform Strategy
- **Phase 1 (v1):** Web browser (responsive, mobile-optimized)
- **Phase 2 (v1.5):** Native iOS app
- **Phase 3 (v2):** Native Android app

Desktop and mobile web experiences are equally important and should be developed in parallel.

### Accessibility
- WCAG 2.1 Level AA compliance
- Keyboard navigation
- Screen reader compatible
- High contrast mode

---

## SCREENS/PAGES REQUIRED

### Public (Logged Out)
1. **Landing Page** - Mission, vision, value prop, sign up CTA
2. **About** - Detailed explanation of governance model
3. **Security** - Transparency about data collection, anonymity
4. **Browse Communities** - Preview of active communities
5. **Login** - Username + password
6. **Sign Up** - Create account

### Authenticated (Logged In)
7. **Home Feed** - Subscribed communities' posts
8. **All/Popular** - Global feed
9. **Community Page** - Posts, rules, about, AI prompt
10. **Post Detail** - Full post + threaded comments
11. **Create Post** - Form for new post
12. **User Profile** - Karma, badge, history
13. **User Settings** - Change password, delete account, privacy
14. **Community Settings** (for community admins)
    - Edit description
    - Manage AI prompt
    - View moderation log
15. **Governance Hub** - Active proposals, voting
16. **Proposal Detail** - Full proposal, discussion, vote
17. **Create Proposal** - Form for new proposal
18. **Moderation Log** - Public audit trail (per-community and global)
19. **Search Results** - Posts, communities, users
20. **Create Community** - Form for new community

### Admin (Platform Team Only)
21. **Admin Dashboard** - System health, metrics
22. **Platform Agent Config** - Manage admin AI rules
23. **User Management** - Ban/suspend (rare, logged)
24. **Community Management** - Review flagged communities

---

## UI/UX REQUIREMENTS

### Design Principles
- **Clarity over cleverness** - Information dense but readable
- **Speed over flash** - Fast, functional, minimal animations
- **Trust through transparency** - Show, don't hide
- **Mobile-first** - But desktop-optimized

### Visual Requirements
- **Favicon:** Flame icon 🔥 (for browser tab)
- **Dark mode** (default)
- **Light mode** (optional)
- **High contrast mode**
- **Compact view** (information dense)
- **Readable typography** (16px minimum body text)
- **Color-coded moderation** (green = approved, red = removed, yellow = flagged)
- **Flame favicon** - Simple flame icon for browser tab (16x16, 32x32, 180x180)

### Information Density
- Posts should show: Title, author, community, spark count, comment count, time, tags
- Comments should show: Author, spark count, time, depth indicator, collapse button
- No wasted space, but not cramped
- Use of whitespace for visual hierarchy, not decoration

---

## DATA RETENTION & PRIVACY

### What We Collect
- Username (chosen by user)
- Password (hashed with bcrypt)
- IP address (for spam prevention, deleted after 30 days)
- Post/comment content
- Votes (anonymized after 24hrs)
- Moderation decisions

### What We DON'T Collect
- Email addresses
- Real names
- Phone numbers
- Geolocation (beyond IP)
- Browsing history
- Third-party tracking pixels

### Deletion Policy
- Users can delete their accounts at any time
- Deleted accounts: Username shows as [deleted], content remains
- Posts/comments can be deleted (content removed, metadata stays)
- Moderation logs never deleted (transparency requirement)
- IP addresses auto-deleted after 30 days

---

## CONTENT POLICY (Platform-Level)

### Absolutely Prohibited
1. Child sexual abuse material (CSAM)
2. Direct incitement to violence
3. Doxxing (sharing personal info without consent)
4. Spam/bot networks
5. Impersonation of individuals or organizations

### Community-Governed
- Everything else is up to communities
- Communities can be more restrictive than platform
- Communities cannot be less restrictive than platform

---

## LAUNCH CRITERIA

V1 is ready to launch when:
- [ ] All must-have features implemented
- [ ] Security audit passed (external)
- [ ] Load testing at 2x target capacity
- [ ] 100 alpha users test for 2 weeks
- [ ] No P0/P1 bugs outstanding
- [ ] Moderation pipeline tested at scale
- [ ] Legal review complete
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Founder badges minted (1-5000)

---

## RISKS & MITIGATION

### Technical Risks
- **AI prompt injection:** Multi-layer validation, rate limiting
- **Database scaling:** PostgreSQL optimized, read replicas ready
- **DDoS attacks:** Cloudflare protection, rate limiting

### Community Risks
- **Toxic communities:** Platform agent can ban entire communities
- **Mod abuse:** Transparent logs, easy appeals
- **Low engagement:** Focus on quality onboarding

### Business Risks
- **Trust issues:** Radical transparency, open source
- **Funding:** Free for users, donations, optional premium later
- **Legal liability:** Section 230 protections (US), clear ToS

---

## SUCCESS DEFINITION

V1 is successful if:
1. **Users trust the system** (70%+ approval in surveys)
2. **Communities self-govern effectively** (<5% appeals escalated)
3. **Platform remains secure** (zero major breaches in first year)
4. **Growth is sustainable** (10%+ MoM user growth)
5. **AI moderation works** (90%+ accuracy vs human judgment)
6. **Culture remains healthy** (positive discourse, minimal toxicity)

---

**Next Steps:**
1. Review and approve this scope
2. Create DATA_SCHEMA.md
3. Create SECURITY.md
4. Create DEPLOYMENT.md
5. Begin implementation
