# FUEGA.AI - DEPLOYMENT GUIDE

**Last Updated:** February 21, 2026
**Environment:** Production
**Infrastructure:** Railway + Cloudflare + PostgreSQL

---

## DEPLOYMENT ARCHITECTURE

```
User
  ↓
Cloudflare (CDN, WAF, DDoS Protection)
  ↓
Railway (Backend API + Frontend)
  ↓
PostgreSQL (Managed Database)
  ↓
Anthropic API (AI Moderation)
```

---

## INFRASTRUCTURE OVERVIEW

### Railway
- **Purpose:** Host backend API and frontend
- **Pricing:** Pay-as-you-go, ~$20-50/month for v1
- **Services:**
  - Web service (Next.js/Express)
  - PostgreSQL addon
  - Redis addon (for caching/rate limiting)

### Cloudflare
- **Purpose:** CDN, WAF, DDoS protection, DNS
- **Pricing:** Free tier sufficient for v1
- **Features:**
  - Global CDN
  - SSL/TLS encryption
  - Rate limiting
  - Bot protection
  - Analytics

### PostgreSQL
- **Purpose:** Primary database
- **Hosting:** Railway managed PostgreSQL
- **Version:** 15+
- **Backup:** Automated daily backups

### External APIs
- **Anthropic Claude API** - AI moderation
- **Cloudflare Images** (optional) - Image hosting

---

## PRE-DEPLOYMENT CHECKLIST

### Domain Setup
- [ ] Purchase domain: fuega.ai (done)
- [ ] Transfer DNS to Cloudflare
- [ ] Enable DNSSEC
- [ ] Configure CAA records

### Account Creation
- [ ] Railway account (burner email)
- [ ] Cloudflare account (burner email)
- [ ] Anthropic API account
- [ ] GitHub organization (anonymous)

### Repository Preparation
- [ ] Clean git history (BFG Repo-Cleaner)
- [ ] Remove personal info from code
- [ ] Create .env.example (no secrets)
- [ ] Write README.md (setup instructions)

---

## STEP-BY-STEP DEPLOYMENT

### PHASE 1: Database Setup

#### 1.1 Create PostgreSQL on Railway
```bash
# In Railway dashboard:
1. New Project → Add PostgreSQL
2. Note the DATABASE_URL
3. Enable automatic backups
4. Set connection limit: 100
```

#### 1.2 Initialize Database Schema
```bash
# Connect to Railway database
psql $DATABASE_URL

# Run schema creation
\i DATA_SCHEMA.sql

# Verify tables created
\dt

# Create indexes
\i indexes.sql

# Apply RLS policies
\i rls_policies.sql

# Create initial data
INSERT INTO categories (name, description, ai_prompt) VALUES
  ('general', 'General discussion', 'Default category moderation prompt'),
  ('technology', 'Technology and programming', 'Tech-focused moderation'),
  ('politics', 'Political discussion', 'Politics moderation with civility rules');
```

#### 1.3 Database Security
```sql
-- Create app user with limited permissions
CREATE USER app_user WITH PASSWORD 'STRONG_GENERATED_PASSWORD';
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Create read-only user for analytics
CREATE USER analytics_user WITH PASSWORD 'DIFFERENT_PASSWORD';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_user;

-- Enable SSL requirement
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_min_protocol_version = 'TLSv1.3';
```

### PHASE 2: Backend Deployment

#### 2.1 Prepare Backend Code
```bash
# Project structure
/fuega-backend
  /src
    /routes       # API endpoints
    /middleware   # Auth, validation, rate limiting
    /services     # Business logic
    /models       # Database models
    /utils        # Helpers
  /tests          # Unit & integration tests
  package.json
  Dockerfile      # Railway deployment
  .env.example    # Template for environment variables
```

#### 2.2 Environment Variables (Railway)
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/db
DATABASE_POOL_SIZE=20

# API Keys
ANTHROPIC_API_KEY=sk-ant-xxxxx
JWT_SECRET=random_256_bit_secret
IP_SALT=random_256_bit_salt

# App Config
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://fuega.ai
CORS_ORIGIN=https://fuega.ai

# Security
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=86400
RATE_LIMIT_WINDOW=3600

# AI Config
AI_MODEL=claude-sonnet-4
AI_MAX_TOKENS=1000
AI_TEMPERATURE=0
```

#### 2.3 Deploy Backend to Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to project
railway link

# Deploy
railway up

# View logs
railway logs

# Get deployment URL
railway domain
```

#### 2.4 Backend Health Check
```bash
# Test API
curl https://api.fuega.ai/health

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "ai_api": "reachable",
  "version": "1.0.0"
}
```

### PHASE 3: Frontend Deployment

#### 3.1 Prepare Frontend Code
```bash
# Project structure
/fuega-frontend
  /app              # Next.js 14 app directory
    /page.tsx       # Homepage
    /login          # Auth pages
    /f/[community]  # Community pages
    /post/[id]      # Post detail
  /components       # Reusable UI components
  /lib              # Utilities
  /public           # Static assets
  next.config.js
  package.json
```

#### 3.2 Frontend Environment Variables
```bash
NEXT_PUBLIC_API_URL=https://api.fuega.ai
NEXT_PUBLIC_SITE_URL=https://fuega.ai
```

#### 3.3 Build & Deploy
```bash
# Build for production
npm run build

# Deploy to Railway
railway up

# Or deploy to Vercel (alternative)
vercel deploy --prod
```

### PHASE 4: Cloudflare Configuration

#### 4.1 DNS Setup
```dns
# A Records
api.fuega.ai    → Railway API IP (proxied)
fuega.ai        → Railway Frontend IP (proxied)
www.fuega.ai    → CNAME to fuega.ai (proxied)

# CAA Records (certificate authority authorization)
fuega.ai        → 0 issue "letsencrypt.org"
fuega.ai        → 0 issuewild "letsencrypt.org"
```

#### 4.2 SSL/TLS Configuration
```yaml
Settings → SSL/TLS:
  Encryption Mode: Full (strict)
  Always Use HTTPS: On
  Automatic HTTPS Rewrites: On
  Minimum TLS Version: 1.3
  TLS 1.3: Enabled
  Opportunistic Encryption: On
```

#### 4.3 WAF Rules
```yaml
Security → WAF:
  # Block known bad bots
  - (cf.client.bot) and not (cf.verified_bot_category in {"Search Engine Crawler" "Academic Research"})

  # Rate limit login attempts
  - (http.request.uri.path contains "/api/auth/login") and (rate(5/15m))

  # Block SQL injection patterns
  - (http.request.uri.query contains "union select" or
     http.request.body contains "union select")

  # Challenge suspicious user agents
  - (http.user_agent contains "curl" or
     http.user_agent contains "wget") and
     not (ip.src in $trusted_ips)
```

#### 4.4 Rate Limiting Rules
```yaml
Security → Rate Limiting:
  Rule 1: Login Protection
    - Path: /api/auth/login
    - Requests: 5 per 15 minutes
    - Action: Block

  Rule 2: Signup Protection
    - Path: /api/auth/signup
    - Requests: 1 per hour
    - Action: Block

  Rule 3: API General
    - Path: /api/*
    - Requests: 1000 per hour
    - Action: Challenge

  Rule 4: AI Moderation
    - Path: /api/moderate
    - Requests: 50 per hour
    - Action: Block
```

#### 4.5 Page Rules
```yaml
Rules → Page Rules:
  # Cache static assets aggressively
  fuega.ai/_next/static/*
    - Browser Cache TTL: 1 year
    - Edge Cache TTL: 1 year
    - Cache Level: Cache Everything

  # Don't cache API responses
  api.fuega.ai/*
    - Cache Level: Bypass
```

#### 4.6 Security Headers
```yaml
# Via Cloudflare Workers or Backend
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### PHASE 5: Monitoring & Logging

#### 5.1 Railway Metrics
```bash
# Built-in metrics
railway metrics

# Custom monitoring
1. CPU usage < 80%
2. Memory usage < 80%
3. Response time < 500ms
4. Error rate < 1%
```

#### 5.2 Database Monitoring
```sql
-- Create monitoring queries
-- Slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Table sizes
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### 5.3 Application Logging
```javascript
// Use structured logging
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log important events
logger.info('User created', { username: user.username });
logger.error('AI moderation failed', { error: err.message, post_id: post.id });
```

#### 5.4 Alerts Configuration
```yaml
# Railway Alerts
CPU Usage: > 80% for 5 minutes → Email
Memory Usage: > 80% for 5 minutes → Email
Deploy Failed: Immediate → Email

# Database Alerts
Connection Count: > 80 → Email
Slow Queries: > 1s → Log
Disk Space: > 80% → Email

# Application Alerts
Failed Logins: > 100/min → PagerDuty
AI API Errors: > 10% in 5min → PagerDuty
Moderation Backlog: > 100 posts → Email
```

### PHASE 6: Backup & Disaster Recovery

