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
```

---

**Deployed by:** Anonymous Fuega Team  
**Deployment Date:** TBD  
**Next Review:** 30 days post-launch
