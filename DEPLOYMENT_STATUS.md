# DEPLOYMENT STATUS — fuega.ai

**Generated:** 2026-02-21
**Status:** Pipeline DISCONNECTED — builder output not wired to production

---

## Current Architecture

```
fuega-site/ (LIVE)                    fuega/ (NEW — NOT DEPLOYED)
├── .git → github.com/fuega-ai/       ├── NO .git
│         fuega-ai.git (main)        ├── Next.js 14 + React 18
├── Next.js 16 + React 19            ├── Builder scripts
├── Drizzle ORM                       ├── Migrations
└── 10 commits                        └── Full app skeleton
     │
     ▼
GitHub (fuega-ai/fuega-platform)
     │
     ▼ (auto-deploy on push to main)
Railway (us-east4-eqdc4a)
     │
     ▼ (proxied)
Cloudflare (CDN + WAF + SSL)
     │
     ▼
https://fuega.ai ✅ LIVE (200 OK)
```

---

## Live Site Verification

| Check | Status | Detail |
|-------|--------|--------|
| HTTPS | ✅ | SSL termination via Cloudflare |
| Cloudflare | ✅ | CF-RAY from ORD edge, proxy active |
| Railway | ✅ | x-railway-edge: us-east4-eqdc4a |
| CDN | ✅ | Fastly (Railway CDN) + Cloudflare |
| Next.js | ✅ | x-nextjs-cache: HIT, prerender active |
| Response | ✅ | 200 OK, text/html |

## Git & Deployment Details

### fuega-site (current production)
- **Repo:** https://github.com/fuega-ai/fuega-platform.git
- **Branch:** main (clean, up to date)
- **Latest commit:** 96abbcc — "Widen desktop layout"
- **Deploy trigger:** Push to main → Railway auto-deploy

### fuega (builder project)
- **Repo:** NONE — git not initialized
- **Railway link:** NONE
- **Action needed:** Initialize git + connect to deployment pipeline

## Railway

- **CLI:** Installed at `railway (npm global)`
- **Linked project:** Not linked in fuega/ (workspace: "fuega workspace" available)
- **Auto-deploy:** Active on fuega-site via GitHub integration

## Cloudflare

- **Domain:** fuega.ai → proxied through Cloudflare
- **Edge:** ORD (Chicago)
- **SSL:** Full (strict) — working
- **WAF:** Active (Cloudflare headers present)

## Environment Variables

### fuega-site/.env.local
- DATABASE_URL ✅ (Railway PostgreSQL: crossover.proxy.rlwy.net:19693)
- ELEVENLABS_API_KEY ✅
- PEXELS_API_KEY ✅
- GOOGLE_MAPS_API_KEY ✅
- JWT_SECRET ✅ (weak — "change-this-to-a-random-secret-in-production")
- ADMIN_PASSWORD ⚠️ (MUST be rotated before production)

### fuega/.env
- ANTHROPIC_API_KEY ✅
- DATABASE_URL ⚠️ (localhost — not Railway)
- JWT_SECRET ✅ (strong random value)
- IP_SALT ✅
- Various API keys ✅

---

## Action Required

To connect the builder to production:

### Option 1: Replace current site (recommended for full rebuild)
```bash
cd /path/to/fuega
git init
git remote add origin https://github.com/fuega-ai/fuega-platform.git
git add .
git commit -m "v2: AI-moderated discussion platform"
git push --force origin main
# Railway auto-deploys from main
```

### Option 2: New repo (keep current site intact)
```bash
cd /path/to/fuega
git init
git remote add origin https://github.com/fuega-ai/fuega-platform-v2.git
git add .
git commit -m "Initial commit: fuega.ai v2"
git push -u origin main
# Then link new repo in Railway dashboard
```

### Option 3: Branch-based (test before replacing)
```bash
cd /path/to/fuega
git init
git remote add origin https://github.com/fuega-ai/fuega-platform.git
git checkout -b v2-rebuild
git add .
git commit -m "v2: AI-moderated discussion platform"
git push -u origin v2-rebuild
# Preview on Railway, then merge to main when ready
```

---

## Tech Stack Differences

| | fuega-site (live) | fuega (new) |
|---|---|---|
| Next.js | 16.1.6 | 14.2.21 |
| React | 19.2.3 | 18.3.1 |
| ORM | Drizzle | Raw pg |
| Tailwind | 4.x | 3.4.x |
| Auth | jose | jsonwebtoken + bcrypt |
| Testing | none | Vitest + Playwright |
| AI | none | Anthropic SDK |