#### 6.1 Database Backups
```bash
# Automated backups (Railway)
- Frequency: Daily at 2AM UTC
- Retention: 30 days
- Encryption: AES-256

# Manual backup
pg_dump -U app_user -h railway.host -d fuega_db > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -U app_user -h railway.host -d fuega_db < backup_20260221.sql
```

#### 6.2 Backup Strategy
```yaml
Backup Levels:
  Full: Daily (entire database)
  Incremental: Every 6 hours (changes only)
  WAL: Continuous (point-in-time recovery)

Storage:
  Primary: Railway automatic backups
  Secondary: S3 bucket (encrypted)
  Tertiary: Local encrypted backups (kept 7 days)
```

#### 6.3 Disaster Recovery Plan
```yaml
Scenario 1: Database Corruption
  1. Stop application (prevent more writes)
  2. Restore from latest backup
  3. Apply WAL logs (recover to latest state)
  4. Verify data integrity
  5. Resume application

  RTO: 4 hours
  RPO: 6 hours (incremental backup frequency)

Scenario 2: Railway Outage
  1. Switch DNS to backup provider
  2. Deploy from git to backup infrastructure
  3. Restore database from S3
  4. Update environment variables
  5. Test and go live

  RTO: 8 hours
  RPO: 6 hours

Scenario 3: Complete Data Loss
  1. Restore from S3 backup
  2. Notify users of data loss window
  3. Implement fixes to prevent recurrence
  4. Post-mortem and transparency report

  RTO: 24 hours
  RPO: 24 hours (daily backup)
```

---

## SCALING STRATEGY

### Vertical Scaling (0-25K users)
```yaml
Railway Plan Upgrades:
  0-1K users: Starter ($5/month)
    - 512MB RAM
    - 0.5 vCPU
    - 1GB Database

  1K-5K users: Developer ($20/month)
    - 1GB RAM
    - 1 vCPU
    - 5GB Database

  5K-25K users: Team ($50/month)
    - 2GB RAM
    - 2 vCPU
    - 20GB Database
```

### Horizontal Scaling (25K+ users)
```yaml
Phase 1: Read Replicas
  - Add PostgreSQL read replicas
  - Route SELECT queries to replicas
  - Keep writes on primary

Phase 2: Caching Layer
  - Redis for session storage
  - Cache hot posts/communities
  - Cache karma calculations

Phase 3: Separate Services
  - API Gateway
  - Auth Service
  - Moderation Service
  - Content Service

Phase 4: Geographic Distribution
  - Deploy to multiple regions
  - Use Cloudflare Load Balancer
  - Geo-replicate database
```

### Database Scaling
```sql
-- Add read replica
-- (Railway automatic)

-- Partition large tables
CREATE TABLE posts_2026 PARTITION OF posts
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Archive old data
-- Move posts >1 year old to cold storage
INSERT INTO posts_archive SELECT * FROM posts
WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM posts
WHERE created_at < NOW() - INTERVAL '1 year';
```

---

## ROLLBACK PROCEDURES

### Code Rollback
```bash
# Railway automatic rollback
railway rollback

# Manual rollback
git revert HEAD
git push origin main
railway up

# Rollback to specific version
railway deploy --version v1.2.3
```

### Database Rollback
```sql
-- Never rollback database schema in production
-- Instead: Use forward-only migrations

-- If absolutely necessary:
-- 1. Backup current state
pg_dump > emergency_backup.sql

-- 2. Restore previous backup
psql < backup_before_migration.sql

-- 3. Apply fixes forward
psql < fix_migration.sql
```

### Rollback Decision Tree
```
Migration Failed?
  ├─ Data corrupted?
  │    └─ YES → Full restore from backup
  │    └─ NO → Continue ↓
  ├─ Application broken?
  │    └─ YES → Code rollback
  │    └─ NO → Continue ↓
  └─ Minor issues?
       └─ Fix forward, monitor
```

---

## SECURITY HARDENING

### Railway Security
```yaml
Settings:
  - Private Networking: Enabled (v1.0+)
  - IP Allowlist: Configure for admin access
  - Environment Variables: Encrypted
  - Deploy Hooks: Enabled (run tests before deploy)
```

### PostgreSQL Hardening
```sql
-- Disable remote root login
ALTER USER postgres WITH NOLOGIN;

-- Force SSL connections
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_min_protocol_version = 'TLSv1.3';

-- Connection limits
ALTER ROLE app_user CONNECTION LIMIT 50;

-- Audit logging
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_statement = 'all';
```

### Secrets Management
```bash
# Use Railway secrets (encrypted at rest)
railway variables set ANTHROPIC_API_KEY=sk-ant-xxx
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set IP_SALT=$(openssl rand -base64 32)

# Never commit secrets to git
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

---

## DEPLOYMENT WORKFLOWS

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        uses: railway/cli@v2
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN }}
        run: railway up
```

### Release Process
```yaml
1. Feature Development (feature/xxx branch)
2. Code Review (PR to main)
3. Automated Tests (GitHub Actions)
4. Merge to main
5. Auto-deploy to production (Railway)
6. Smoke tests (automated)
7. Monitor for 1 hour
8. Tag release (git tag v1.x.x)
```

---

## MAINTENANCE WINDOWS

### Regular Maintenance
```yaml
Schedule:
  Weekly: Sunday 2AM-4AM UTC
    - Database cleanup (delete old IPs, etc.)
    - Log rotation
    - Cache clear

  Monthly: First Sunday 2AM-6AM UTC
    - Database optimization (VACUUM, REINDEX)
    - Dependency updates
    - Security patches

  Quarterly: First Sunday of quarter, 2AM-8AM UTC
    - Major version upgrades
    - Database migrations
    - Infrastructure changes
```

### Maintenance Procedures
```sql
-- Weekly cleanup (automated cron job)
-- Delete old IP hashes
UPDATE users SET ip_address_hash = NULL
WHERE ip_last_seen < NOW() - INTERVAL '30 days';

-- Anonymize old votes
UPDATE votes SET user_id = gen_random_uuid(), anonymized = TRUE
WHERE created_at < NOW() - INTERVAL '24 hours' AND anonymized = FALSE;

-- Monthly optimization
VACUUM ANALYZE;
REINDEX DATABASE fuega_db;

-- Update statistics
ANALYZE;
```

---

## COST OPTIMIZATION

### Current Costs (Estimated)
```yaml
Month 1 (100 users):
  Railway: $5/month
  Cloudflare: $0 (free tier)
  Anthropic API: $20/month (1000 moderation calls)
  Total: ~$25/month

Month 6 (25K users):
  Railway: $50/month
  Cloudflare: $0 (still free)
  Anthropic API: $200/month (25K moderation calls)
  Total: ~$250/month
```

### Cost Reduction Strategies
```yaml
1. Cache AI decisions (24h)
   - Reduces API calls by ~30%

2. Optimize database queries
   - Proper indexes reduce CPU usage

3. Compress images
   - Reduce bandwidth costs

4. Use CDN effectively
   - Cloudflare caches static assets

5. Lazy load AI moderation
   - Only moderate when post gets engagement
```

---

## DOCUMENTATION

### For Developers
```markdown
# /docs/API.md
- API endpoint documentation
- Authentication flow
- Rate limiting rules
- Example requests/responses

# /docs/ARCHITECTURE.md
- System architecture diagrams
- Database schema
- Service dependencies
- Data flow

# /docs/CONTRIBUTING.md
- Code style guide
- PR process
- Testing requirements
- Security guidelines
```

### For Users
```markdown
# /docs/USER_GUIDE.md
- How to create an account
- How to create a community
- How AI moderation works
- Governance explained

# /docs/FAQ.md
- Common questions
- Troubleshooting
- Privacy FAQ
- Security FAQ
```

---

## POST-DEPLOYMENT CHECKLIST

### Day 1
- [ ] All services healthy
- [ ] SSL certificates valid
- [ ] DNS propagated
- [ ] Cloudflare WAF active
- [ ] Backups running
- [ ] Monitoring alerts configured
- [ ] Smoke tests passed

### Week 1
- [ ] No critical bugs reported
- [ ] Performance metrics within targets
- [ ] Security scan completed
- [ ] User feedback collected
- [ ] Documentation complete

### Month 1
- [ ] First 100 users onboarded
- [ ] AI moderation accuracy validated
- [ ] Cost within budget
- [ ] No security incidents
- [ ] Community culture healthy

---

## EMERGENCY CONTACTS

```yaml
Platform Team:
  Primary: [Encrypted Contact Method]
  Secondary: [Alternative Contact]

External Support:
  Railway: support@railway.app
  Cloudflare: Enterprise support (upgrade if needed)
  Anthropic: support@anthropic.com

Security:
  Bug Reports: security@fuega.ai
  PGP Key: [Published on keyserver]
```

---

## VERSION HISTORY

