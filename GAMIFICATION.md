# FUEGA.AI - V2 GAMIFICATION SYSTEM

**Last Updated:** February 21, 2026
**Version:** 2.0
**Status:** Planning (Pre-Implementation)
**Dependencies:** DATA_SCHEMA.md (tables), SECURITY.md (fraud prevention), DEPLOYMENT.md (feature flags)

---

## TABLE OF CONTENTS

1. [Badges](#badges)
2. [Cosmetics Shop](#cosmetics-shop)
3. [Notifications](#notifications)
4. [Referral System](#referral-system)
5. [Tip Jar](#tip-jar)
6. [Structured AI Config](#structured-ai-config)
7. [Community Roles](#community-roles)
8. [Feature Flags](#feature-flags)
9. [Implementation Notes](#implementation-notes)

---

## BADGES

### Overview

Badges are non-transferable, permanently earned achievements displayed on user profiles. They represent milestones, contributions, and community engagement. Every badge has a rarity level that reflects how difficult it is to earn. Badges are awarded server-side only -- the client never triggers badge awards directly.

### Badge Categories

| Category       | Description                                      |
|----------------|--------------------------------------------------|
| `founder`      | Early adopter and platform genesis badges        |
| `engagement`   | Activity-based milestones (posting, commenting)  |
| `contribution` | Quality-based achievements (sparks received)     |
| `governance`   | Participation in community governance            |
| `referral`     | Growing the platform through referrals           |
| `special`      | Time-limited, event-driven, or unique badges     |

### Rarity Levels

| Rarity      | Color   | Approximate % of Users | Glow Effect           |
|-------------|---------|------------------------|-----------------------|
| `common`    | #A0A0A0 | 40%+                   | None                  |
| `uncommon`  | #4ADE80 | 15-40%                 | Subtle green pulse    |
| `rare`      | #60A5FA | 5-15%                  | Blue shimmer          |
| `epic`      | #A855F7 | 1-5%                   | Purple radiance       |
| `legendary` | #F97316 | <1%                    | Fire/lava glow effect |

### Complete Badge Definitions

Each badge follows this schema:

```typescript
interface BadgeDefinition {
  badge_id: string;        // Unique slug (e.g., "v1_founder")
  name: string;            // Display name
  description: string;     // How it was earned
  icon_concept: string;    // Description of the icon design
  category: BadgeCategory; // founder | engagement | contribution | governance | referral | special
  rarity: BadgeRarity;     // common | uncommon | rare | epic | legendary
  version: string;         // "v1", "v2", etc.
  earn_criteria: {
    type: string;          // "threshold" | "one_time" | "referral_count" | "manual"
    metric?: string;       // What is measured
    threshold?: number;    // Target value
    conditions?: object;   // Additional qualifying conditions
  };
}
```

---

#### FOUNDER BADGES

##### 1. v1_founder

```yaml
badge_id: "v1_founder"
name: "V1 Founder"
description: "One of the first 5,000 users to join fuega.ai. Numbered #1 through #5,000."
icon_concept: "Flame with a number inside. Gold border. The number corresponds to the user's signup order."
category: founder
rarity: legendary
version: "v1"
earn_criteria:
  type: "one_time"
  metric: "signup_order"
  threshold: 5000
  conditions:
    - User must be among the first 5,000 registered accounts
    - Each badge is numbered sequentially (#1 through #5,000)
    - founder_number stored on users table (UNIQUE, CHECK 1-5000)
    - Once all 5,000 are assigned, no more can be created
    - Number is permanently tied to the user and cannot be reassigned
```

**Display format:** `V1 Founder #0042` (zero-padded to 4 digits)

**Metadata (JSONB on user_badges):**
```json
{
  "founder_number": 42
}
```

##### 2. v1_alpha_tester

```yaml
badge_id: "v1_alpha_tester"
name: "Alpha Tester"
description: "Participated in the fuega.ai alpha testing phase (first 100 users)."
icon_concept: "Flame with 'ALPHA' text overlay. Red-orange gradient border."
category: founder
rarity: legendary
version: "v1"
earn_criteria:
  type: "one_time"
  metric: "signup_order"
  threshold: 100
  conditions:
    - User must be among the first 100 registered accounts
    - Automatically awarded in addition to v1_founder badge
```

##### 3. v1_beta_tester

```yaml
badge_id: "v1_beta_tester"
name: "Beta Tester"
description: "Participated in the fuega.ai closed beta (users #101 through #500)."
icon_concept: "Flame with 'BETA' text overlay. Orange gradient border."
category: founder
rarity: epic
version: "v1"
earn_criteria:
  type: "one_time"
  metric: "signup_order"
  threshold: 500
  conditions:
    - User must be among accounts #101 through #500
    - Automatically awarded in addition to v1_founder badge
```

---

#### ENGAGEMENT BADGES

##### 4. first_post

```yaml
badge_id: "first_post"
name: "First Flame"
description: "Published your first post on fuega.ai."
icon_concept: "Single small flame. Simple, clean design."
category: engagement
rarity: common
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "total_posts"
  threshold: 1
  conditions:
    - Post must be approved by AI agent (not removed)
```

##### 5. prolific_poster

```yaml
badge_id: "prolific_poster"
name: "Prolific Poster"
description: "Published 50 approved posts across any communities."
icon_concept: "Stack of flames rising upward. Warm orange tones."
category: engagement
rarity: uncommon
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "total_approved_posts"
  threshold: 50
  conditions:
    - Only approved, non-deleted posts count
```

##### 6. posting_machine

```yaml
badge_id: "posting_machine"
name: "Posting Machine"
description: "Published 500 approved posts across any communities."
icon_concept: "Mechanical gear with flames shooting from the teeth."
category: engagement
rarity: rare
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "total_approved_posts"
  threshold: 500
  conditions:
    - Only approved, non-deleted posts count
```

##### 7. first_comment

```yaml
badge_id: "first_comment"
name: "Sparked a Conversation"
description: "Left your first comment on fuega.ai."
icon_concept: "Speech bubble with a tiny flame inside."
category: engagement
rarity: common
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "total_comments"
  threshold: 1
  conditions:
    - Comment must be approved by AI agent (not removed)
```

##### 8. conversationalist

```yaml
badge_id: "conversationalist"
name: "Conversationalist"
description: "Left 100 approved comments across any posts."
icon_concept: "Two overlapping speech bubbles with sparks between them."
category: engagement
rarity: uncommon
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "total_approved_comments"
  threshold: 100
  conditions:
    - Only approved, non-deleted comments count
```

##### 9. discussion_veteran

```yaml
badge_id: "discussion_veteran"
name: "Discussion Veteran"
description: "Left 1,000 approved comments across any posts."
icon_concept: "Three speech bubbles stacked with a flame crown on top."
category: engagement
rarity: rare
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "total_approved_comments"
  threshold: 1000
  conditions:
    - Only approved, non-deleted comments count
```

##### 10. community_explorer

```yaml
badge_id: "community_explorer"
name: "Community Explorer"
description: "Joined 10 different communities."
icon_concept: "Compass with flame at the needle point."
category: engagement
rarity: common
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "communities_joined"
  threshold: 10
  conditions:
    - Must be current active member (not left)
```

##### 11. community_nomad

```yaml
badge_id: "community_nomad"
name: "Community Nomad"
description: "Joined 50 different communities."
icon_concept: "Globe with flame trails connecting points."
category: engagement
rarity: uncommon
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "communities_joined"
  threshold: 50
  conditions:
    - Must be current active member (not left)
```

##### 12. night_owl

```yaml
badge_id: "night_owl"
name: "Night Owl"
description: "Made 25 posts or comments between midnight and 5 AM (server time UTC)."
icon_concept: "Owl silhouette with glowing flame-colored eyes."
category: engagement
rarity: uncommon
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "nighttime_activity_count"
  threshold: 25
  conditions:
    - Posts or comments created between 00:00-05:00 UTC
    - Only approved content counts
```

##### 13. streak_7

```yaml
badge_id: "streak_7"
name: "Weekly Streak"
description: "Posted or commented every day for 7 consecutive days."
icon_concept: "Seven flames in a row, increasing in size."
category: engagement
rarity: common
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "consecutive_active_days"
  threshold: 7
  conditions:
    - At least one approved post or comment per calendar day (UTC)
```

##### 14. streak_30

```yaml
badge_id: "streak_30"
name: "Monthly Streak"
description: "Posted or commented every day for 30 consecutive days."
icon_concept: "Calendar page engulfed in flames. '30' prominently displayed."
category: engagement
rarity: rare
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "consecutive_active_days"
  threshold: 30
  conditions:
    - At least one approved post or comment per calendar day (UTC)
```

##### 15. streak_365

```yaml
badge_id: "streak_365"
name: "Annual Inferno"
description: "Posted or commented every day for 365 consecutive days."
icon_concept: "Full year calendar completely ablaze. Legendary aura."
category: engagement
rarity: legendary
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "consecutive_active_days"
  threshold: 365
  conditions:
    - At least one approved post or comment per calendar day (UTC)
```

##### 16. one_year_member

```yaml
badge_id: "one_year_member"
name: "One Year Strong"
description: "Account has been active for one full year."
icon_concept: "Flame inside a circle with '1' in the center."
category: engagement
rarity: uncommon
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "account_age_days"
  threshold: 365
  conditions:
    - Account must not be banned or deleted
```

---

#### CONTRIBUTION BADGES

##### 17. first_spark_received

```yaml
badge_id: "first_spark_received"
name: "First Spark"
description: "Received your first spark on a post or comment."
icon_concept: "Single upward-pointing spark. Bright orange."
category: contribution
rarity: common
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "total_sparks_received"
  threshold: 1
  conditions:
    - Sparks from own votes do not count (self-spark not allowed by system)
```

##### 18. spark_collector

```yaml
badge_id: "spark_collector"
name: "Spark Collector"
description: "Received 100 total sparks across all your content."
icon_concept: "Jar filled with small spark particles."
category: contribution
rarity: uncommon
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "total_sparks_received"
  threshold: 100
  conditions:
    - post_sparks + comment_sparks >= 100
```

##### 19. spark_magnet

```yaml
badge_id: "spark_magnet"
name: "Spark Magnet"
description: "Received 1,000 total sparks across all your content."
icon_concept: "Horseshoe magnet attracting spark particles."
category: contribution
rarity: rare
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "total_sparks_received"
  threshold: 1000
  conditions:
    - post_sparks + comment_sparks >= 1000
```

##### 20. inferno_contributor

```yaml
badge_id: "inferno_contributor"
name: "Inferno Contributor"
description: "Received 10,000 total sparks across all your content."
icon_concept: "User silhouette engulfed in a massive blaze. Epic lava effects."
category: contribution
rarity: epic
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "total_sparks_received"
  threshold: 10000
  conditions:
    - post_sparks + comment_sparks >= 10000
```

##### 21. legendary_contributor

```yaml
badge_id: "legendary_contributor"
name: "Legendary Contributor"
description: "Received 100,000 total sparks across all your content."
icon_concept: "Phoenix rising from ashes. Full legendary glow animation."
category: contribution
rarity: legendary
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "total_sparks_received"
  threshold: 100000
  conditions:
    - post_sparks + comment_sparks >= 100000
```

##### 22. hot_post

```yaml
badge_id: "hot_post"
name: "Hot Post"
description: "Had a single post reach 100 sparks."
icon_concept: "Thermometer with the mercury replaced by flames, maxed out."
category: contribution
rarity: rare
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "max_post_sparks"
  threshold: 100
  conditions:
    - Any single post by the user has >= 100 sparks
```

##### 23. viral_post

```yaml
badge_id: "viral_post"
name: "Viral Post"
description: "Had a single post reach 1,000 sparks."
icon_concept: "Explosion of sparks radiating outward from a central point."
category: contribution
rarity: epic
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "max_post_sparks"
  threshold: 1000
  conditions:
    - Any single post by the user has >= 1000 sparks
```

##### 24. community_builder

```yaml
badge_id: "community_builder"
name: "Community Builder"
description: "Created a community that reached 100 members."
icon_concept: "Blueprint/floor plan outline with flames at each corner."
category: contribution
rarity: rare
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "max_community_members_created"
  threshold: 100
  conditions:
    - User must be the creator (created_by) of the community
    - Community must have >= 100 active members
    - Community must not be banned
```

##### 25. community_architect

```yaml
badge_id: "community_architect"
name: "Community Architect"
description: "Created a community that reached 1,000 members."
icon_concept: "Full building structure made of flame, with an architect's compass."
category: contribution
rarity: epic
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "max_community_members_created"
  threshold: 1000
  conditions:
    - User must be the creator (created_by) of the community
    - Community must have >= 1000 active members
    - Community must not be banned
```

---

#### GOVERNANCE BADGES

##### 26. first_vote

```yaml
badge_id: "first_vote"
name: "Civic Duty"
description: "Cast your first vote on a governance proposal."
icon_concept: "Ballot box with a flame-shaped check mark."
category: governance
rarity: common
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "total_proposal_votes"
  threshold: 1
  conditions:
    - Vote on any governance proposal (for, against, or abstain all count)
```

##### 27. active_voter

```yaml
badge_id: "active_voter"
name: "Active Voter"
description: "Cast votes on 25 governance proposals."
icon_concept: "Stack of ballots with sparks emanating from the pile."
category: governance
rarity: uncommon
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "total_proposal_votes"
  threshold: 25
  conditions:
    - Votes across different proposals (not multiple votes on same proposal)
```

##### 28. proposal_author

```yaml
badge_id: "proposal_author"
name: "Proposal Author"
description: "Created your first governance proposal."
icon_concept: "Scroll with a flame wax seal."
category: governance
rarity: uncommon
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "total_proposals_created"
  threshold: 1
  conditions:
    - Proposal must reach voting stage (not deleted during draft)
```

##### 29. successful_proposer

```yaml
badge_id: "successful_proposer"
name: "Successful Proposer"
description: "Authored a governance proposal that passed community vote."
icon_concept: "Gavel with a flame head striking a podium."
category: governance
rarity: rare
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "total_proposals_passed"
  threshold: 1
  conditions:
    - Proposal status must be "passed" or "implemented"
```

##### 30. governance_champion

```yaml
badge_id: "governance_champion"
name: "Governance Champion"
description: "Authored 10 governance proposals that passed community vote."
icon_concept: "Crown made of gavels, wreathed in flames."
category: governance
rarity: epic
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "total_proposals_passed"
  threshold: 10
  conditions:
    - 10 separate proposals with status "passed" or "implemented"
```

##### 31. council_member

```yaml
badge_id: "council_member"
name: "Council Member"
description: "Elected to serve on a category council."
icon_concept: "Round table with seats, one highlighted with a flame."
category: governance
rarity: rare
version: "v1"
earn_criteria:
  type: "one_time"
  metric: "council_membership"
  threshold: 1
  conditions:
    - Must have been elected via community nomination
    - Active council_members record exists
```

---

#### REFERRAL BADGES

##### 32. v1_ambassador

```yaml
badge_id: "v1_ambassador"
name: "V1 Ambassador"
description: "Referred 5 or more users who successfully created accounts on fuega.ai."
icon_concept: "Handshake icon with small flames at each wrist."
category: referral
rarity: uncommon
version: "v1"
earn_criteria:
  type: "referral_count"
  metric: "referral_count"
  threshold: 5
  conditions:
    - Each referred user must have a verified account (not banned within 7 days)
    - Self-referrals do not count (enforced by DB constraint and IP hash check)
    - Each referee can only be counted once
```

##### 33. v1_influencer

```yaml
badge_id: "v1_influencer"
name: "V1 Influencer"
description: "Referred 25 or more users who successfully created accounts on fuega.ai."
icon_concept: "Megaphone emitting flame-shaped sound waves."
category: referral
rarity: rare
version: "v1"
earn_criteria:
  type: "referral_count"
  metric: "referral_count"
  threshold: 25
  conditions:
    - Same validation rules as v1_ambassador
    - Supersedes v1_ambassador display (but both badges are earned)
```

##### 34. v1_legend

```yaml
badge_id: "v1_legend"
name: "V1 Legend"
description: "Referred 100 or more users who successfully created accounts on fuega.ai."
icon_concept: "Star exploding into a supernova of flames. Maximum visual impact."
category: referral
rarity: legendary
version: "v1"
earn_criteria:
  type: "referral_count"
  metric: "referral_count"
  threshold: 100
  conditions:
    - Same validation rules as v1_ambassador
    - Supersedes v1_influencer display (but all three badges are earned)
```

##### 35. first_referral

```yaml
badge_id: "first_referral"
name: "Spark Spreader"
description: "Referred your first user to fuega.ai."
icon_concept: "Hand passing a small flame to another hand."
category: referral
rarity: common
version: "v1"
earn_criteria:
  type: "referral_count"
  metric: "referral_count"
  threshold: 1
  conditions:
    - Referred user must have created a valid account
```

---

#### SPECIAL BADGES

##### 36. supporter

```yaml
badge_id: "supporter"
name: "Supporter"
description: "Made a donation to the fuega.ai tip jar to help keep the platform running."
icon_concept: "Heart made of flames. Warm, glowing aura."
category: special
rarity: rare
version: "v1"
earn_criteria:
  type: "one_time"
  metric: "tip_amount_cents"
  threshold: 1
  conditions:
    - Any successful tip jar payment (one-time or recurring)
    - Minimum amount: $1.00 (100 cents)
```

##### 37. recurring_supporter

```yaml
badge_id: "recurring_supporter"
name: "Recurring Supporter"
description: "Set up a recurring monthly donation to the fuega.ai tip jar."
icon_concept: "Heart made of flames with a circular arrow around it."
category: special
rarity: epic
version: "v1"
earn_criteria:
  type: "one_time"
  metric: "recurring_tip"
  threshold: 1
  conditions:
    - Active recurring Stripe subscription for the tip jar
    - Badge removed if subscription is cancelled (revocable badge)
```

##### 38. bug_hunter

```yaml
badge_id: "bug_hunter"
name: "Bug Hunter"
description: "Reported a verified bug or security vulnerability through the official channels."
icon_concept: "Magnifying glass with a flame-shaped lens over a bug icon."
category: special
rarity: rare
version: "v1"
earn_criteria:
  type: "manual"
  metric: "admin_award"
  threshold: 1
  conditions:
    - Manually awarded by platform administrators
    - Requires verified, actionable bug report
```

##### 39. community_creator

```yaml
badge_id: "community_creator"
name: "Community Creator"
description: "Created your first community on fuega.ai."
icon_concept: "Flame emerging from a seedling, representing growth."
category: special
rarity: uncommon
version: "v1"
earn_criteria:
  type: "threshold"
  metric: "communities_created"
  threshold: 1
  conditions:
    - Community must be approved by platform agent
    - Community must not be banned
```

##### 40. verified_human

```yaml
badge_id: "verified_human"
name: "Verified Human"
description: "Passed an additional verification step to prove human status."
icon_concept: "Fingerprint outline made of tiny flame dots."
category: special
rarity: uncommon
version: "v1"
earn_criteria:
  type: "manual"
  metric: "admin_verification"
  threshold: 1
  conditions:
    - Manually awarded after verification process
    - Details of verification method TBD (not tied to real identity)
```

---

### Badge Display Rules

1. **Primary Badge:** Each user selects one badge as their "primary" badge. This is displayed next to their username in posts, comments, and profiles.
2. **Profile Badge Gallery:** All earned badges are visible on the user's profile page, sorted by rarity (legendary first).
3. **Badge Tooltip:** Hovering over a badge shows: name, description, rarity, date earned, and percentage of users who have this badge.
4. **Badge Notification:** When a badge is earned, the user receives an in-app notification. The badge briefly animates on their profile.
5. **Badge Count:** User profiles show total badge count alongside spark score.

### Badge Award Pipeline

```
1. Eligibility Check (hourly cron OR event-triggered)
     |
2. ENABLE_BADGE_DISTRIBUTION flag check
     |
     ├── flag=false → Log eligibility to badge_eligibility_log, do NOT award
     └── flag=true  → Continue to award
     |
3. Idempotency Check (has user already earned this badge?)
     |
4. Award Badge (INSERT into user_badges)
     |
5. Send Notification (INSERT into notifications)
     |
6. Audit Log (INSERT into badge_audit_log)
```

**Test Mode (ENABLE_BADGE_DISTRIBUTION=false):**
- The system tracks which users WOULD earn badges
- Logged to `badge_eligibility_log` table for debugging
- No badges are actually awarded
- No notifications are sent
- Used during development and pre-launch testing

---

## COSMETICS SHOP

### Overview

The cosmetics shop allows users to purchase visual customizations using real money via Stripe. Cosmetics are purely aesthetic and provide no functional advantage. All purchases are processed through Stripe Checkout with webhook verification. Users have a 7-day refund window on all purchases.

### Cosmetic Categories

| Category   | Subcategory | Description                                      |
|------------|-------------|--------------------------------------------------|
| `theme`    | `profile`   | Color themes applied to the user's profile page  |
| `theme`    | `community` | Color themes applied to a community page         |
| `border`   | `profile`   | Decorative borders around the user's avatar       |
| `title`    | `profile`   | Custom display title shown below username          |
| `color`    | `profile`   | Username color override in posts and comments      |
| `avatar`   | `profile`   | Animated or special avatar frames                  |
| `banner`   | `profile`   | Custom banner background for the user's profile   |
| `banner`   | `community` | Custom banner background for a community page     |
| `icon`     | `community` | Custom icon for a community                        |

### Cosmetic Schema

```typescript
interface CosmeticDefinition {
  cosmetic_id: string;       // Unique slug (e.g., "theme_lava_flow")
  name: string;              // Display name
  description: string;       // What it looks like
  preview_concept: string;   // Description of the preview image
  category: CosmeticCategory;
  subcategory: CosmeticSubcategory;
  price_cents: number;       // Price in USD cents
  metadata: object;          // Category-specific data (CSS vars, URLs, etc.)
  available: boolean;        // Whether it's currently purchasable
}
```

### Complete Cosmetics Catalog

---

#### PROFILE THEMES

##### theme_lava_flow

```yaml
cosmetic_id: "theme_lava_flow"
name: "Lava Flow"
description: "Deep red and orange gradient background with flowing lava animation on your profile page."
preview_concept: "Profile page with dark red-to-orange gradient, subtle flowing animation."
category: theme
subcategory: profile
price_cents: 499
metadata:
  css_vars:
    --profile-bg-primary: "#1a0000"
    --profile-bg-secondary: "#330000"
    --profile-accent: "#FF4500"
    --profile-text: "#FFD700"
  animation: "lava_flow"
available: true
```

##### theme_midnight_ember

```yaml
cosmetic_id: "theme_midnight_ember"
name: "Midnight Ember"
description: "Deep black background with subtle orange ember particles floating across your profile."
preview_concept: "Near-black profile with tiny orange dots drifting upward."
category: theme
subcategory: profile
price_cents: 499
metadata:
  css_vars:
    --profile-bg-primary: "#0a0a0a"
    --profile-bg-secondary: "#1a1008"
    --profile-accent: "#FF6B35"
    --profile-text: "#E0E0E0"
  animation: "ember_float"
available: true
```

##### theme_arctic_frost

```yaml
cosmetic_id: "theme_arctic_frost"
name: "Arctic Frost"
description: "Cool blue and white gradient with crystalline frost effects. The anti-fire theme."
preview_concept: "Ice-blue profile with subtle frost crystal overlays."
category: theme
subcategory: profile
price_cents: 499
metadata:
  css_vars:
    --profile-bg-primary: "#0a1628"
    --profile-bg-secondary: "#1a2a4a"
    --profile-accent: "#60A5FA"
    --profile-text: "#E0F0FF"
  animation: "frost_crystals"
available: true
```

##### theme_neon_grid

```yaml
cosmetic_id: "theme_neon_grid"
name: "Neon Grid"
description: "Retro-futuristic neon grid background with purple and cyan accents."
preview_concept: "Dark background with perspective neon grid lines, Tron-style."
category: theme
subcategory: profile
price_cents: 599
metadata:
  css_vars:
    --profile-bg-primary: "#0a0020"
    --profile-bg-secondary: "#150040"
    --profile-accent: "#00FFFF"
    --profile-text: "#E0E0FF"
  animation: "neon_pulse"
available: true
```

##### theme_forest_canopy

```yaml
cosmetic_id: "theme_forest_canopy"
name: "Forest Canopy"
description: "Deep green and brown tones with leaf particle effects."
preview_concept: "Dark forest green background with falling leaf silhouettes."
category: theme
subcategory: profile
price_cents: 499
metadata:
  css_vars:
    --profile-bg-primary: "#0a1a0a"
    --profile-bg-secondary: "#1a2a1a"
    --profile-accent: "#4ADE80"
    --profile-text: "#D0F0D0"
  animation: "falling_leaves"
available: true
```

##### theme_void

```yaml
cosmetic_id: "theme_void"
name: "The Void"
description: "Pure black with subtle dark purple undertones. Minimal. Mysterious."
preview_concept: "Almost entirely black with very faint purple nebula wisps."
category: theme
subcategory: profile
price_cents: 399
metadata:
  css_vars:
    --profile-bg-primary: "#000000"
    --profile-bg-secondary: "#0a0010"
    --profile-accent: "#8B5CF6"
    --profile-text: "#C0C0C0"
  animation: "none"
available: true
```

---

#### COMMUNITY THEMES

##### theme_community_inferno

```yaml
cosmetic_id: "theme_community_inferno"
name: "Community Inferno"
description: "Intense red and orange theme for your community page. Flames on every surface."
preview_concept: "Community page bathed in red-orange tones with fire border effects."
category: theme
subcategory: community
price_cents: 999
metadata:
  css_vars:
    --community-bg-primary: "#1a0500"
    --community-bg-secondary: "#2a0a00"
    --community-accent: "#FF4500"
    --community-text: "#FFE0C0"
  animation: "fire_border"
available: true
```

##### theme_community_ocean

```yaml
cosmetic_id: "theme_community_ocean"
name: "Community Ocean"
description: "Deep blue aquatic theme with wave animations for your community page."
preview_concept: "Community page with deep blue gradient and wave motion at the top."
category: theme
subcategory: community
price_cents: 999
metadata:
  css_vars:
    --community-bg-primary: "#001020"
    --community-bg-secondary: "#002040"
    --community-accent: "#0EA5E9"
    --community-text: "#C0E0FF"
  animation: "wave_motion"
available: true
```

##### theme_community_terminal

```yaml
cosmetic_id: "theme_community_terminal"
name: "Community Terminal"
description: "Classic green-on-black terminal aesthetic for your community page."
preview_concept: "Community page styled like an old CRT terminal with green text."
category: theme
subcategory: community
price_cents: 799
metadata:
  css_vars:
    --community-bg-primary: "#000000"
    --community-bg-secondary: "#001100"
    --community-accent: "#00FF00"
    --community-text: "#00CC00"
  animation: "scanlines"
available: true
```

---

#### AVATAR BORDERS

##### border_flame_ring

```yaml
cosmetic_id: "border_flame_ring"
name: "Flame Ring"
description: "Animated ring of fire around your avatar."
preview_concept: "User avatar enclosed in a rotating ring of orange flames."
category: border
subcategory: profile
price_cents: 299
metadata:
  border_style: "animated"
  animation: "flame_rotation"
  colors: ["#FF4500", "#FF6B35", "#FFD700"]
available: true
```

##### border_ice_crystal

```yaml
cosmetic_id: "border_ice_crystal"
name: "Ice Crystal"
description: "Crystalline ice border with subtle shimmer effect."
preview_concept: "User avatar enclosed in a jagged ice crystal frame with blue shimmer."
category: border
subcategory: profile
price_cents: 299
metadata:
  border_style: "animated"
  animation: "ice_shimmer"
  colors: ["#60A5FA", "#93C5FD", "#DBEAFE"]
available: true
```

##### border_gold_ornate

```yaml
cosmetic_id: "border_gold_ornate"
name: "Gold Ornate"
description: "Elegant gold filigree border with intricate patterns."
preview_concept: "User avatar with an ornate gold decorative frame, like a portrait painting."
category: border
subcategory: profile
price_cents: 399
metadata:
  border_style: "static"
  animation: "none"
  colors: ["#FFD700", "#DAA520", "#B8860B"]
available: true
```

##### border_pixel_art

```yaml
cosmetic_id: "border_pixel_art"
name: "Pixel Art"
description: "Retro 8-bit pixel art border with chunky colored squares."
preview_concept: "User avatar with a pixelated border made of small colored squares."
category: border
subcategory: profile
price_cents: 199
metadata:
  border_style: "static"
  animation: "none"
  colors: ["#FF0000", "#00FF00", "#0000FF", "#FFFF00"]
available: true
```

##### border_lightning

```yaml
cosmetic_id: "border_lightning"
name: "Lightning"
description: "Electric lightning bolts crackling around your avatar."
preview_concept: "User avatar surrounded by small animated lightning arcs."
category: border
subcategory: profile
price_cents: 399
metadata:
  border_style: "animated"
  animation: "lightning_crackle"
  colors: ["#FFFFFF", "#60A5FA", "#A855F7"]
available: true
```

##### border_shadow

```yaml
cosmetic_id: "border_shadow"
name: "Shadow Aura"
description: "Dark smoke-like tendrils emanating from your avatar border."
preview_concept: "User avatar with dark wisps of shadow curling outward."
category: border
subcategory: profile
price_cents: 299
metadata:
  border_style: "animated"
  animation: "shadow_wisps"
  colors: ["#1a1a2e", "#16213e", "#0f3460"]
available: true
```

---

#### CUSTOM TITLES

##### title_fire_starter

```yaml
cosmetic_id: "title_fire_starter"
name: "Fire Starter"
description: "Displays 'Fire Starter' below your username."
preview_concept: "Username with 'Fire Starter' in orange text below it."
category: title
subcategory: profile
price_cents: 199
metadata:
  title_text: "Fire Starter"
  title_color: "#FF4500"
available: true
```

##### title_flame_keeper

```yaml
cosmetic_id: "title_flame_keeper"
name: "Flame Keeper"
description: "Displays 'Flame Keeper' below your username."
preview_concept: "Username with 'Flame Keeper' in gold text below it."
category: title
subcategory: profile
price_cents: 199
metadata:
  title_text: "Flame Keeper"
  title_color: "#FFD700"
available: true
```

##### title_ember_walker

```yaml
cosmetic_id: "title_ember_walker"
name: "Ember Walker"
description: "Displays 'Ember Walker' below your username."
preview_concept: "Username with 'Ember Walker' in warm red text below it."
category: title
subcategory: profile
price_cents: 199
metadata:
  title_text: "Ember Walker"
  title_color: "#DC2626"
available: true
```

##### title_ash_born

```yaml
cosmetic_id: "title_ash_born"
name: "Ash Born"
description: "Displays 'Ash Born' below your username."
preview_concept: "Username with 'Ash Born' in silver-grey text below it."
category: title
subcategory: profile
price_cents: 199
metadata:
  title_text: "Ash Born"
  title_color: "#A0A0A0"
available: true
```

##### title_phoenix

```yaml
cosmetic_id: "title_phoenix"
name: "Phoenix"
description: "Displays 'Phoenix' below your username with gradient coloring."
preview_concept: "Username with 'Phoenix' in red-to-gold gradient text below it."
category: title
subcategory: profile
price_cents: 299
metadata:
  title_text: "Phoenix"
  title_color: "gradient(#DC2626, #FFD700)"
available: true
```

##### title_wildfire

```yaml
cosmetic_id: "title_wildfire"
name: "Wildfire"
description: "Displays 'Wildfire' below your username with animated flame effect."
preview_concept: "Username with 'Wildfire' text that has a subtle flame shimmer animation."
category: title
subcategory: profile
price_cents: 399
metadata:
  title_text: "Wildfire"
  title_color: "#FF6B35"
  animation: "flame_text"
available: true
```

---

#### USERNAME COLORS

##### color_flame_orange

```yaml
cosmetic_id: "color_flame_orange"
name: "Flame Orange"
description: "Your username appears in bright flame orange in posts and comments."
preview_concept: "Username text rendered in #FF6B35."
category: color
subcategory: profile
price_cents: 149
metadata:
  username_color: "#FF6B35"
available: true
```

##### color_royal_purple

```yaml
cosmetic_id: "color_royal_purple"
name: "Royal Purple"
description: "Your username appears in rich royal purple."
preview_concept: "Username text rendered in #A855F7."
category: color
subcategory: profile
price_cents: 149
metadata:
  username_color: "#A855F7"
available: true
```

##### color_ocean_blue

```yaml
cosmetic_id: "color_ocean_blue"
name: "Ocean Blue"
description: "Your username appears in deep ocean blue."
preview_concept: "Username text rendered in #3B82F6."
category: color
subcategory: profile
price_cents: 149
metadata:
  username_color: "#3B82F6"
available: true
```

##### color_emerald_green

```yaml
cosmetic_id: "color_emerald_green"
name: "Emerald Green"
description: "Your username appears in vivid emerald green."
preview_concept: "Username text rendered in #10B981."
category: color
subcategory: profile
price_cents: 149
metadata:
  username_color: "#10B981"
available: true
```

##### color_crimson_red

```yaml
cosmetic_id: "color_crimson_red"
name: "Crimson Red"
description: "Your username appears in deep crimson red."
preview_concept: "Username text rendered in #DC2626."
category: color
subcategory: profile
price_cents: 149
metadata:
  username_color: "#DC2626"
available: true
```

##### color_gold

```yaml
cosmetic_id: "color_gold"
name: "Gold"
description: "Your username appears in gleaming gold."
preview_concept: "Username text rendered in #FFD700."
category: color
subcategory: profile
price_cents: 199
metadata:
  username_color: "#FFD700"
available: true
```

##### color_rainbow

```yaml
cosmetic_id: "color_rainbow"
name: "Rainbow"
description: "Your username cycles through rainbow colors with a smooth gradient animation."
preview_concept: "Username text with animated rainbow gradient."
category: color
subcategory: profile
price_cents: 399
metadata:
  username_color: "rainbow_gradient"
  animation: "color_cycle"
available: true
```

---

#### AVATAR FRAMES

##### avatar_flame_aura

```yaml
cosmetic_id: "avatar_flame_aura"
name: "Flame Aura"
description: "A glow of flickering flames behind your avatar image."
preview_concept: "Avatar with a soft orange flame-like glow behind it."
category: avatar
subcategory: profile
price_cents: 349
metadata:
  frame_type: "glow"
  animation: "flicker"
  colors: ["#FF4500", "#FF6B35"]
available: true
```

##### avatar_hexagon

```yaml
cosmetic_id: "avatar_hexagon"
name: "Hexagon Frame"
description: "Your avatar is displayed in a hexagonal shape instead of a circle."
preview_concept: "Avatar cropped to a hexagonal shape with thin border."
category: avatar
subcategory: profile
price_cents: 249
metadata:
  frame_type: "shape"
  shape: "hexagon"
  animation: "none"
available: true
```

##### avatar_diamond

```yaml
cosmetic_id: "avatar_diamond"
name: "Diamond Frame"
description: "Your avatar is displayed in a diamond (rotated square) shape."
preview_concept: "Avatar cropped to a 45-degree rotated square shape."
category: avatar
subcategory: profile
price_cents: 249
metadata:
  frame_type: "shape"
  shape: "diamond"
  animation: "none"
available: true
```

---

#### PROFILE BANNERS

##### banner_fire_landscape

```yaml
cosmetic_id: "banner_fire_landscape"
name: "Fire Landscape"
description: "A wide panoramic banner of a volcanic landscape with flowing lava."
preview_concept: "Dark volcanic terrain with rivers of lava and an orange sky."
category: banner
subcategory: profile
price_cents: 499
metadata:
  banner_url: "/cosmetics/banners/fire_landscape.webp"
  banner_height: 200
available: true
```

##### banner_starfield

```yaml
cosmetic_id: "banner_starfield"
name: "Starfield"
description: "Deep space starfield with distant nebulae and twinkling stars."
preview_concept: "Dark space background with colorful nebula clouds and bright stars."
category: banner
subcategory: profile
price_cents: 499
metadata:
  banner_url: "/cosmetics/banners/starfield.webp"
  banner_height: 200
available: true
```

##### banner_circuit_board

```yaml
cosmetic_id: "banner_circuit_board"
name: "Circuit Board"
description: "Close-up of a circuit board with glowing orange traces."
preview_concept: "Green PCB with bright orange/copper traces and component outlines."
category: banner
subcategory: profile
price_cents: 399
metadata:
  banner_url: "/cosmetics/banners/circuit_board.webp"
  banner_height: 200
available: true
```

##### banner_abstract_waves

```yaml
cosmetic_id: "banner_abstract_waves"
name: "Abstract Waves"
description: "Smooth abstract waves in warm gradient tones."
preview_concept: "Flowing wave shapes in orange, red, and gold on a dark background."
category: banner
subcategory: profile
price_cents: 399
metadata:
  banner_url: "/cosmetics/banners/abstract_waves.webp"
  banner_height: 200
available: true
```

---

#### COMMUNITY BANNERS

##### banner_community_flames

```yaml
cosmetic_id: "banner_community_flames"
name: "Community Flames"
description: "Dramatic wall of flames banner for your community page."
preview_concept: "Wide banner of rising flames against a dark background."
category: banner
subcategory: community
price_cents: 799
metadata:
  banner_url: "/cosmetics/banners/community_flames.webp"
  banner_height: 250
available: true
```

##### banner_community_mountains

```yaml
cosmetic_id: "banner_community_mountains"
name: "Community Mountains"
description: "Mountain range silhouette at sunset for your community page."
preview_concept: "Dark mountain silhouettes against an orange-red sunset sky."
category: banner
subcategory: community
price_cents: 799
metadata:
  banner_url: "/cosmetics/banners/community_mountains.webp"
  banner_height: 250
available: true
```

---

#### COMMUNITY ICONS

##### icon_flame_circle

```yaml
cosmetic_id: "icon_flame_circle"
name: "Flame Circle Icon"
description: "Stylized flame inside a circle for your community icon."
preview_concept: "Orange flame icon centered in a dark circle with orange border."
category: icon
subcategory: community
price_cents: 499
metadata:
  icon_url: "/cosmetics/icons/flame_circle.svg"
  icon_size: 128
available: true
```

##### icon_shield

```yaml
cosmetic_id: "icon_shield"
name: "Shield Icon"
description: "Shield emblem with customizable inner color for your community."
preview_concept: "Traditional shield shape with inner flame emblem."
category: icon
subcategory: community
price_cents: 499
metadata:
  icon_url: "/cosmetics/icons/shield.svg"
  icon_size: 128
available: true
```

##### icon_diamond

```yaml
cosmetic_id: "icon_diamond"
name: "Diamond Icon"
description: "Faceted diamond icon with fire refraction effects."
preview_concept: "Diamond shape with internal orange/red light refractions."
category: icon
subcategory: community
price_cents: 599
metadata:
  icon_url: "/cosmetics/icons/diamond.svg"
  icon_size: 128
available: true
```

---

### Cosmetics Purchase Flow

```
1. User browses cosmetics shop catalog
     |
2. User clicks "Purchase" on a cosmetic item
     |
3. Client creates Stripe Checkout Session via API
     |
     POST /api/cosmetics/checkout
     Body: { cosmetic_id: "theme_lava_flow" }
     |
4. Server validates:
     a. Cosmetic exists and is available
     b. User doesn't already own it
     c. Price matches server-side catalog (NEVER trust client price)
     |
5. Server creates Stripe Checkout Session
     |
6. User is redirected to Stripe-hosted checkout page
     |
7. After payment, Stripe sends webhook event
     |
     checkout.session.completed
     |
8. Server webhook handler:
     a. Verify webhook signature (STRIPE_WEBHOOK_SECRET)
     b. Extract cosmetic_id from metadata
     c. INSERT into user_cosmetics table
     d. Return 200 OK to Stripe
     |
9. User sees cosmetic in their inventory
```

### Cosmetics Refund Policy

- **Refund window:** 7 calendar days from purchase
- **Refund method:** Full refund via Stripe
- **Refund flow:**
  1. User clicks "Refund" on cosmetic in inventory (only visible if <7 days)
  2. Server validates refund window
  3. Server initiates Stripe refund
  4. Server marks user_cosmetics record as `refunded=true, refunded_at=NOW()`
  5. Cosmetic is removed from user's active inventory
- **Non-refundable:** Cosmetics purchased more than 7 days ago
- **Abuse prevention:** More than 5 refunds in 30 days triggers manual review

---

## NOTIFICATIONS

### Overview

Notifications keep users informed about activity relevant to them. Notifications are delivered in-app (notification inbox) and optionally via desktop push (Web Push API). Users control which notification types they receive.

### Notification Types

| Type               | Description                                            | Default | Batchable |
|--------------------|--------------------------------------------------------|---------|-----------|
| `reply_post`       | Someone commented on your post                         | on      | no        |
| `reply_comment`    | Someone replied to your comment                        | on      | no        |
| `spark`            | Someone sparked your post or comment                   | on      | yes       |
| `mention`          | Someone mentioned your username in a post or comment   | on      | no        |
| `community_update` | A community you belong to has news or changes          | on      | no        |
| `governance`       | A governance proposal you can vote on, or vote results | on      | no        |
| `badge_earned`     | You earned a new badge                                 | on      | no        |
| `tip_received`     | (Future) Someone tipped you directly                   | on      | no        |
| `referral`         | Someone joined using your referral link                | on      | no        |

### Notification Schema

```typescript
interface Notification {
  id: string;           // UUID
  user_id: string;      // Recipient
  type: NotificationType;
  title: string;        // Short summary (e.g., "New reply on your post")
  body: string;         // Detail text (e.g., "user123 commented on 'My Post Title'")
  action_url: string;   // Where clicking the notification navigates (e.g., "/f/tech/posts/abc123")
  content: object;      // JSONB with type-specific data
  read: boolean;
  read_at: string;      // Timestamp when marked as read (null if unread)
  push_sent: boolean;   // Whether a push notification was sent for this
  created_at: string;
}
```

### Notification Content (JSONB) by Type

#### reply_post
```json
{
  "post_id": "uuid",
  "post_title": "My Post Title",
  "comment_id": "uuid",
  "commenter_username": "user123",
  "comment_preview": "First 100 characters of the comment..."
}
```

#### reply_comment
```json
{
  "post_id": "uuid",
  "post_title": "My Post Title",
  "parent_comment_id": "uuid",
  "reply_comment_id": "uuid",
  "replier_username": "user123",
  "reply_preview": "First 100 characters of the reply..."
}
```

#### spark
```json
{
  "content_type": "post",
  "content_id": "uuid",
  "content_title": "My Post Title",
  "spark_count": 5,
  "latest_sparker": "user456"
}
```

#### mention
```json
{
  "content_type": "comment",
  "content_id": "uuid",
  "post_id": "uuid",
  "post_title": "My Post Title",
  "mentioner_username": "user789",
  "mention_preview": "...mentioned you in a comment: First 100 chars..."
}
```

#### community_update
```json
{
  "community_id": "uuid",
  "community_name": "technology",
  "update_type": "ai_config_changed",
  "summary": "The AI moderation settings were updated by community vote."
}
```

#### governance
```json
{
  "community_id": "uuid",
  "community_name": "technology",
  "proposal_id": "uuid",
  "proposal_title": "Update toxicity threshold",
  "governance_event": "new_proposal",
  "voting_ends_at": "2026-03-01T00:00:00Z"
}
```

#### badge_earned
```json
{
  "badge_id": "v1_founder",
  "badge_name": "V1 Founder",
  "badge_rarity": "legendary",
  "badge_description": "One of the first 5,000 users to join fuega.ai."
}
```

#### referral
```json
{
  "referee_username": "new_user_42",
  "referral_count": 6,
  "next_badge_at": 25,
  "next_badge_name": "V1 Influencer"
}
```

### Batching Rules

Batching prevents notification spam for high-frequency events. Only the `spark` notification type is batchable.

**Spark Batching Logic:**

```
1. When a spark event occurs:
     |
2. Check if an unread spark notification exists for the same content_id
     |
     ├── YES → Update existing notification:
     |         - Increment spark_count in content JSONB
     |         - Update latest_sparker
     |         - Update title: "5 people sparked your post 'Title'"
     |         - Update created_at to NOW() (moves to top of inbox)
     |         - Do NOT send another push notification
     |
     └── NO  → Create new notification:
              - spark_count = 1
              - title: "user123 sparked your post 'Title'"
              - Send push notification (if enabled)
```

**Batching window:** Spark notifications are batched within a rolling 1-hour window. After 1 hour without new sparks, the next spark creates a new notification.

**Batch display format:**
- 1 spark: "user123 sparked your post 'Title'"
- 2-5 sparks: "user123 and 3 others sparked your post 'Title'"
- 6+ sparks: "6 people sparked your post 'Title'"

### Desktop Push Notifications

Push notifications are delivered via the **Web Push API** (W3C standard). This works in Chrome, Firefox, Edge, and Safari 16+.

**Architecture:**

```
1. User enables push notifications in settings
     |
2. Browser requests push permission
     |
3. Browser generates push subscription (endpoint + keys)
     |
4. Client sends subscription to server
     |
     POST /api/notifications/push-subscribe
     Body: { subscription: PushSubscription }
     |
5. Server stores subscription in user_push_subscriptions table
     |
6. When a notification is created:
     a. Check user's push preferences
     b. If push enabled for this notification type:
        - Send push via web-push library
        - Mark push_sent=true on notification record
```

**Push Notification Content:**
```json
{
  "title": "fuega.ai",
  "body": "user123 replied to your post 'My Post Title'",
  "icon": "/icon-192.png",
  "badge": "/badge-72.png",
  "tag": "notification-uuid",
  "data": {
    "url": "/f/tech/posts/abc123#comment-xyz"
  }
}
```

**Push Notification Rules:**
- Maximum 1 push per minute per user (prevent spam)
- No push for batched spark updates (only the first spark triggers push)
- Push content must NOT contain sensitive/identifying information
- Users can disable push per-type or entirely
- Push subscriptions expire and must be refreshed

### Notification Preferences

Users configure notification preferences in their settings page.

```typescript
interface NotificationPreferences {
  // Per-type toggles (in-app notifications)
  reply_post: boolean;        // default: true
  reply_comment: boolean;     // default: true
  spark: boolean;             // default: true
  mention: boolean;           // default: true
  community_update: boolean;  // default: true
  governance: boolean;        // default: true
  badge_earned: boolean;      // default: true
  tip_received: boolean;      // default: true
  referral: boolean;          // default: true

  // Push notification toggles (desktop push)
  push_enabled: boolean;      // default: false (requires browser permission)
  push_reply_post: boolean;   // default: true
  push_reply_comment: boolean;// default: true
  push_spark: boolean;        // default: false (too frequent)
  push_mention: boolean;      // default: true
  push_governance: boolean;   // default: false
  push_badge_earned: boolean; // default: true
  push_referral: boolean;     // default: true
}
```

**Storage:** Preferences are stored as JSONB on the users table or in a separate `notification_preferences` table.

### Notification Cleanup

- **Read notifications:** Deleted after 30 days (weekly cron job)
- **Unread notifications:** Kept indefinitely (user must read or dismiss)
- **Push subscriptions:** Pruned if endpoint returns 410 Gone (expired)

### Notification UI Components

1. **Bell Icon** (header) - Shows unread count badge (red dot with number). Clicking opens dropdown.
2. **Notification Dropdown** - Last 20 notifications, scrollable. Mark all as read button.
3. **Notification Item** - Icon (type-specific), title, body preview, timestamp, read/unread indicator.
4. **Full Notification Inbox** (/notifications page) - All notifications with filters by type.
5. **Settings Panel** (/settings/notifications) - Toggle switches for each notification type and push preferences.

---

## REFERRAL SYSTEM

### Overview

The referral system incentivizes users to invite others to fuega.ai. Each user gets a unique referral link. When someone signs up using that link, the referrer earns credit toward referral badges. The system is designed to prevent fraud (self-referrals, bot signups, multi-account abuse).

### Referral Link Format

```
https://fuega.ai/join?ref={referral_code}
```

- **referral_code:** A unique 8-character alphanumeric string generated per user
- **Example:** `https://fuega.ai/join?ref=a1b2c3d4`
- **Referral code is generated** on first request (lazy generation) or at account creation

### Referral Tracking Flow

```
1. Referrer shares their referral link
     |
2. Potential new user clicks the link
     |
3. Server sets a referral tracking cookie:
     Cookie: fuega_ref=a1b2c3d4
     Max-Age: 2592000 (30 days)
     HttpOnly: true
     Secure: true
     SameSite: Lax
     |
4. User browses the site (cookie persists for 30 days)
     |
5. User signs up for an account
     |
6. During registration, server checks:
     a. Read fuega_ref cookie
     b. Look up referrer by referral_code
     c. Validate referral (see fraud prevention below)
     |
7. If valid:
     a. INSERT into referrals table (referrer_id, referee_id, ip_hash)
     b. UPDATE users SET referred_by = referrer_id WHERE id = referee_id
     c. UPDATE users SET referral_count = referral_count + 1 WHERE id = referrer_id
     d. Check referrer badge eligibility (5 → Ambassador, 25 → Influencer, 100 → Legend)
     e. Send notification to referrer
     f. Clear fuega_ref cookie
```

### Referral Fraud Prevention

| Check                  | Method                                            | Action on Failure        |
|------------------------|---------------------------------------------------|--------------------------|
| Self-referral          | DB constraint: CHECK(referrer_id != referee_id)   | Referral silently ignored|
| Same IP                | Compare ip_hash of referrer and referee            | Referral silently ignored|
| Duplicate referee      | DB constraint: UNIQUE(referee_id)                  | Referral silently ignored|
| Bot signup             | Account must survive 7 days without ban            | Referral reverted        |
| Rapid signups          | Max 10 referral signups per hour per referrer IP   | Excess silently ignored  |
| Account age            | Referrer must have account >= 24 hours old         | Referral silently ignored|

**Silent ignoring:** The referee still creates their account normally. Only the referral credit is not awarded. This prevents information leakage about fraud detection.

**Referral reversion:** If a referred account is banned within 7 days of creation:
1. Decrement referrer's referral_count
2. Mark referral record as `reverted=true`
3. Re-check badge eligibility (may lose a badge if count drops below threshold)

### Badge Progression

| Referral Count | Badge Earned    | Rarity    |
|----------------|-----------------|-----------|
| 1              | Spark Spreader  | common    |
| 5              | V1 Ambassador   | uncommon  |
| 25             | V1 Influencer   | rare      |
| 100            | V1 Legend       | legendary |

All badges in the chain are earned and kept. Earning V1 Influencer does not remove V1 Ambassador. However, users typically display only their highest referral badge as their primary badge.

### Referral Dashboard UI

The referral dashboard is accessible at `/settings/referrals` and shows:

1. **Referral Link** - Displayed with a copy-to-clipboard button
2. **Share Buttons** - Quick share to Twitter/X, Reddit, Discord, and generic share
3. **Referral Count** - Total successful referrals
4. **Progress Bar** - Visual progress toward next referral badge
5. **Referral History** - Table of referred users (username, join date, status)
6. **Next Badge** - Name and requirement for the next referral badge

---

## TIP JAR

### Overview

The tip jar allows users to make voluntary donations to support the fuega.ai platform. Tips are processed through Stripe and can be one-time or recurring (monthly). Tipping earns the "Supporter" badge (one-time tips) or "Recurring Supporter" badge (monthly subscriptions).

### Tip Options

#### One-Time Tips

| Amount   | Display       | Price (cents) |
|----------|---------------|---------------|
| $1.00    | "Buy a coffee" | 100          |
| $5.00    | "Buy lunch"    | 500          |
| $10.00   | "Fill the tank" | 1000        |
| $25.00   | "Fan the flames"| 2500        |
| $50.00   | "Ignite"       | 5000         |
| Custom   | User-specified | min 100, max 100000 |

#### Recurring Tips (Monthly)

| Amount   | Display            | Price (cents/month) |
|----------|--------------------|---------------------|
| $1.00    | "Ember"            | 100                 |
| $5.00    | "Flame"            | 500                 |
| $10.00   | "Blaze"            | 1000                |
| $25.00   | "Inferno"          | 2500                |
| Custom   | User-specified     | min 100, max 100000 |

### Tip Flow

```
1. User clicks "Support fuega.ai" button (visible in footer/sidebar)
     |
2. User selects one-time or recurring, and amount
     |
3. Optionally adds a message (max 500 chars, displayed on a supporters page)
     |
4. Client creates Stripe Checkout Session or Stripe Subscription
     |
     POST /api/tips/checkout
     Body: { amount_cents: 500, recurring: false, message: "Keep it going!" }
     |
5. Server creates Stripe session:
     - One-time: payment mode
     - Recurring: subscription mode with monthly interval
     |
6. User completes payment on Stripe-hosted page
     |
7. Stripe webhook received:
     - One-time: checkout.session.completed
     - Recurring: invoice.paid (first and subsequent months)
     |
8. Server handler:
     a. INSERT into tips table
     b. Award "Supporter" badge (if first tip)
     c. Award "Recurring Supporter" badge (if recurring, first month)
     d. Send notification to user (thank you)
```

### Recurring Tip Management

- Users can cancel recurring tips from their settings page
- Cancellation takes effect at end of current billing period
- If a recurring tip is cancelled, the "Recurring Supporter" badge is revoked
- The "Supporter" badge (one-time) is never revoked
- Failed payment retries follow Stripe's default retry schedule (3 attempts over ~7 days)

### Supporters Page

An optional public page at `/supporters` showing:
- Anonymous list of recent tips (username + amount + message)
- Users can opt out of appearing on this page
- Total tips received (platform lifetime)
- Current monthly recurring total

---

## STRUCTURED AI CONFIG

### Overview

Communities configure their AI moderation agent through structured settings rather than free-form text prompts. This approach prevents prompt injection attacks and ensures all communities have functional, safe moderation. The AI prompt is auto-generated from the structured configuration, meaning users never write raw prompts.

**This replaces the original "community writes their own prompt" design from V1.**

### Why Structured Config?

| Free-Form Prompts (V1 - Removed)         | Structured Config (V2 - Implemented)     |
|------------------------------------------|------------------------------------------|
| Users write raw AI prompts               | Users select from predefined options     |
| Vulnerable to prompt injection           | Injection-proof by design                |
| Inconsistent moderation quality          | Predictable, reliable moderation         |
| Hard to audit                            | Easy to audit and compare                |
| Requires AI expertise from users         | Accessible to all users                  |
| Can disable all moderation               | Guardrails prevent unsafe configs        |

### Configuration Schema

```typescript
interface CommunityAIConfig {
  // Content Filtering
  toxicity_threshold: number;          // 0-90 (percentage, max 90%)
  spam_sensitivity: 'low' | 'medium' | 'high';
  self_promotion_policy: 'block' | 'flag' | 'allow';
  link_sharing_policy: 'block' | 'flag' | 'allow';

  // Content Types
  allowed_post_types: ('text' | 'link' | 'image')[];  // at least one required
  allow_nsfw: boolean;                                  // default: false

  // Language
  language_requirements: string[];     // ISO 639-1 codes, empty = all languages
  require_english: boolean;            // default: false

  // User Requirements
  minimum_account_age_days: number;    // 0-365
  minimum_spark_score: number;         // 0-10000

  // Custom Filters
  blocked_keywords: string[];          // Posts/comments containing these are auto-removed
  flagged_keywords: string[];          // Posts/comments containing these are flagged for review
  max_keyword_count: number;           // Max 200 keywords total (blocked + flagged)

  // Governance
  config_change_quorum: number;        // 5-100 (percentage of active members required to vote)
  config_change_threshold: number;     // 51-100 (percentage of votes needed to pass)
  config_change_voting_days: number;   // 1-30 (how long voting stays open)
}
```

### Configuration Constraints (Guardrails)

These constraints are enforced server-side and cannot be bypassed:

| Setting                  | Min   | Max    | Default  | Rationale                                  |
|--------------------------|-------|--------|----------|--------------------------------------------|
| toxicity_threshold       | 0     | 90     | 50       | 0 = no filter, 90 = max (never disable moderation entirely) |
| spam_sensitivity         | -     | -      | medium   | Enum, no numeric range                     |
| minimum_account_age_days | 0     | 365    | 0        | Prevent gatekeeping beyond 1 year          |
| minimum_spark_score      | 0     | 10000  | 0        | Prevent extreme gatekeeping                |
| blocked_keywords count   | 0     | 100    | 0        | Prevent over-filtering                     |
| flagged_keywords count   | 0     | 100    | 0        | Prevent over-filtering                     |
| config_change_quorum     | 5     | 100    | 10       | At least 5% of members must vote           |
| config_change_threshold  | 51    | 100    | 66       | Simple majority minimum                    |
| config_change_voting_days| 1     | 30     | 7        | Minimum 1 day, maximum 1 month             |

**Hard limits (non-configurable, platform-enforced):**
- Platform-level content rules ALWAYS apply (no CSAM, no doxxing, no violence incitement)
- AI agent cannot be configured to bypass platform rules
- Toxicity threshold cannot exceed 90% (some moderation always active)
- Quorum cannot drop below 5% (prevent minority takeover)
- At least one post type must be allowed

### Auto-Generated AI Prompt

The structured config is transformed into an AI prompt automatically. Users never see or edit this prompt directly.

**Example transformation:**

Given this config:
```json
{
  "toxicity_threshold": 60,
  "spam_sensitivity": "high",
  "self_promotion_policy": "flag",
  "link_sharing_policy": "allow",
  "allowed_post_types": ["text", "link"],
  "allow_nsfw": false,
  "language_requirements": ["en"],
  "minimum_account_age_days": 7,
  "minimum_spark_score": 10,
  "blocked_keywords": ["spam_word_1", "spam_word_2"],
  "flagged_keywords": ["borderline_word"]
}
```

Auto-generated prompt (example, actual template is in codebase):
```
You are the AI moderation agent for the f/{community_name} community on fuega.ai.

CONTENT POLICY:
- Toxicity: Remove content that is more than 60% toxic (hateful, threatening, or severely disrespectful)
- Spam: HIGH sensitivity. Aggressively filter repetitive, low-effort, or promotional content.
- Self-promotion: FLAG self-promotional content for community review. Do not auto-remove.
- Links: ALLOW external links.
- NSFW: NOT ALLOWED. Remove any NSFW content.
- Language: Only ENGLISH content is allowed. Remove content in other languages.

BLOCKED KEYWORDS (auto-remove if present):
- spam_word_1
- spam_word_2

FLAGGED KEYWORDS (flag for review if present):
- borderline_word

ALLOWED CONTENT TYPES:
- Text posts
- Link posts
- (Image posts are NOT allowed)

PLATFORM RULES (NON-NEGOTIABLE, always enforced):
- No CSAM (child sexual abuse material)
- No direct incitement to violence
- No doxxing or sharing personal information without consent
- No spam or bot networks
- No impersonation

Respond with a JSON decision: {"decision": "approve" | "remove" | "flag", "confidence": 0.0-1.0, "reasoning": "explanation"}
```

### Config Change Process

```
1. Community member proposes config change
     |
     POST /api/communities/{id}/config-proposals
     Body: { changes: { toxicity_threshold: 70, spam_sensitivity: "low" } }
     |
2. Server validates:
     a. Proposer is a member of the community
     b. Proposer account age >= 7 days in community
     c. Proposed values are within guardrail limits
     d. No other active proposal for the same settings
     |
3. Proposal enters discussion period (configurable, default 48 hours)
     |
4. Proposal enters voting period (configurable, default 7 days)
     |
5. Community members vote (for / against / abstain)
     |
6. When voting ends:
     a. Check quorum met (>= config_change_quorum % of active members voted)
     b. Check threshold met (>= config_change_threshold % of votes are "for")
     |
     ├── Quorum NOT met → Proposal fails (status: "failed", reason: "quorum_not_met")
     ├── Threshold NOT met → Proposal fails (status: "failed", reason: "threshold_not_met")
     └── Both met → Proposal passes:
         - Update community ai_config column
         - Auto-regenerate AI prompt from new config
         - Log change in ai_prompt_history
         - Send community_update notification to all members
         - Status: "implemented"
```

### Config Display

Each community page prominently displays the current AI config in a human-readable format:

```
AI MODERATION SETTINGS for f/technology
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Toxicity Filter:     ████████░░ 60%
Spam Filter:         HIGH
Self-Promotion:      Flagged for review
Links:               Allowed
NSFW:                Not allowed
Language:            English only
Min Account Age:     7 days
Min Spark Score:     10
Blocked Keywords:    2 words
Flagged Keywords:    1 word
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Last changed: Feb 15, 2026 (Proposal #42)
```

---

## COMMUNITY ROLES

### Overview

Community members are assigned roles that reflect their standing and activity within a specific community. Roles determine display badges within the community context and may unlock additional privileges in future versions.

### Role Definitions

| Role            | Slug            | Assignment Method        | Description                                    |
|-----------------|-----------------|--------------------------|------------------------------------------------|
| Founder         | `founder`       | Automatic (creator)      | The user who created the community             |
| Moderator       | `moderator`     | Manual (by founder)      | Human facilitator, can review flagged content   |
| VIP             | `vip`           | Manual (by founder)      | Recognized contributor, cosmetic distinction    |
| Active Member   | `active_member` | Automatic (activity)     | User with significant activity in community    |
| Member          | `member`        | Automatic (join)         | Standard member who has joined the community   |
| Lurker          | `lurker`        | Automatic (inactivity)   | Member with no activity in the last 30 days    |

### Auto-Assignment Criteria

#### Active Member
A member is automatically promoted to `active_member` when they meet ALL of these criteria within the community:
- Posted at least 5 approved posts in the community
- Left at least 10 approved comments in the community
- Earned at least 25 sparks on content within the community
- Has been a member for at least 14 days

#### Lurker
A member is automatically demoted to `lurker` when:
- No posts or comments in the community for 30+ consecutive days
- They return to `member` status upon their next post or comment

### Role Hierarchy

```
founder (highest)
  └── moderator
        └── vip
              └── active_member
                    └── member
                          └── lurker (lowest)
```

### Role Display

- Roles are shown as small colored labels next to the username WITHIN the community context
- Outside the community (e.g., on the user's profile), community roles are listed in the "Communities" section
- Role colors:
  - Founder: Gold (#FFD700)
  - Moderator: Green (#4ADE80)
  - VIP: Purple (#A855F7)
  - Active Member: Blue (#60A5FA)
  - Member: Grey (#9CA3AF)
  - Lurker: Dim grey (#6B7280)

### Manual Role Assignment

- Only the community `founder` can manually assign `moderator` and `vip` roles
- Role changes are logged in the community audit log
- A community can have a maximum of 10 moderators
- VIP count is unlimited
- Founder role cannot be transferred in V2 (future feature)

### Role Permissions (V2)

| Permission               | Founder | Moderator | VIP | Active Member | Member | Lurker |
|--------------------------|---------|-----------|-----|---------------|--------|--------|
| Edit community settings  | Yes     | No        | No  | No            | No     | No     |
| Assign moderator/VIP     | Yes     | No        | No  | No            | No     | No     |
| Review flagged content   | Yes     | Yes       | No  | No            | No     | No     |
| Create proposals         | Yes     | Yes       | Yes | Yes           | Yes    | No     |
| Vote on proposals        | Yes     | Yes       | Yes | Yes           | Yes    | No     |
| Post                     | Yes     | Yes       | Yes | Yes           | Yes    | No     |
| Comment                  | Yes     | Yes       | Yes | Yes           | Yes    | No     |
| Spark/Douse              | Yes     | Yes       | Yes | Yes           | Yes    | Yes    |

---

## FEATURE FLAGS

### Overview

Feature flags control the rollout of V2 gamification features. Each flag is an environment variable that defaults to a safe state (typically `false` for new features). Flags are checked server-side only -- the client receives feature availability from the API.

### Flag Definitions

#### ENABLE_BADGE_DISTRIBUTION

```yaml
name: ENABLE_BADGE_DISTRIBUTION
type: boolean
default: false
description: |
  Controls whether badges are actually awarded to users.
  When false (test mode):
    - Badge eligibility is still calculated hourly
    - Eligible users are logged to badge_eligibility_log
    - No badges are inserted into user_badges
    - No badge notifications are sent
    - Useful for verifying eligibility logic before going live
  When true (production mode):
    - Badges are awarded to eligible users
    - Notifications are sent
    - Badge gallery is populated
affects:
  - Badge award pipeline
  - Badge eligibility cron job
  - Notification system (badge_earned type)
dependencies: none
```

#### ENABLE_COSMETICS_SHOP

```yaml
name: ENABLE_COSMETICS_SHOP
type: boolean
default: false
description: |
  Controls whether the cosmetics shop is visible and functional.
  When false:
    - Shop page returns 404
    - Shop link hidden from navigation
    - Stripe checkout endpoints return 403
    - Existing purchased cosmetics still display on profiles
  When true:
    - Shop page is accessible
    - Shop link visible in navigation
    - Stripe checkout endpoints are functional
    - Full purchase and refund flow available
affects:
  - /shop page visibility
  - /api/cosmetics/* endpoints
  - Navigation component
  - Stripe webhook handling
dependencies:
  - STRIPE_SECRET_KEY must be set
  - STRIPE_PUBLISHABLE_KEY must be set
  - STRIPE_WEBHOOK_SECRET must be set
```

#### ENABLE_TIP_JAR

```yaml
name: ENABLE_TIP_JAR
type: boolean
default: false
description: |
  Controls whether the tip jar is visible and functional.
  When false:
    - Tip jar button hidden from UI
    - Tip endpoints return 403
    - Supporters page returns 404
  When true:
    - Tip jar button visible in footer and sidebar
    - Tip endpoints functional
    - Supporters page accessible
affects:
  - Tip jar UI components
  - /api/tips/* endpoints
  - /supporters page
  - Stripe subscription management
dependencies:
  - STRIPE_SECRET_KEY must be set
  - STRIPE_PUBLISHABLE_KEY must be set
  - STRIPE_WEBHOOK_SECRET must be set
```

#### ENABLE_NOTIFICATIONS

```yaml
name: ENABLE_NOTIFICATIONS
type: boolean
default: false
description: |
  Controls the notification system.
  When false:
    - No notifications are created
    - No push notifications are sent
    - Notification bell icon hidden from header
    - Notification endpoints return empty arrays
  When true:
    - Notifications are created for all configured events
    - Push notifications sent (if user has opted in)
    - Notification bell icon visible with unread count
    - Full notification inbox functional
affects:
  - All notification creation logic
  - Push notification delivery
  - Notification bell UI component
  - /api/notifications/* endpoints
  - /notifications page
dependencies: none
```

### Feature Flag Implementation Pattern

```typescript
// lib/feature-flags.ts

export function isFeatureEnabled(flag: string): boolean {
  const value = process.env[flag];
  return value === 'true' || value === '1';
}

// Usage in API routes:
export async function POST(req: Request) {
  if (!isFeatureEnabled('ENABLE_COSMETICS_SHOP')) {
    return Response.json(
      { error: 'Feature not available', code: 'FEATURE_DISABLED' },
      { status: 403 }
    );
  }
  // ... rest of handler
}

// Usage in server components:
export default function ShopPage() {
  if (!isFeatureEnabled('ENABLE_COSMETICS_SHOP')) {
    notFound();
  }
  return <ShopContent />;
}
```

### Flag Management

- Flags are set as environment variables in Railway
- Changing a flag requires a redeployment (or Railway's hot-reload)
- All flag checks happen server-side only
- The client receives feature availability via a `/api/features` endpoint:

```typescript
// GET /api/features
// Returns which features are currently enabled
{
  "badges": true,
  "cosmetics_shop": false,
  "tip_jar": false,
  "notifications": true
}
```

---

## IMPLEMENTATION NOTES

### Database Tables Required

The gamification system requires 7 new tables and modifications to 4 existing tables. See DATA_SCHEMA.md for complete definitions.

**New Tables:**
1. `badges` - Badge catalog (all 40 badge definitions)
2. `user_badges` - Earned badges per user
3. `notifications` - In-app notification records
4. `referrals` - Referral tracking
5. `cosmetics` - Cosmetic item catalog
6. `user_cosmetics` - Purchased cosmetics per user
7. `tips` - Tip jar donation records

**Modified Tables:**
1. `users` - Add: founder_number, primary_badge, cosmetics, referred_by, referral_count
2. `community_memberships` - Add: role, role_assigned_at, role_assigned_by, activity counters
3. `communities` - Add: banner_url, icon_url, theme, ai_config
4. `ai_prompt_history` - Add: ai_config (JSONB for structured config)

### Migration Files

```
migrations/006_badges_and_user_badges.sql
migrations/007_notifications.sql
migrations/008_referrals.sql
migrations/009_cosmetics_and_user_cosmetics.sql
migrations/010_tips_and_user_updates.sql
```

### API Endpoints Required

```
# Badges
GET    /api/badges                          # List all badge definitions
GET    /api/badges/:badge_id                # Get single badge definition
GET    /api/users/:id/badges                # Get user's earned badges
PUT    /api/users/:id/primary-badge         # Set primary badge

# Notifications
GET    /api/notifications                   # Get user's notifications (paginated)
PUT    /api/notifications/:id/read          # Mark as read
PUT    /api/notifications/read-all          # Mark all as read
DELETE /api/notifications/:id               # Dismiss notification
GET    /api/notifications/preferences       # Get notification preferences
PUT    /api/notifications/preferences       # Update preferences
POST   /api/notifications/push-subscribe    # Register push subscription
DELETE /api/notifications/push-subscribe    # Unregister push subscription

# Referrals
GET    /api/referrals/link                  # Get or generate referral link
GET    /api/referrals/stats                 # Get referral count and history
GET    /api/referrals/history               # List referred users

# Cosmetics
GET    /api/cosmetics                       # List all available cosmetics
GET    /api/cosmetics/:cosmetic_id          # Get single cosmetic
POST   /api/cosmetics/checkout              # Create Stripe checkout session
GET    /api/users/:id/cosmetics             # Get user's owned cosmetics
PUT    /api/users/:id/cosmetics/active      # Set active cosmetics
POST   /api/cosmetics/:id/refund            # Request refund (within 7 days)

# Tips
POST   /api/tips/checkout                   # Create tip checkout/subscription
GET    /api/tips/subscriptions              # Get user's active tip subscriptions
DELETE /api/tips/subscriptions/:id          # Cancel recurring tip
GET    /api/supporters                      # Public list of supporters

# Stripe Webhooks
POST   /api/webhooks/stripe                 # Stripe webhook handler

# AI Config
GET    /api/communities/:id/ai-config       # Get current AI config
POST   /api/communities/:id/config-proposals # Propose config change
GET    /api/communities/:id/config-proposals # List config proposals
POST   /api/communities/:id/config-proposals/:id/vote # Vote on proposal

# Features
GET    /api/features                        # Get enabled feature flags

# Community Roles
GET    /api/communities/:id/members         # List members with roles
PUT    /api/communities/:id/members/:uid/role # Assign role (founder only)
```

### Stripe Integration Points

1. **Cosmetics Shop** - Stripe Checkout (one-time payments)
2. **Tip Jar (One-Time)** - Stripe Checkout (one-time payments)
3. **Tip Jar (Recurring)** - Stripe Subscriptions (monthly billing)
4. **Refunds** - Stripe Refunds API

**Webhook Events to Handle:**
- `checkout.session.completed` - Cosmetic purchased or one-time tip
- `invoice.paid` - Recurring tip payment
- `invoice.payment_failed` - Failed recurring tip payment
- `customer.subscription.deleted` - Recurring tip cancelled
- `charge.refunded` - Cosmetic or tip refunded

### Cron Jobs

| Job                          | Schedule       | Description                                         |
|------------------------------|----------------|-----------------------------------------------------|
| Badge eligibility check      | Hourly         | Check all users against all badge criteria           |
| Notification cleanup         | Weekly (Sun 3AM)| Delete read notifications older than 30 days        |
| Community role recalculation | Daily (2AM)    | Update active_member and lurker roles               |
| IP hash cleanup              | Daily (1AM)    | Delete IP hashes older than 30 days                 |
| Referral reversion check     | Daily (4AM)    | Check if referred accounts were banned within 7 days|

### Security Considerations

All security requirements for the gamification system are documented in SECURITY.md. Key concerns:

1. **Badge fraud** - Server-side only awarding, audit logging, feature flag toggle
2. **Cosmetic price manipulation** - Server-side price validation, Stripe handles payment
3. **Referral fraud** - IP hash checks, DB constraints, reversion for banned accounts
4. **Notification spam** - Rate limiting, batching, user-controlled preferences
5. **AI config injection** - Structured config eliminates free-form prompt attacks

### Performance Considerations

1. **Badge eligibility** - Run as background job, not on every request. Cache results.
2. **Notification inbox** - Index on (user_id, created_at DESC) WHERE read = FALSE. Paginate.
3. **Cosmetic rendering** - CSS-only cosmetics (no heavy assets). Lazy-load animations.
4. **Referral counting** - Denormalized count on users table (avoid COUNT queries).
5. **AI config** - Cache generated prompts. Only regenerate when config changes.

---

## APPENDIX A: BADGE SUMMARY TABLE

| #  | badge_id              | Name                  | Category      | Rarity    | Threshold / Criteria                |
|----|-----------------------|-----------------------|---------------|-----------|-------------------------------------|
| 1  | v1_founder            | V1 Founder            | founder       | legendary | First 5,000 users                   |
| 2  | v1_alpha_tester       | Alpha Tester          | founder       | legendary | First 100 users                     |
| 3  | v1_beta_tester        | Beta Tester           | founder       | epic      | Users #101-500                      |
| 4  | first_post            | First Flame           | engagement    | common    | 1 approved post                     |
| 5  | prolific_poster       | Prolific Poster       | engagement    | uncommon  | 50 approved posts                   |
| 6  | posting_machine       | Posting Machine       | engagement    | rare      | 500 approved posts                  |
| 7  | first_comment         | Sparked a Conversation| engagement    | common    | 1 approved comment                  |
| 8  | conversationalist     | Conversationalist     | engagement    | uncommon  | 100 approved comments               |
| 9  | discussion_veteran    | Discussion Veteran    | engagement    | rare      | 1,000 approved comments             |
| 10 | community_explorer    | Community Explorer    | engagement    | common    | 10 communities joined               |
| 11 | community_nomad       | Community Nomad       | engagement    | uncommon  | 50 communities joined               |
| 12 | night_owl             | Night Owl             | engagement    | uncommon  | 25 posts/comments 00:00-05:00 UTC   |
| 13 | streak_7              | Weekly Streak         | engagement    | common    | 7 consecutive active days           |
| 14 | streak_30             | Monthly Streak        | engagement    | rare      | 30 consecutive active days          |
| 15 | streak_365            | Annual Inferno        | engagement    | legendary | 365 consecutive active days         |
| 16 | one_year_member       | One Year Strong       | engagement    | uncommon  | 365 days since registration         |
| 17 | first_spark_received  | First Spark           | contribution  | common    | 1 spark received                    |
| 18 | spark_collector       | Spark Collector       | contribution  | uncommon  | 100 sparks received                 |
| 19 | spark_magnet          | Spark Magnet          | contribution  | rare      | 1,000 sparks received               |
| 20 | inferno_contributor   | Inferno Contributor   | contribution  | epic      | 10,000 sparks received              |
| 21 | legendary_contributor | Legendary Contributor | contribution  | legendary | 100,000 sparks received             |
| 22 | hot_post              | Hot Post              | contribution  | rare      | Single post with 100+ sparks        |
| 23 | viral_post            | Viral Post            | contribution  | epic      | Single post with 1,000+ sparks      |
| 24 | community_builder     | Community Builder     | contribution  | rare      | Created community with 100 members  |
| 25 | community_architect   | Community Architect   | contribution  | epic      | Created community with 1,000 members|
| 26 | first_vote            | Civic Duty            | governance    | common    | 1 governance vote                   |
| 27 | active_voter          | Active Voter          | governance    | uncommon  | 25 governance votes                 |
| 28 | proposal_author       | Proposal Author       | governance    | uncommon  | 1 proposal created                  |
| 29 | successful_proposer   | Successful Proposer   | governance    | rare      | 1 proposal passed                   |
| 30 | governance_champion   | Governance Champion   | governance    | epic      | 10 proposals passed                 |
| 31 | council_member        | Council Member        | governance    | rare      | Elected to category council         |
| 32 | v1_ambassador         | V1 Ambassador         | referral      | uncommon  | 5 referrals                         |
| 33 | v1_influencer         | V1 Influencer         | referral      | rare      | 25 referrals                        |
| 34 | v1_legend             | V1 Legend             | referral      | legendary | 100 referrals                       |
| 35 | first_referral        | Spark Spreader        | referral      | common    | 1 referral                          |
| 36 | supporter             | Supporter             | special       | rare      | Any tip jar donation                |
| 37 | recurring_supporter   | Recurring Supporter   | special       | epic      | Active recurring tip subscription   |
| 38 | bug_hunter            | Bug Hunter            | special       | rare      | Verified bug report (manual award)  |
| 39 | community_creator     | Community Creator     | special       | uncommon  | Created 1 approved community        |
| 40 | verified_human        | Verified Human        | special       | uncommon  | Manual verification (admin award)   |

---

## APPENDIX B: COSMETICS SUMMARY TABLE

| #  | cosmetic_id                 | Name                | Category | Subcategory | Price  |
|----|-----------------------------|---------------------|----------|-------------|--------|
| 1  | theme_lava_flow             | Lava Flow           | theme    | profile     | $4.99  |
| 2  | theme_midnight_ember        | Midnight Ember      | theme    | profile     | $4.99  |
| 3  | theme_arctic_frost          | Arctic Frost        | theme    | profile     | $4.99  |
| 4  | theme_neon_grid             | Neon Grid           | theme    | profile     | $5.99  |
| 5  | theme_forest_canopy         | Forest Canopy       | theme    | profile     | $4.99  |
| 6  | theme_void                  | The Void            | theme    | profile     | $3.99  |
| 7  | theme_community_inferno     | Community Inferno   | theme    | community   | $9.99  |
| 8  | theme_community_ocean       | Community Ocean     | theme    | community   | $9.99  |
| 9  | theme_community_terminal    | Community Terminal   | theme    | community   | $7.99  |
| 10 | border_flame_ring           | Flame Ring          | border   | profile     | $2.99  |
| 11 | border_ice_crystal          | Ice Crystal         | border   | profile     | $2.99  |
| 12 | border_gold_ornate          | Gold Ornate         | border   | profile     | $3.99  |
| 13 | border_pixel_art            | Pixel Art           | border   | profile     | $1.99  |
| 14 | border_lightning            | Lightning           | border   | profile     | $3.99  |
| 15 | border_shadow               | Shadow Aura         | border   | profile     | $2.99  |
| 16 | title_fire_starter          | Fire Starter        | title    | profile     | $1.99  |
| 17 | title_flame_keeper          | Flame Keeper        | title    | profile     | $1.99  |
| 18 | title_ember_walker          | Ember Walker        | title    | profile     | $1.99  |
| 19 | title_ash_born              | Ash Born            | title    | profile     | $1.99  |
| 20 | title_phoenix               | Phoenix             | title    | profile     | $2.99  |
| 21 | title_wildfire              | Wildfire            | title    | profile     | $3.99  |
| 22 | color_flame_orange          | Flame Orange        | color    | profile     | $1.49  |
| 23 | color_royal_purple          | Royal Purple        | color    | profile     | $1.49  |
| 24 | color_ocean_blue            | Ocean Blue          | color    | profile     | $1.49  |
| 25 | color_emerald_green         | Emerald Green       | color    | profile     | $1.49  |
| 26 | color_crimson_red           | Crimson Red         | color    | profile     | $1.49  |
| 27 | color_gold                  | Gold                | color    | profile     | $1.99  |
| 28 | color_rainbow               | Rainbow             | color    | profile     | $3.99  |
| 29 | avatar_flame_aura           | Flame Aura          | avatar   | profile     | $3.49  |
| 30 | avatar_hexagon              | Hexagon Frame       | avatar   | profile     | $2.49  |
| 31 | avatar_diamond              | Diamond Frame       | avatar   | profile     | $2.49  |
| 32 | banner_fire_landscape       | Fire Landscape      | banner   | profile     | $4.99  |
| 33 | banner_starfield            | Starfield           | banner   | profile     | $4.99  |
| 34 | banner_circuit_board        | Circuit Board       | banner   | profile     | $3.99  |
| 35 | banner_abstract_waves       | Abstract Waves      | banner   | profile     | $3.99  |
| 36 | banner_community_flames     | Community Flames    | banner   | community   | $7.99  |
| 37 | banner_community_mountains  | Community Mountains | banner   | community   | $7.99  |
| 38 | icon_flame_circle           | Flame Circle Icon   | icon     | community   | $4.99  |
| 39 | icon_shield                 | Shield Icon         | icon     | community   | $4.99  |
| 40 | icon_diamond                | Diamond Icon        | icon     | community   | $5.99  |

---

## APPENDIX C: NOTIFICATION TYPE REFERENCE

| Type               | Trigger Event                          | Push Default | Batchable |
|--------------------|----------------------------------------|--------------|-----------|
| reply_post         | New comment on user's post             | on           | no        |
| reply_comment      | Reply to user's comment                | on           | no        |
| spark              | Spark on user's post or comment        | off          | yes       |
| mention            | @username in post or comment           | on           | no        |
| community_update   | AI config change, community news       | off          | no        |
| governance         | New proposal, vote reminder, results   | off          | no        |
| badge_earned       | User earns a new badge                 | on           | no        |
| tip_received       | (Future) Direct user-to-user tip       | on           | no        |
| referral           | Referred user creates account          | on           | no        |

---

**Document Version:** 2.0
**Author:** fuega.ai team
**Last Review:** February 21, 2026
**Next Review:** Before Phase 2 implementation begins
