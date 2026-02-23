# LAUNCH PLAN — fuega.ai

**Created:** 2026-02-22
**Target:** V1 Public Launch
**Status:** Pre-launch

---

## Pre-Launch Checklist

### Technical Readiness

| Item | Status | Notes |
|------|--------|-------|
| 13 database tables created | ✅ | PostgreSQL 15+ on Railway |
| RLS policies active | ✅ | Row-level security on all tables |
| API endpoints working | ✅ | All CRUD + moderation routes |
| AI moderation functional | ✅ | Synchronous Claude API (<3s) |
| Frontend pages rendering | ✅ | Next.js 14 App Router |
| Mobile responsive | ✅ | Mobile-first design |
| Tests passing (100+) | ✅ | Vitest + React Testing Library |
| Performance targets met | ✅ | Sub-3s moderation, fast TTFB |
| Security audit passed | ✅ | See SECURITY_AUDIT.md |
| SSL/TLS configured | ✅ | Cloudflare SSL termination |
| Cloudflare WAF active | ✅ | Bot protection + rate limiting |
| Rate limiting enabled | ✅ | All endpoints rate-limited |
| Monitoring active | ✅ | See monitoring/README.md |

### Content Readiness

| Item | Status | Notes |
|------|--------|-------|
| Landing page | ✅ | With fire animations |
| About page | ✅ | Mission, values, competitor comparison |
| Security page | ✅ | Transparency on security practices |
| Terms of Service | ✅ | |
| Privacy Policy | ✅ | No tracking, no data selling |
| Content Policy | ✅ | Principles-based |
| Seed campfires created | ✅ | 5 initial campfires |
| Test campfire | ✅ | At least 1 for QA |

### Documentation

| Item | Status | File |
|------|--------|------|
| Project overview | ✅ | README.md |
| Development context | ✅ | CLAUDE.md |
| Deployment guide | ✅ | DEPLOYMENT.md |
| Security practices | ✅ | SECURITY.md |
| Data schema | ✅ | DATA_SCHEMA.md |
| Injection defenses | ✅ | INJECTION.md |
| Gamification spec | ✅ | GAMIFICATION.md |
| Launch plan | ✅ | LAUNCH.md (this file) |

### Legal & Anonymity

| Item | Status | Notes |
|------|--------|-------|
| Domain privacy (WHOIS) | ✅ | Personal info hidden |
| Anonymous GitHub org | ✅ | fuega-ai org, no personal links |
| Railway account separate | ✅ | Not linked to personal identity |
| Cloudflare account separate | ✅ | Dedicated account |
| No personal info in code/commits | ✅ | Security scrub completed |

---

## Infrastructure

```
User Request
  ↓
Cloudflare (CDN, WAF, DDoS, SSL)
  ↓
Railway (Next.js App — us-east4)
  ↓
PostgreSQL (Railway managed, daily backups)
  ↓
Anthropic API (Claude — AI moderation)
```

- **Domain:** fuega.ai
- **Repo:** github.com/fuega-ai/fuega-platform (main branch)
- **Deploy:** Push to main → Railway auto-deploy
- **Estimated cost:** ~$20-50/month (Railway) + Free (Cloudflare)

---

## Launch Sequence

### Phase 1: Soft Launch (Day 0)

1. **Create `f/fuega` meta campfire** — the platform's own discussion space
2. **Post announcement** in `f/fuega` explaining the platform, its values, and how governance works
3. **Verify all systems operational:**
   - Hit every API endpoint manually
   - Create a test post, spark/douse it
   - Trigger AI moderation on a test post
   - Check mod log entries appear correctly
   - Verify governance variable settings persist

### Phase 2: Public Announcement (Day 1)

4. **Hacker News submission:**
   ```
   Title: Show HN: fuega.ai — Campfire-governed discussions with transparent AI moderation
   URL: https://fuega.ai
   ```
   Post during weekday morning (US time) for maximum visibility.

5. **Reddit posts** (where subreddit rules allow):
   - r/opensource — open source social media
   - r/selfhosted — self-governance angle
   - r/programming — technical architecture discussion
   - r/privacy — no tracking, no ads, anonymous by default

6. **Twitter/X** (if @fuega_ai created):
   - Pin tweet: what fuega is, link to site
   - Thread: how governance variables work vs traditional moderation

7. **awesome-selfhosted submission:**
   - PR to https://github.com/awesome-selfhosted/awesome-selfhosted
   - Category: Community / Social Networks

### Phase 3: Community Building (Week 1+)

8. **Seed campfires with content** — the platform needs activity to attract users
9. **Respond to feedback in `f/fuega`** — show the community shapes the platform
10. **Track feature requests** — prioritize based on spark/douse voting
11. **Iterate on governance variables** — add new variables based on community needs

---

## First Day Monitoring

### Watch List

| Metric | Target | Action if exceeded |
|--------|--------|--------------------|
| Error rate | < 1% | Check logs, hotfix |
| API response time | < 500ms (p95) | Check Railway metrics |
| AI moderation latency | < 3s | Check Anthropic API status |
| Memory usage | < 512MB | Investigate leaks |
| Database connections | < 20 | Check connection pooling |
| Rate limit hits | Low | Adjust limits if legitimate traffic blocked |

### Monitoring Actions

- **Every 15 minutes (first 2 hours):** Check Railway dashboard, error logs, response times
- **Every hour (hours 2-12):** Review AI moderation decisions in mod log, check for false positives
- **Every 4 hours (day 1):** Review user signups, post volume, any reported issues
- **End of day 1:** Write post-launch summary, note any issues to fix

### Emergency Playbook

| Scenario | Action |
|----------|--------|
| Site down | Check Railway status → Cloudflare status → DNS propagation |
| Database overload | Enable connection pooling → Scale Railway instance |
| AI moderation failing | Check Anthropic API status → Fall back to queue-based review |
| DDoS attack | Cloudflare Under Attack mode → Review WAF rules |
| Data breach suspected | Take site offline → Audit logs → Rotate all secrets |
| Spam flood | Tighten rate limits → Review IP hashes → Adjust governance variables |

---

## Post-Launch Priorities

1. **Bug fixes** from user reports — same-day turnaround
2. **Governance variable tuning** — based on real usage patterns
3. **Performance optimization** — based on actual traffic patterns
4. **Community tools** — features the community sparks for
5. **Model-agnostic AI** — allow campfires to vote on AI provider (OpenAI, Llama, etc.)

---

## Launch Results

> *To be filled in after launch.*

### Day 1 Metrics

| Metric | Result |
|--------|--------|
| Unique visitors | — |
| Signups | — |
| Campfires created | — |
| Posts created | — |
| AI moderation actions | — |
| Errors encountered | — |
| Uptime | — |

### Key Feedback

> *To be filled in with notable feedback from HN, Reddit, and f/fuega.*

### Issues Found

> *To be filled in with any bugs or issues discovered during launch.*

### Lessons Learned

> *To be filled in after the first week.*