```
v1.0.0 - 2026-02-21
  - Initial deployment
  - Basic features live
  - 100 alpha users

v1.1.0 - TBD
  - Performance optimizations
  - Bug fixes
  - Additional communities

v2.0.0 - TBD
  - Badge system (Founder, Trailblazer, Spark Lord, etc.)
  - Cosmetics shop (Stripe integration)
  - Tip jar for community creators
  - Notification system (in-app + push)
  - Referral system with tracking
  - Role-based access (Founder, Trailblazer, Ember, Citizen)
  - iOS app (post-web launch)
```

---

## V2 DEPLOYMENT ADDITIONS

The following sections document V2-specific deployment configurations, including
the badge system, cosmetics shop, tip jar, notification system, referral tracking,
Stripe integration, iOS app deployment, and updated monitoring and backup strategies.

---

## GIT WORKFLOW

### Development Workflow
```bash
# Development workflow
cd /path/to/fuega
git add .
git commit -m "descriptive message"
git push origin main
```

### Branch Strategy
- **Main branch:** `main` (production)
- **Auto-deploy on push to main** -- Railway watches the `main` branch
- **No staging environment for V1** -- Railway auto-deploy handles production directly
- All code merged to `main` triggers an automatic Railway deployment
- Feature branches should be short-lived and merged via pull request when possible

### Commit Message Conventions
```bash
# Format: type: description
# Examples:
git commit -m "feat: add badge distribution cron job"
git commit -m "fix: correct Spark score calculation overflow"
git commit -m "chore: update dependencies"
git commit -m "docs: add V2 deployment sections"
git commit -m "refactor: extract notification service"
git commit -m "test: add cosmetics purchase flow tests"
```

### Deployment Flow
```
Developer pushes to main
  ↓
Railway detects push (webhook)
  ↓
Railway runs release command (migrations)
  ↓
Railway builds Next.js app
  ↓
Railway deploys new version
  ↓
Health check verifies deployment
  ↓
Old version decommissioned
```

### Rollback via Git
```bash
# If a bad deploy goes out, revert the commit and push
git revert HEAD
git push origin main
# Railway will auto-deploy the reverted state

# For multiple bad commits
git revert HEAD~3..HEAD
git push origin main
```

---

## V2 ENVIRONMENT VARIABLES

These variables extend the existing environment variables defined in Section 2.2.
Add them to Railway via `railway variables set` or the Railway dashboard.

### Feature Flags
```bash
# Feature Flags — control V2 feature rollout
ENABLE_BADGE_DISTRIBUTION=false  # Toggle badge awarding (test mode default)
ENABLE_COSMETICS_SHOP=true       # Cosmetic shop visibility
ENABLE_TIP_JAR=true              # Tip jar visibility
ENABLE_NOTIFICATIONS=true         # Notification system active
```

**Feature flag behavior:**
- When `ENABLE_BADGE_DISTRIBUTION=false`, badge eligibility checks run but do not
  award badges. This allows testing the eligibility logic without distributing
  real badges. Set to `true` when ready for production badge awarding.
- When `ENABLE_COSMETICS_SHOP=false`, the cosmetics shop page returns a
  "Coming Soon" placeholder. API endpoints for purchases return 503.
- When `ENABLE_TIP_JAR=false`, the tip button is hidden on all community and
  user profile pages. Stripe tip endpoints return 503.
- When `ENABLE_NOTIFICATIONS=false`, no notifications are created or sent.
  The notification bell icon shows as disabled in the UI.

### Stripe Configuration
```bash
# Stripe (for cosmetics shop + tip jar)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Stripe key management:**
- Use `sk_test_...` and `pk_test_...` keys during development and testing
- Switch to `sk_live_...` and `pk_live_...` for production
- `STRIPE_WEBHOOK_SECRET` is obtained from Stripe Dashboard when registering the
  webhook endpoint (see Stripe Webhook Setup section below)
- Store all Stripe keys in Railway environment variables (encrypted at rest)
- NEVER commit Stripe keys to git -- they must only exist in Railway secrets
- Rotate keys immediately if any suspected compromise

### Badge System Configuration
```bash
# Badge System
FOUNDER_BADGE_COUNT=0  # Tracks next founder number to assign (0-5000)
```

**FOUNDER_BADGE_COUNT behavior:**
- This counter tracks how many Founder badges have been assigned
- Range: 0 to 5000 (Founder badge is limited to first 5000 users)
- Each Founder badge is numbered (e.g., "Founder #0042")
- The counter increments atomically in the database, not via this env var
- The env var serves as an initial seed value on first deployment
- Once badges start distributing, the database `badge_counter` table is the
  source of truth, not this environment variable
- After all 5000 Founder badges are distributed, the system stops awarding them
  automatically regardless of this value

### Push Notification Configuration
```bash
# Push Notifications (Web Push API)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:notifications@fuega.ai
```

**VAPID key generation:**
```bash
# Generate VAPID keys using web-push library
npx web-push generate-vapid-keys

# Example output:
# Public Key: BNbxGYNMhEIi2FnSMBPKx0iOjl-Vm...
# Private Key: T1PQEb3FnSMBPKx0iOjl-VmGtNx...

# Set in Railway
railway variables set VAPID_PUBLIC_KEY="BNbxGYNMhEIi2FnSMBPKx0iOjl-Vm..."
railway variables set VAPID_PRIVATE_KEY="T1PQEb3FnSMBPKx0iOjl-VmGtNx..."
railway variables set VAPID_SUBJECT="mailto:notifications@fuega.ai"
```

**VAPID key requirements:**
- `VAPID_PUBLIC_KEY` is shared with the client (exposed in frontend code)
- `VAPID_PRIVATE_KEY` must remain server-side only -- NEVER expose to clients
- `VAPID_SUBJECT` must be a `mailto:` URI or an `https:` URL
- Keys are used for Web Push API authentication (RFC 8292)
- Keys do not expire but should be rotated if compromised
- Rotating keys will invalidate all existing push subscriptions -- users will
  need to re-subscribe to notifications

### Complete V2 Environment Variable Reference
```bash
# === V1 Variables (existing) ===
DATABASE_URL=postgresql://user:pass@host:port/db
DATABASE_POOL_SIZE=20
ANTHROPIC_API_KEY=sk-ant-xxxxx
JWT_SECRET=random_256_bit_secret
IP_SALT=random_256_bit_salt
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://fuega.ai
CORS_ORIGIN=https://fuega.ai
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=86400
RATE_LIMIT_WINDOW=3600
AI_MODEL=claude-sonnet-4
AI_MAX_TOKENS=1000
AI_TEMPERATURE=0

# === V2 Variables (new) ===
# Feature Flags
ENABLE_BADGE_DISTRIBUTION=false
ENABLE_COSMETICS_SHOP=true
ENABLE_TIP_JAR=true
ENABLE_NOTIFICATIONS=true

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Badge System
FOUNDER_BADGE_COUNT=0

# Push Notifications
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:notifications@fuega.ai
```

---

## RAILWAY CONFIGURATION UPDATES (V2)

### Stripe Webhook Endpoint
```yaml
Endpoint: POST /api/webhooks/stripe
  - Must be publicly accessible (no auth middleware)
  - Stripe signature verification handles authentication
  - See "Stripe Webhook Setup" section for full configuration
  - Endpoint must respond within 30 seconds or Stripe will retry
  - Railway auto-SSL provides the HTTPS requirement
```

### Cron Jobs via Railway Cron Service

Railway supports cron jobs as separate services within the same project.
Each cron job runs as its own service with its own schedule.

#### Badge Eligibility Check
```yaml
Service Name: cron-badge-eligibility
Schedule: "0 * * * *"  # Every hour
Command: npm run cron:badge-check
Condition: Only runs when ENABLE_BADGE_DISTRIBUTION=true

Logic:
  1. Query users who meet badge eligibility criteria
  2. Check if user already has the badge
  3. Award badge if eligible and not already awarded
  4. Log badge distribution to moderation_logs table
  5. Send notification to user (if ENABLE_NOTIFICATIONS=true)

Badge Eligibility Criteria:
  - Founder: First 5000 registered users (auto-assigned at registration)
  - Trailblazer: 30+ days active, 100+ Spark score, 10+ posts
  - Spark Lord: 1000+ total Sparks received across all posts
  - Community Builder: Created a community with 50+ members
  - Ember: Default role for all registered users
  - Citizen: Verified email + 7 days account age

Performance:
  - Query should complete in <10 seconds
  - Process badges in batches of 100 users
  - Use database transactions for atomic badge assignment
  - Skip users already checked in the current hour (cached in Redis)
```

#### Notification Cleanup
```yaml
Service Name: cron-notification-cleanup
Schedule: "0 3 * * 0"  # Weekly, Sunday at 3AM UTC
Command: npm run cron:notification-cleanup

Logic:
  1. Delete read notifications older than 30 days
  2. Delete unread notifications older than 90 days
  3. Vacuum the notifications table
  4. Log cleanup statistics

