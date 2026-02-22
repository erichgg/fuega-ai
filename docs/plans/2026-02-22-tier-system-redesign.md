# Tier System Redesign: Category → Community → Cohort

## Summary
Replace the vague "community → category → platform" three-tier system with a clear four-tier hierarchy that maps to how people actually organize online.

## New Hierarchy (top → bottom)

| Tier | Scope | Example | Governance |
|------|-------|---------|------------|
| **Platform** | Site-wide | fuega.ai | Which AI APIs are available, site-wide rules, platform amendments |
| **Category** | Broad topic | Politics, Food, Gaming | Category-wide standards, cross-community disputes, API selection within category |
| **Community** | Specific group | f\|politics\|democrats | Community rules, AI prompt config, mod decisions |
| **Cohort** | Hyper-niche | f\|politics\|democrats\|dsa-illinois | Cohort-specific rules layered on top of community rules |

## Display Format
- Category: `f | politics`
- Community: `f | politics | democrats`
- Cohort: `f | politics | democrats | dsa illinois`

## URL Format
- `/f/politics`
- `/f/politics/democrats`
- `/f/politics/democrats/dsa-illinois`

## Key Decisions
- Categories are NOT optional — every community belongs to a category
- Cohorts ARE optional — communities can exist without cohorts
- Each tier has its own AI agent config and governance votes
- Platform tier decides which AI APIs are available site-wide
- Categories decide which APIs are used within their scope
- Communities configure their specific AI prompt
- Cohorts can add additional rules on top of their community's rules

## Anti-Bot (Critical)
Bots can destroy the entire democratic framework. Anti-bot measures must be embedded at every tier:
- Rate limiting on all voting endpoints
- Behavioral analysis on voting patterns
- Community reporting mechanisms
- Progressive trust scoring (new accounts have limited voting power)
- CAPTCHA on governance votes

## Old → New Terminology Map
| Old | New |
|-----|-----|
| community (as tier name) | category, community, or cohort depending on level |
| category (as tier name) | category (now the broadest tier, not middle) |
| agent_level: 'community' | agent_level: 'community' (same, but now mid-tier) |
| agent_level: 'category' | agent_level: 'category' (same, but now broadest) |
| agent_level: 'platform' | agent_level: 'platform' (unchanged) |
| N/A | agent_level: 'cohort' (new, most specific) |

## DB Changes Needed
- Add `cohorts` table
- Add `cohort_id` to relevant tables (posts, comments)
- Update agent_level CHECK constraint to include 'cohort'
- Update community_categories relationship