SQL:
  DELETE FROM notifications
  WHERE read_at IS NOT NULL
  AND read_at < NOW() - INTERVAL '30 days';

  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '90 days';

  -- Soft delete is NOT used for notifications (ephemeral data)
  -- This is an exception to the soft-delete rule because notifications
  -- are ephemeral by nature and do not need audit trails
```

#### Vote Anonymization
```yaml
Service Name: cron-vote-anonymization
Schedule: "0 4 * * *"  # Daily at 4AM UTC
Command: npm run cron:vote-anonymize

Logic:
  1. Find votes older than 24 hours that are not yet anonymized
  2. Replace user_id with a random UUID
  3. Set anonymized = TRUE
  4. Log count of anonymized votes

SQL:
  UPDATE votes
  SET user_id = gen_random_uuid(), anonymized = TRUE
  WHERE created_at < NOW() - INTERVAL '24 hours'
  AND anonymized = FALSE;

Security Note:
  - This ensures Spark/Douse votes cannot be traced back to users
  - The 24-hour window allows for fraud detection before anonymization
  - Once anonymized, the vote is permanent and cannot be un-anonymized
```

#### IP Hash Cleanup
```yaml
Service Name: cron-ip-cleanup
Schedule: "0 5 * * *"  # Daily at 5AM UTC
Command: npm run cron:ip-cleanup

Logic:
  1. Null out IP hashes older than 30 days
  2. Delete entries from ip_hashes table older than 30 days
  3. Log cleanup statistics

SQL:
  UPDATE users SET ip_address_hash = NULL
  WHERE ip_last_seen < NOW() - INTERVAL '30 days';

  DELETE FROM ip_hashes
  WHERE created_at < NOW() - INTERVAL '30 days';

Security Note:
  - MANDATORY: IP data must be deleted after 30 days (privacy requirement)
  - This is a NON-NEGOTIABLE security rule from SECURITY.md
  - If this cron fails, it MUST be treated as a P0 incident
  - Monitor this job closely -- failure means privacy violation
```

#### Role Auto-Assignment
```yaml
Service Name: cron-role-assignment
Schedule: "0 6 * * *"  # Daily at 6AM UTC
Command: npm run cron:role-assign

Logic:
  1. Check all users for role upgrade eligibility
  2. Upgrade Ember → Citizen (verified email + 7 days)
  3. Upgrade Citizen → Trailblazer (meets criteria)
  4. Award corresponding role badges
  5. Send notification on role upgrade

Role Hierarchy:
  Ember (default) → Citizen → Trailblazer → (Founder is separate, limited)

Permissions per Role:
  Ember: Read, Spark/Douse, comment
  Citizen: + create posts, join communities
  Trailblazer: + create communities, propose AI agent prompts
  Founder: All Trailblazer permissions + Founder badge display
```

### Database Migration Release Command
```bash
# railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "releaseCommand": "npm run migrate",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 30
  }
}
```

```bash
# Alternative: Procfile
release: npm run migrate
web: npm start
```

**Migration release command behavior:**
- Railway runs the release command BEFORE starting the new version
- If the release command (migration) fails, the deploy is aborted
- The old version continues running -- no downtime on failed migration
- Migrations must be backwards-compatible (old code must work with new schema)
- This means: add columns as nullable first, then backfill, then add constraints

### Health Check Endpoint
```yaml
Endpoint: GET /api/health
Timeout: 30 seconds
Expected Response (200 OK):
  {
    "status": "healthy",
    "database": "connected",
    "ai_api": "reachable",
    "stripe": "connected",
    "notifications": "active",
    "version": "2.0.0",
    "features": {
      "badges": true,
      "cosmetics": true,
      "tips": true,
      "notifications": true
    }
  }

Failure Response (503):
  {
    "status": "unhealthy",
    "database": "disconnected",
    "error": "connection timeout"
  }
```

**Health check implementation notes:**
- The health check must complete within 30 seconds or Railway considers the
  deploy failed and rolls back automatically
- Check database connectivity with a simple `SELECT 1` query
- Check Anthropic API reachability with a lightweight ping (do not send a
  full moderation request -- that would be wasteful)
- Check Stripe API connectivity with a `stripe.balance.retrieve()` call
- Report feature flag status so monitoring dashboards can verify flags
- Do NOT include sensitive information in health check responses
- Health check endpoint should NOT require authentication

---

## V2 MONITORING METRICS

These metrics extend the existing monitoring configuration in Phase 5.
Add these to the Railway metrics dashboard and alert configuration.

### Badge System Metrics
```yaml
Badge Distribution Rate:
  Metric: badges_awarded_per_hour
  Description: Number of badges awarded in the last rolling hour
  Alert: > 100 badges/hour (unusual spike, possible bug)
  Alert: 0 badges/hour for 24h when ENABLE_BADGE_DISTRIBUTION=true (stalled)
  Dashboard: Line chart, 24-hour rolling window

Founder Badge Progress:
  Metric: founder_badges_remaining
  Description: 5000 minus total Founder badges awarded
  Alert: < 100 remaining (approaching limit, plan communication)
  Dashboard: Single number with progress bar

Badge Eligibility Queue:
  Metric: badge_eligibility_pending
  Description: Users meeting criteria but not yet awarded
  Alert: > 1000 pending (processing backlog)
  Dashboard: Number with trend arrow
```

### Notification System Metrics
```yaml
Notification Delivery Rate:
  Metric: notifications_sent_total
  Description: Total notifications created per hour
  Alert: > 10000/hour (spam or bug)
  Alert: 0/hour for 6h when ENABLE_NOTIFICATIONS=true (system down)

Push Delivery Success:
  Metric: push_notifications_delivered / push_notifications_sent
  Description: Ratio of successfully delivered push notifications
  Alert: < 80% delivery rate (push service issue)
  Dashboard: Percentage gauge

Notification Read Rate:
  Metric: notifications_read / notifications_sent
  Description: Ratio of notifications that were read by users
  Dashboard: Percentage over time (trend analysis)
  Note: Low read rate may indicate notification fatigue

Notification Latency:
  Metric: notification_delivery_p95
  Description: 95th percentile time from event to notification delivery
  Alert: > 5 seconds (performance degradation)
  Dashboard: Latency histogram
```

### Cosmetics Shop Metrics
```yaml
Cosmetic Purchase Conversion:
  Metric: cosmetic_views → cosmetic_purchases
  Description: Funnel from shop page view to completed purchase
  Dashboard: Funnel chart (views → cart → checkout → purchase)
  Alert: Conversion < 1% (UX issue or pricing problem)

Revenue per Day:
  Metric: cosmetic_revenue_daily
  Description: Total cosmetic sales revenue per day (USD)
  Dashboard: Bar chart, daily
  Note: Revenue is calculated from Stripe webhook events, not from
        application-side tracking (Stripe is source of truth)

Popular Cosmetics:
  Metric: cosmetic_purchase_count_by_item
  Description: Purchase count per cosmetic item
  Dashboard: Ranked bar chart
  Note: Useful for planning new cosmetic releases

Tip Jar Metrics:
  Metric: tips_sent_total, tips_amount_total
  Description: Number of tips sent and total amount
  Dashboard: Daily totals with rolling average
  Alert: Single tip > $500 (possible fraud or mistake)
```

### Referral System Metrics
```yaml
Referral Conversion Rate:
  Metric: referral_clicks → referral_signups
  Description: Ratio of referral link clicks to completed signups
  Dashboard: Funnel chart
  Alert: Conversion > 50% (suspicious, possible bot signups)

Referral Link Clicks:
  Metric: referral_clicks_per_hour
  Description: Total referral link clicks per hour
  Alert: > 1000/hour from single referral code (spam/abuse)
  Dashboard: Line chart with per-code breakdown

Top Referrers:
  Metric: referral_signups_by_user
  Description: Number of successful referrals per user
  Dashboard: Leaderboard table
  Note: Top referrers may qualify for special badges
```

### Stripe Webhook Health
```yaml
Webhook Success Rate:
  Metric: stripe_webhook_success / stripe_webhook_total
  Description: Ratio of successfully processed webhooks
  Alert: < 95% success rate (processing errors)
  Alert: 0 webhooks received in 24h (endpoint misconfigured)
  Dashboard: Percentage gauge with trend

Webhook Processing Latency:
  Metric: stripe_webhook_processing_ms
  Description: Time to process each webhook event
  Alert: p95 > 5000ms (risk of Stripe timeout and retry)
  Dashboard: Latency histogram

Webhook Retry Rate:
  Metric: stripe_webhook_retries
  Description: Number of webhook events received more than once
  Alert: > 10% retry rate (processing failures causing retries)
  Dashboard: Count per hour

Failed Payment Rate:
  Metric: payment_intent_failed / payment_intent_total
  Description: Ratio of failed payment attempts
  Alert: > 20% failure rate (payment system issue)
  Dashboard: Percentage over time
```

### AI Moderation Latency (V2 Enhanced)
```yaml
AI Moderation Latency:
  Metric: ai_moderation_latency_ms
  Description: Time for AI agent to return moderation decision
  p50 Target: < 500ms
  p95 Target: < 2000ms
  p99 Target: < 3000ms
  Alert: p95 > 3000ms (SLA breach, user experience degradation)
  Alert: p99 > 5000ms (critical, consider circuit breaker)
  Dashboard: Latency percentile chart (p50, p95, p99 lines)

AI Moderation Accuracy:
  Metric: ai_moderation_overturned / ai_moderation_total
  Description: Percentage of AI agent decisions overturned by governance
  Alert: > 10% overturn rate (AI agent prompt needs tuning)
  Dashboard: Percentage over time, per-community breakdown

AI API Error Rate:
  Metric: anthropic_api_errors / anthropic_api_calls
  Description: Ratio of failed Anthropic API calls
  Alert: > 5% error rate (API issue, switch to fallback)
  Dashboard: Percentage with error type breakdown
```

### Feature Flag Status Dashboard
```yaml
Feature Flag Dashboard:
  Description: Real-time view of all feature flag states
  Endpoint: GET /api/admin/feature-flags (admin-only)
  Response:
    {
      "ENABLE_BADGE_DISTRIBUTION": false,
      "ENABLE_COSMETICS_SHOP": true,
      "ENABLE_TIP_JAR": true,
      "ENABLE_NOTIFICATIONS": true
    }
  Dashboard: Table with green/red indicators per flag
  Alert: Any flag changed (audit log entry + team notification)
  Note: Feature flags are environment variables, not database values.
        Changing a flag requires a Railway redeploy or variable update.
```

---

## STRIPE WEBHOOK SETUP

### Registering the Webhook Endpoint

1. Navigate to Stripe Dashboard > Developers > Webhooks
2. Click "Add endpoint"
3. Enter endpoint URL: `https://fuega.ai/api/webhooks/stripe`
4. Select events to listen for (listed below)
5. Copy the signing secret (`whsec_...`) to `STRIPE_WEBHOOK_SECRET`

### Events to Listen For

```yaml
Cosmetic Purchases:
  checkout.session.completed:
    Description: Fired when a customer completes a cosmetic purchase
    Handler: Award the purchased cosmetic to the user's account
    Data: session.id, customer, line_items, metadata.user_id, metadata.cosmetic_id
    Action:
      1. Verify session payment_status === "paid"
      2. Look up cosmetic_id from session metadata
      3. Add cosmetic to user's inventory (user_cosmetics table)
      4. Send notification: "You purchased [cosmetic name]!"
      5. Log purchase in audit trail

Tips:
  payment_intent.succeeded:
    Description: Fired when a tip payment succeeds
    Handler: Record the tip and notify the recipient
    Data: amount, currency, metadata.tipper_user_id, metadata.recipient_user_id
    Action:
      1. Record tip in tips table
      2. Update recipient's total tips received
      3. Send notification to recipient: "Someone sent you a tip!"
      4. Check if recipient qualifies for any tip-related badges
      5. Log tip in audit trail (amounts visible, users anonymized)

  payment_intent.payment_failed:
    Description: Fired when a payment attempt fails
    Handler: Log the failure, do not award anything
    Data: amount, last_payment_error, metadata
    Action:
      1. Log failure reason (do NOT log full card details)
      2. Do NOT notify user (Stripe handles payment failure UX)
      3. Increment failed_payment counter for monitoring

Refunds:
  charge.refunded:
    Description: Fired when a charge is refunded
    Handler: Revoke the purchased cosmetic or reverse the tip
    Data: charge.id, amount_refunded, metadata
    Action:
      1. Determine if refund is for cosmetic or tip
      2. For cosmetic: Remove from user's inventory (soft delete)
      3. For tip: Deduct from recipient's total tips received
      4. Send notification to user: "Your purchase has been refunded"
      5. Log refund in audit trail

Recurring Tips (Subscriptions):
  customer.subscription.created:
    Description: Fired when a recurring tip subscription starts
    Handler: Record the subscription and notify both parties
    Data: subscription.id, customer, items, metadata
    Action:
      1. Record subscription in recurring_tips table
      2. Send notification to tipper: "Recurring tip activated"
      3. Send notification to recipient: "You have a new recurring supporter!"
      4. Check if recipient qualifies for "Supported Creator" badge

  customer.subscription.deleted:
    Description: Fired when a recurring tip is cancelled
    Handler: Mark subscription as cancelled
    Data: subscription.id, cancellation_details
    Action:
      1. Update recurring_tips table: set status = 'cancelled'
      2. Send notification to recipient: "A recurring tip was cancelled"
      3. Do NOT reveal which user cancelled (anonymity)
      4. Re-check badge eligibility for recipient
```

### Webhook Signature Verification

```typescript
// app/api/webhooks/stripe/route.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing signature', code: 'MISSING_SIGNATURE' }), {
      status: 400
    });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    // Signature verification failed — reject the request
    // Do NOT log the full body (may contain sensitive payment data)
    console.error('Webhook signature verification failed');
    return new Response(JSON.stringify({ error: 'Invalid signature', code: 'INVALID_SIGNATURE' }), {
      status: 400
    });
  }

  // Process the verified event
  await handleStripeEvent(event);

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
```

### Idempotent Event Processing

```typescript
// Stripe may send the same event multiple times (retries).
// Store processed event IDs to prevent duplicate processing.

async function handleStripeEvent(event: Stripe.Event) {
  // Check if we already processed this event
  const existing = await db.query(
    'SELECT id FROM stripe_events WHERE event_id = $1',
    [event.id]
  );

  if (existing.rows.length > 0) {
    // Already processed — return success to stop retries
    console.log(`Duplicate webhook event: ${event.id}`);
    return;
  }

  // Record the event BEFORE processing (prevents race conditions)
  await db.query(
    'INSERT INTO stripe_events (event_id, event_type, processed_at) VALUES ($1, $2, NOW())',
    [event.id, event.type]
  );

  // Route to appropriate handler
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCosmeticPurchase(event.data.object);
      break;
    case 'payment_intent.succeeded':
      await handleTipReceived(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
    case 'charge.refunded':
      await handleRefund(event.data.object);
      break;
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}
```

### Stripe Events Table Schema
```sql
-- Migration: 008_create_stripe_events.sql
CREATE TABLE stripe_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,  -- Stripe event ID (evt_...)
  event_type VARCHAR(100) NOT NULL,       -- e.g., 'checkout.session.completed'
  processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for fast duplicate lookups
CREATE INDEX idx_stripe_events_event_id ON stripe_events(event_id);

-- Clean up old events (keep 90 days for debugging)
-- This is handled by the notification cleanup cron (weekly)
DELETE FROM stripe_events WHERE created_at < NOW() - INTERVAL '90 days';
```

### Stripe Testing Checklist
```yaml
Before going live:
  - [ ] Test with Stripe CLI: stripe listen --forward-to localhost:3000/api/webhooks/stripe
  - [ ] Verify signature verification rejects tampered payloads
  - [ ] Test each event type with Stripe test mode
  - [ ] Verify idempotent processing (send same event twice)
  - [ ] Test webhook timeout handling (response within 30s)
  - [ ] Verify refund flow reverses cosmetic/tip correctly
  - [ ] Test subscription lifecycle (create → invoice → cancel)
  - [ ] Verify no sensitive data logged (card numbers, CVV, etc.)
  - [ ] Load test webhook endpoint (100 concurrent events)
  - [ ] Verify monitoring alerts fire on webhook failures
```

---

## iOS APP DEPLOYMENT (PHASE 2, POST-WEB)

This section documents the iOS app deployment strategy, planned for after the
web platform reaches stable user adoption.

### Framework Decision
```yaml
Option A: React Native (Recommended for V2)
  Pros:
    - Code sharing with Next.js web app (shared TypeScript logic)
    - Shared API client, validation schemas, types
    - Single language (TypeScript) across all platforms
    - Faster development with existing team knowledge
    - React Native Web for potential code sharing with web components
  Cons:
    - Performance slightly lower than native
    - Some native APIs require bridges
    - App size slightly larger than native

Option B: Native Swift (Considered for V3+)
  Pros:
    - Best performance and UX
    - Full access to iOS APIs
    - Smaller app size
    - Better App Store review experience
  Cons:
    - No code sharing with web
    - Requires Swift/iOS expertise
    - Longer development time
    - Separate codebase to maintain

Decision: React Native for V2 (code sharing priority)
Re-evaluate for V3 based on performance requirements
```

### App Store Submission Process

#### Step 1: Apple Developer Program Enrollment
```yaml
Requirements:
  - Apple ID (create with anonymous email)
  - D-U-N-S number (for organization account)
  - $99/year enrollment fee
  - Legal entity information

Timeline:
  - Enrollment approval: 1-3 business days
  - D-U-N-S lookup: Up to 5 business days if not registered

Account Type: Organization (recommended)
  - Requires D-U-N-S number
  - Apps published under organization name
  - Multiple team members supported
```

#### Step 2: App Store Connect Setup
```yaml
App Information:
  App Name: fuega
  Subtitle: AI-Moderated Discussion
  Bundle ID: ai.fuega.app
  SKU: FUEGA-IOS-001
  Primary Language: English (US)

  Primary Category: Social Networking
  Secondary Category: News

  Content Rights: Original content (user-generated)
  Age Rating: 17+ (user-generated content, mature themes possible)

  Privacy Policy URL: https://fuega.ai/privacy
  Terms of Service URL: https://fuega.ai/terms
  Support URL: https://fuega.ai/support
```

#### Step 3: TestFlight Beta Testing
```yaml
Internal Testing:
  - Up to 100 internal testers (team members)
  - No App Review required
  - Builds available immediately after upload
  - Use for initial QA and bug fixing

External Testing:
  - Up to 10,000 external testers
  - Requires Beta App Review (1-2 days)
  - Invite via email or public link
  - Collect crash reports and feedback
  - Run for minimum 2 weeks before App Store submission

Beta Testing Checklist:
  - [ ] Core features working (browse, post, comment, Spark/Douse)
  - [ ] Push notifications functional
  - [ ] Login/registration flow smooth
  - [ ] AI agent moderation responses display correctly
  - [ ] f/ community browsing works
  - [ ] Offline behavior handled gracefully
  - [ ] Deep links work (open specific posts/communities)
  - [ ] Performance acceptable (< 2s load time)
  - [ ] No crashes on supported iOS versions (iOS 16+)
  - [ ] Accessibility features working (VoiceOver, Dynamic Type)
```

#### Step 4: App Review Guidelines Compliance
```yaml
Critical Guidelines for fuega:

  1.1 - Objectionable Content:
    - Must have robust content moderation (AI agent handles this)
    - Must have user reporting mechanism
    - Must have ability to block users
    - Document moderation approach in App Review notes

  1.2 - User Generated Content:
    - Must filter objectionable material
    - Must provide mechanism to report offensive content
    - Must include EULA in app
    - Must provide method to block abusive users

  3.1.1 - In-App Purchases:
    - Cosmetic purchases MUST use Apple In-App Purchase
    - Tips MUST use Apple In-App Purchase (30% Apple commission)
    - Cannot use Stripe directly in iOS app for digital goods
    - Physical goods/services exempt from IAP requirement

  4.0 - Design:
    - Must use standard iOS UI patterns
    - Must support current and previous iOS version
    - Must work on all iPhone screen sizes
    - Must respect system settings (Dark Mode, Dynamic Type)

  5.1 - Privacy:
    - Must provide privacy policy
    - Must request permissions appropriately
    - Must explain data collection clearly
    - Must comply with App Tracking Transparency (ATT)

App Review Notes (submitted with each build):
  "fuega is an AI-moderated discussion platform. Content moderation
  is performed in real-time by an AI agent (powered by Anthropic Claude).
  All moderation decisions are publicly logged with reasoning.
  Users can report content, block other users, and communities
  can customize their own AI agent moderation rules through
  democratic governance voting."
```

**IMPORTANT: In-App Purchase Requirement**
```yaml
Apple's IAP Requirement Impact:
  - Cosmetics shop: Must use StoreKit 2 for iOS purchases
  - Tip jar: Must use StoreKit 2 for iOS tips
  - Stripe: Can only be used for web purchases
  - Dual payment system needed:
      Web: Stripe (2.9% + $0.30 fee)
      iOS: Apple IAP (15-30% commission)
  - Consider pricing cosmetics higher on iOS to offset Apple commission
  - OR set uniform pricing and absorb the difference
  - Purchased cosmetics must sync across web and iOS (shared database)

StoreKit 2 Integration:
  - Define products in App Store Connect
  - Map App Store product IDs to database cosmetic IDs
  - Verify receipts server-side with Apple's API
  - Handle subscription management for recurring tips
  - Implement restore purchases functionality
```

#### Step 5: Privacy Nutrition Labels
```yaml
Apple Privacy Nutrition Labels (App Store listing):

Data Used to Track You: None
  - fuega does not track users across apps or websites
  - No advertising identifier collection
  - No third-party analytics SDKs

Data Linked to You:
  - Email Address (account creation, optional)
  - Username (public display name)
  - User Content (posts, comments)

Data Not Linked to You:
  - IP Address (hashed, deleted after 30 days)
  - Usage Data (anonymized analytics)
  - Diagnostics (crash reports)

Data Collection Practices:
  - Contact Info: Email (optional, for account recovery)
  - User Content: Posts, comments (public by design)
  - Identifiers: Username (public), internal user ID
  - Usage Data: App interactions (anonymized)
  - Diagnostics: Crash logs, performance data

Privacy Details for App Store Connect:
  Category: Social Networking
  Data Types Collected:
    - Email Address: Yes (optional)
      - Purpose: Account creation
      - Linked to Identity: No (anonymous system)
    - User Content: Yes
      - Purpose: App Functionality
      - Linked to Identity: Yes (associated with username)
    - Usage Data: Yes
      - Purpose: Analytics, App Functionality
      - Linked to Identity: No
```

#### Step 6: App Store Screenshots and Metadata
```yaml
Required Screenshots (per device size):
  iPhone 6.7" (iPhone 15 Pro Max): 6 screenshots minimum
  iPhone 6.1" (iPhone 15): 6 screenshots minimum
  iPad Pro 12.9": 6 screenshots (if iPad supported)

Screenshot Content (in order):
  1. Home feed showing trending posts with Spark/Douse buttons
  2. f/ community page with AI agent moderation badge
  3. Post detail with comments and Spark/Douse voting
  4. Community creation / governance voting screen
  5. User profile with badges and Spark score
  6. AI agent moderation log (transparency feature)

App Store Description:
  "fuega - Where communities govern their own AI moderators.

  Browse and participate in communities (f/) where the rules
  are transparent, moderation is AI-powered, and every decision
  is publicly logged with reasoning.

  Key Features:
  - Spark and Douse posts and comments
  - Create and join communities (f/)
  - AI-powered moderation with public decision logs
  - Community governance: vote on your AI agent's rules
  - Earn badges: Founder, Trailblazer, Spark Lord, and more
  - Customize your profile with cosmetics
  - Support creators with tips

  Your voice matters. Your community, your rules."

Keywords (100 character limit):
  "discussion,forum,community,AI,moderation,democracy,voting,social,anonymous,governance"

What's New (per version):
  "v2.0.0:
  - Badge system with 6+ achievement badges
  - Cosmetics shop for profile customization
  - Tip jar to support community creators
  - Push notifications for replies and Sparks
  - Referral system with tracking
  - Performance improvements and bug fixes"
```

### Push Notification Setup (iOS)

#### Apple Push Notification Service (APNs)
```yaml
Authentication Method: Token-Based (Recommended)
  - Uses .p8 key file from Apple Developer Portal
  - Key does not expire (unlike certificates)
  - Single key works for all apps in the team
  - Simpler setup than certificate-based auth

Setup Steps:
  1. Apple Developer Portal → Certificates, IDs & Profiles → Keys
  2. Create new key with Apple Push Notifications Service (APNs)
  3. Download .p8 key file (can only download once!)
  4. Note the Key ID and Team ID
  5. Store key securely (Railway encrypted variable or secrets manager)

Environment Variables (iOS push, add to Railway):
  APNS_KEY_ID=ABC123DEFG
  APNS_TEAM_ID=XYZ789TEAM
  APNS_KEY_FILE_CONTENT=base64_encoded_p8_key_content
  APNS_BUNDLE_ID=ai.fuega.app

Alternative: Certificate-Based Auth
  - Requires .p12 certificate file
  - Certificates expire annually (must renew)
  - Separate certificates for development and production
  - More complex setup, not recommended for new projects
```

#### Notification Payload Format
```json
{
  "aps": {
    "alert": {
      "title": "New reply in f/technology",
      "subtitle": "Your post received a reply",
      "body": "Someone replied to your post about TypeScript generics..."
    },
    "badge": 3,
    "sound": "default",
    "category": "REPLY_NOTIFICATION",
    "thread-id": "post-12345",
    "mutable-content": 1
  },
  "metadata": {
    "post_id": "12345",
    "community": "technology",
    "notification_type": "reply",
    "deep_link": "fuega://post/12345"
  }
}
```

#### Notification Categories and Actions
```yaml
REPLY_NOTIFICATION:
  Actions:
    - "View Post" (opens post detail)
    - "Spark" (quick Spark the reply without opening app)
    - "Dismiss" (mark as read)

SPARK_NOTIFICATION:
  Actions:
    - "View Post" (opens the Sparked post)
    - "Dismiss" (mark as read)

MODERATION_NOTIFICATION:
  Actions:
    - "View Decision" (opens moderation log)
    - "Appeal" (opens appeal form)
    - "Dismiss" (mark as read)

BADGE_NOTIFICATION:
  Actions:
    - "View Badge" (opens badge detail)
    - "Equip Badge" (set as display badge)
    - "Dismiss" (mark as read)

GOVERNANCE_NOTIFICATION:
  Actions:
    - "Vote Now" (opens governance vote)
    - "View Proposal" (opens proposal detail)
    - "Dismiss" (mark as read)
```

### App Version Management

#### Semantic Versioning
```yaml
Format: MAJOR.MINOR.PATCH
  MAJOR: Breaking changes, major feature releases (1.0.0 → 2.0.0)
  MINOR: New features, non-breaking changes (2.0.0 → 2.1.0)
  PATCH: Bug fixes, minor improvements (2.1.0 → 2.1.1)

Build Number: Auto-incrementing integer (separate from version)
  - Required by App Store (must increase with each upload)
  - Format: YYYYMMDDNN (e.g., 2026022101)

Version Examples:
  2.0.0 (100): Initial V2 release
  2.0.1 (101): Bug fix for badge display
  2.1.0 (110): Add new cosmetic category
  2.2.0 (120): Referral system improvements
  3.0.0 (200): Major redesign or breaking API change
```

#### Force Update Mechanism
```yaml
Purpose: Force users to update when critical security patches are released
Implementation:
  1. Server endpoint: GET /api/app/version-check
  2. Response includes minimum required version
  3. App checks on launch and periodically (every 4 hours)
  4. If app version < minimum required version, show blocking modal

Server Response:
  {
    "current_version": "2.1.0",
    "minimum_version": "2.0.1",
    "recommended_version": "2.1.0",
    "force_update": false,
    "update_url": "https://apps.apple.com/app/fuega/id123456789",
    "message": "A new version of fuega is available with bug fixes."
  }

Force Update Scenarios:
  - Critical security vulnerability patched
  - API breaking change (old API version sunset)
  - Legal/compliance requirement
  - Data corruption bug fix

User Experience:
  - force_update=true: Full-screen blocking modal, only option is "Update Now"
  - force_update=false: Dismissable banner at top of app
  - Update link opens App Store directly to fuega listing
```

#### Feature Flags Shared with Web
```yaml
Feature Flag Sync:
  - iOS app fetches feature flags from server on launch
  - Endpoint: GET /api/feature-flags (public, no auth required)
  - Response cached for 1 hour (reduce API calls)
  - Fallback to last known flags if server unreachable

Feature Flag Response:
  {
    "flags": {
      "badges": true,
      "cosmetics_shop": true,
      "tip_jar": true,
      "notifications": true,
      "referrals": true,
      "dark_mode": true
    },
    "cache_ttl": 3600
  }

iOS-Specific Flags:
  - "ios_iap_enabled": true (controls StoreKit integration)
  - "ios_push_enabled": true (controls push notification registration)
  - "ios_haptic_feedback": true (controls haptic feedback on Spark/Douse)
  - "ios_biometric_login": true (Face ID / Touch ID support)

Flag Evaluation Order:
  1. Server flags (freshest, preferred)
  2. Cached flags (if server unreachable)
  3. Default flags (hardcoded in app binary, safest defaults)
```

---

## V2 DATABASE MIGRATION STRATEGY

### Migration File Naming Convention
```
/migrations/
  001_create_users.sql              (V1)
  002_create_communities.sql        (V1)
  003_create_posts_comments.sql     (V1)
  004_create_votes_moderation.sql   (V1)
  005_create_governance.sql         (V1)
  006_create_badges.sql             (V2)
  007_create_cosmetics.sql          (V2)
  008_create_stripe_events.sql      (V2)
  009_create_notifications.sql      (V2)
  010_create_referrals.sql          (V2)
```

### Migration Execution Rules
```yaml
Run Order: Sequential, NEVER skip
  - Migrations must run in numeric order
  - Each migration runs exactly once
  - A migrations tracking table records which have run
  - If migration 007 fails, do NOT run 008 until 007 succeeds

Rollback: Each migration has up() and down()
  - up(): Applies the migration (adds tables, columns, indexes)
  - down(): Reverses the migration (drops tables, removes columns)
  - down() is for development/testing only — NEVER run down() in production
  - In production, always fix forward with a new migration

Backwards Compatibility:
  - All V2 migrations must be backwards-compatible with V1 code
  - This means: add columns as NULLABLE first
  - Backfill data in a separate migration
  - Add NOT NULL constraints in a third migration
  - This allows rolling back the application without rolling back the database

Example (adding badge_count to users):
  Migration 006a: ALTER TABLE users ADD COLUMN badge_count INT DEFAULT 0;
  Migration 006b: UPDATE users SET badge_count = (SELECT COUNT(*) FROM user_badges WHERE user_badges.user_id = users.id);
  Migration 006c: ALTER TABLE users ALTER COLUMN badge_count SET NOT NULL;
```

### Railway Migration Integration
```bash
# railway.json
{
  "deploy": {
    "releaseCommand": "npm run migrate"
  }
}

# package.json scripts
{
  "scripts": {
    "migrate": "node scripts/migrate.js",
    "migrate:down": "node scripts/migrate.js --down",
    "migrate:status": "node scripts/migrate.js --status"
  }
}
```

### Migration Tracking Table
```sql
-- This table is created by the migration runner itself
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
  execution_time_ms INT
);

-- Check migration status
SELECT migration_name, applied_at, execution_time_ms
FROM schema_migrations
ORDER BY id;
```

### V2 Migration Details

#### 006_create_badges.sql
```sql
-- UP
CREATE TABLE badges (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  icon_url VARCHAR(500),
  rarity VARCHAR(50) NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'legendary', 'unique')),
  max_supply INT,                    -- NULL = unlimited
  criteria JSONB NOT NULL,           -- Machine-readable eligibility criteria
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE user_badges (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  badge_id INT NOT NULL REFERENCES badges(id),
  badge_number INT,                  -- For numbered badges (e.g., Founder #42)
  awarded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  equipped BOOLEAN NOT NULL DEFAULT FALSE,  -- Currently displaying this badge
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX idx_user_badges_equipped ON user_badges(user_id, equipped) WHERE equipped = TRUE;

-- Seed initial badges
INSERT INTO badges (name, description, rarity, max_supply, criteria) VALUES
  ('Founder', 'One of the first 5000 users of fuega.ai', 'legendary', 5000, '{"type": "registration_order", "max": 5000}'),
  ('Trailblazer', 'Active contributor: 30+ days, 100+ Spark score, 10+ posts', 'rare', NULL, '{"type": "activity", "days": 30, "spark_score": 100, "posts": 10}'),
  ('Spark Lord', 'Received 1000+ total Sparks across all posts', 'rare', NULL, '{"type": "sparks_received", "total": 1000}'),
  ('Community Builder', 'Created a community with 50+ members', 'uncommon', NULL, '{"type": "community_size", "members": 50}'),
  ('First Post', 'Created your first post on fuega.ai', 'common', NULL, '{"type": "first_post"}'),
  ('Conversation Starter', 'Had a post with 10+ comments', 'common', NULL, '{"type": "post_comments", "count": 10}');

CREATE TABLE badge_counter (
  id SERIAL PRIMARY KEY,
  badge_name VARCHAR(100) UNIQUE NOT NULL,
  next_number INT NOT NULL DEFAULT 0,
  max_number INT
);

INSERT INTO badge_counter (badge_name, next_number, max_number) VALUES
  ('Founder', 0, 5000);

-- DOWN
DROP TABLE IF EXISTS badge_counter;
DROP TABLE IF EXISTS user_badges;
DROP TABLE IF EXISTS badges;
```

#### 007_create_cosmetics.sql
```sql
-- UP
CREATE TABLE cosmetics (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('avatar_frame', 'name_color', 'post_background', 'flair', 'emoji_pack')),
  price_cents INT NOT NULL,          -- Price in USD cents
  stripe_price_id VARCHAR(255),      -- Stripe Price ID for web purchases
  apple_product_id VARCHAR(255),     -- App Store product ID for iOS purchases
  preview_url VARCHAR(500),          -- Preview image URL
  css_data JSONB,                    -- CSS/style data for rendering
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP               -- Soft delete
);

CREATE TABLE user_cosmetics (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  cosmetic_id INT NOT NULL REFERENCES cosmetics(id),
  purchased_at TIMESTAMP NOT NULL DEFAULT NOW(),
  equipped BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_payment_id VARCHAR(255),    -- Stripe payment reference
  apple_transaction_id VARCHAR(255), -- App Store transaction reference
  refunded_at TIMESTAMP,             -- NULL if not refunded
  UNIQUE(user_id, cosmetic_id)
);

CREATE INDEX idx_user_cosmetics_user_id ON user_cosmetics(user_id);
CREATE INDEX idx_user_cosmetics_equipped ON user_cosmetics(user_id, equipped) WHERE equipped = TRUE;
CREATE INDEX idx_cosmetics_category ON cosmetics(category) WHERE active = TRUE;

-- DOWN
DROP TABLE IF EXISTS user_cosmetics;
DROP TABLE IF EXISTS cosmetics;
```

#### 008_create_stripe_events.sql
```sql
-- UP
CREATE TABLE stripe_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stripe_events_event_id ON stripe_events(event_id);
CREATE INDEX idx_stripe_events_created_at ON stripe_events(created_at);

CREATE TABLE tips (
  id SERIAL PRIMARY KEY,
  tipper_user_id UUID NOT NULL REFERENCES users(id),
  recipient_user_id UUID NOT NULL REFERENCES users(id),
  amount_cents INT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'usd',
  stripe_payment_intent_id VARCHAR(255),
  recurring BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  refunded_at TIMESTAMP
);

CREATE INDEX idx_tips_recipient ON tips(recipient_user_id);
CREATE INDEX idx_tips_tipper ON tips(tipper_user_id);
CREATE INDEX idx_tips_created_at ON tips(created_at);

CREATE TABLE recurring_tips (
  id SERIAL PRIMARY KEY,
  tipper_user_id UUID NOT NULL REFERENCES users(id),
  recipient_user_id UUID NOT NULL REFERENCES users(id),
  amount_cents INT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'usd',
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'paused')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMP
);

CREATE INDEX idx_recurring_tips_recipient ON recurring_tips(recipient_user_id);
CREATE INDEX idx_recurring_tips_status ON recurring_tips(status) WHERE status = 'active';

-- DOWN
DROP TABLE IF EXISTS recurring_tips;
DROP TABLE IF EXISTS tips;
DROP TABLE IF EXISTS stripe_events;
```

#### 009_create_notifications.sql
```sql
-- UP
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'reply', 'spark', 'douse', 'badge_awarded', 'moderation_decision',
    'governance_vote', 'tip_received', 'cosmetic_purchased', 'role_upgrade',
    'community_milestone', 'referral_signup'
  )),
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB,                    -- Additional context (post_id, community, etc.)
  deep_link VARCHAR(500),            -- URL or app deep link
  read_at TIMESTAMP,                 -- NULL if unread
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- NOTE: Notifications use hard delete (not soft delete).
-- This is an intentional exception to the soft-delete rule because
-- notifications are ephemeral data with no audit requirement.

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

CREATE TABLE push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('web', 'ios', 'android')),
  endpoint TEXT,                     -- Web Push endpoint URL
  p256dh_key TEXT,                   -- Web Push encryption key
  auth_key TEXT,                     -- Web Push auth key
  device_token TEXT,                 -- APNs device token (iOS)
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id) WHERE active = TRUE;
CREATE UNIQUE INDEX idx_push_subscriptions_unique ON push_subscriptions(user_id, platform, COALESCE(endpoint, ''), COALESCE(device_token, ''));

-- DOWN
DROP TABLE IF EXISTS push_subscriptions;
DROP TABLE IF EXISTS notifications;
```

#### 010_create_referrals.sql
```sql
-- UP
CREATE TABLE referral_codes (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  code VARCHAR(20) UNIQUE NOT NULL,  -- Short code (e.g., "FUEGA-ABC123")
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(user_id)                    -- One referral code per user
);

CREATE TABLE referral_clicks (
  id SERIAL PRIMARY KEY,
  referral_code_id INT NOT NULL REFERENCES referral_codes(id),
  ip_hash VARCHAR(64),               -- Hashed IP for deduplication (deleted after 30 days)
  user_agent TEXT,
  clicked_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE referral_signups (
  id SERIAL PRIMARY KEY,
  referral_code_id INT NOT NULL REFERENCES referral_codes(id),
  referred_user_id UUID NOT NULL REFERENCES users(id),
  signed_up_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(referred_user_id)           -- A user can only be referred once
);

CREATE INDEX idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_clicks_code ON referral_clicks(referral_code_id);
CREATE INDEX idx_referral_signups_code ON referral_signups(referral_code_id);
CREATE INDEX idx_referral_clicks_cleanup ON referral_clicks(clicked_at);

-- DOWN
DROP TABLE IF EXISTS referral_signups;
DROP TABLE IF EXISTS referral_clicks;
DROP TABLE IF EXISTS referral_codes;
```

---

## V2 BACKUP STRATEGY UPDATES

These updates extend the existing backup strategy in Section 6.2.

### Badge Data Backup
```yaml
Badge Data:
  Tables: badges, user_badges, badge_counter
  Backup: Included in daily PostgreSQL backup (automated by Railway)
  Criticality: HIGH — badge ownership is a core user asset
  Recovery: Restore from daily backup, re-run badge eligibility check
  Verification: After restore, verify badge counts match badge_counter table
  Note: Numbered Founder badges (e.g., Founder #42) must maintain their
        exact numbers after restore — the badge_counter table ensures this
```

### Stripe Data Backup
```yaml
Stripe Data:
  Tables: stripe_events, tips, recurring_tips
  Backup: Included in daily PostgreSQL backup
  Source of Truth: Stripe Dashboard (Stripe maintains authoritative records)
  Criticality: MEDIUM — can reconstruct from Stripe API if local data lost
  Recovery Strategy:
    1. Restore from daily backup
    2. If backup is stale, reconcile against Stripe API:
       - List all charges: stripe.charges.list()
       - List all subscriptions: stripe.subscriptions.list()
       - Rebuild local tips and recurring_tips tables
    3. Re-process any missed webhook events from Stripe event log
  Verification: Compare local stripe_events count with Stripe event log
  Note: Stripe retains event data for 30 days — reconciliation window
```

### Notification Data Backup
```yaml
Notification Data:
  Tables: notifications, push_subscriptions
  Backup: Included in daily PostgreSQL backup (but not critical)
  Criticality: LOW — notifications are ephemeral
  Recovery Strategy:
    - Notifications: Do NOT restore old notifications after data loss
    - Push subscriptions: Restore from backup — losing these means users
      must re-enable push notifications (annoying but not catastrophic)
  Note: It is acceptable to lose notification data in a disaster recovery
        scenario. Users will simply see no notification history. New
        notifications will start flowing immediately after recovery.
```

### Referral Data Backup
```yaml
Referral Data:
  Tables: referral_codes, referral_clicks, referral_signups
  Backup: Included in daily PostgreSQL backup
  Criticality: MEDIUM — referral codes must persist, click data is ephemeral
  Recovery Strategy:
    1. Restore referral_codes and referral_signups from backup
    2. referral_clicks can be lost without major impact
    3. Regenerate any missing referral codes for users who had them
  Verification: Verify all users with referral_signups have valid referred_user_id
```

### Cosmetic Ownership Backup
```yaml
Cosmetic Ownership:
  Tables: cosmetics, user_cosmetics
  Backup: Included in daily PostgreSQL backup
  Criticality: HIGH — users paid real money for cosmetics
  Recovery Strategy:
    1. Restore from daily backup
    2. Cross-reference against Stripe payment records:
       - Query all successful checkout sessions with cosmetic metadata
       - Verify each payment has a corresponding user_cosmetics entry
       - Add any missing entries (user purchased but record lost)
    3. Handle refund discrepancies:
       - Query Stripe for refunded charges
       - Ensure refunded cosmetics are marked as refunded_at in database
  Verification:
    - Every non-refunded Stripe cosmetic payment must have a user_cosmetics row
    - Every user_cosmetics row should have either stripe_payment_id or apple_transaction_id
    - Equipped cosmetics must reference active (non-refunded) purchases
  Note: In case of total data loss, Stripe records allow full reconstruction
        of who purchased what. This is why Stripe is the source of truth for
        payment-related data.
```

### Backup Schedule Summary (V1 + V2)
```yaml
Daily Automated Backup (Railway, 2AM UTC):
  V1 Tables:
    - users
    - communities
    - community_members
    - posts
    - comments
    - votes
    - moderation_logs
    - moderation_prompts
    - prompt_votes
    - reports
    - categories
    - community_categories
    - ip_hashes

  V2 Tables:
    - badges
    - user_badges
    - badge_counter
    - cosmetics
    - user_cosmetics
    - stripe_events
    - tips
    - recurring_tips
    - notifications (low priority)
    - push_subscriptions
    - referral_codes
    - referral_clicks (low priority)
    - referral_signups
    - schema_migrations

Total Tables: 27 (13 V1 + 14 V2)
Estimated Backup Size (25K users): ~500MB uncompressed, ~50MB compressed
Backup Retention: 30 days (Railway default)
Secondary Backup: S3 bucket, encrypted, 90-day retention
```

---

**Deployed by:** Anonymous Fuega Team
**Deployment Date:** TBD
**Next Review:** 30 days post-launch
