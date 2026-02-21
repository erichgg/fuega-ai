# FUEGA.AI - IDENTITY SCRUBBING GUIDE

**CRITICAL SECURITY DOCUMENT**  
**Purpose:** Remove all traces of your personal identity from the project  
**Threat Model:** Determined adversaries analyzing git history, deployment metadata, and code comments

---

## WHY THIS MATTERS

Your anonymity is **paramount**. Even small pieces of identifying information can be correlated:
- Git commit metadata (name, email, timezone)
- Code comments with personal references
- API keys with your payment info
- Domain registration details
- Server logs with your IP

This guide helps you become **truly anonymous** while maintaining project integrity.

---

## AUTOMATED SCRUBBING (Claude Code Will Do This)

### Phase 0: API Key & Connection Preservation
Claude Code will extract and preserve your existing API keys:

```bash
# Scan existing project for API keys
grep -r "ANTHROPIC_API_KEY" agent-business/
grep -r "ELEVEN_LABS" agent-business/
grep -r "GOOGLE_PLACES" agent-business/
grep -r "GOOGLE_MAPS" agent-business/
grep -r "DATABASE_URL" agent-business/

# Extract Railway environment variables
railway variables > preserved_keys.txt

# Extract Cloudflare settings
# Zones, DNS records, workers, etc.
# This preserves your fuega.ai domain connection

# Create secure .env file with all keys
cat > .env << EOF
# Preserved from existing setup
ANTHROPIC_API_KEY=<extracted_value>
ELEVEN_LABS_API_KEY=<extracted_value>
GOOGLE_PLACES_API_KEY=<extracted_value>
GOOGLE_MAPS_API_KEY=<extracted_value>
DATABASE_URL=<extracted_value>

# New keys to generate
JWT_SECRET=$(openssl rand -base64 32)
IP_SALT=$(openssl rand -base64 32)
EOF

# IMPORTANT: Keep connections alive
# - Railway project stays connected
# - Cloudflare DNS stays pointed at Railway
# - PostgreSQL keeps same DATABASE_URL
# - All API keys continue working
# - fuega.ai domain remains accessible
```

**What gets preserved:**
- All API keys from agent-business
- Railway environment variables
- Database connection string
- Cloudflare zone configuration
- DNS records for fuega.ai
- SSL/TLS certificates
- Existing deployments

**What changes:**
- Git history (cleaned)
- Code comments (anonymized)
- No connection interruption to fuega.ai

### Phase 1: Code Scrubbing
Claude Code will search and clean:

```bash
# Search for personal identifiers
grep -r "YOUR_NAME" .
grep -r "personal_email@" .
grep -r "real_phone_number" .
grep -r "TODO.*YourName" .

# Replace with generic identifiers
sed -i 's/John Doe/Fuega Team/g' **/*
sed -i 's/john@personal\.com/team@fuega.ai/g' **/*
sed -i 's/Copyright.*John/Copyright Fuega Contributors/g' **/*
```

**What Claude Code will clean:**
- Code comments with your name
- TODO/FIXME notes with personal identifiers
- Author tags in files
- Copyright notices
- License headers
- Debug logging with personal info
- Hardcoded paths like `/Users/yourname/`

### Phase 2: Git History Analysis
Claude Code will analyze and prepare:

```bash
# List all commit authors
git log --format='%an <%ae>' | sort -u

# Find commits with potential PII
git log --all --grep="personal" --grep="TODO.*yourname" -i

# Generate commit history report
git log --all --pretty=format:"%H|%an|%ae|%ad|%s" > commit_analysis.txt
```

### Phase 3: Environment File Template
Claude Code will create:

```bash
# .env.example (no secrets)
DATABASE_URL=postgresql://user:pass@host:port/db
ANTHROPIC_API_KEY=sk-ant-your-key-here
JWT_SECRET=generate-with-openssl-rand
IP_SALT=generate-with-openssl-rand

# Add to .gitignore
.env
.env.local
.env.*.local
*.pem
*.key
```

---

## MANUAL SCRUBBING (You Must Do These)

### STEP 1: Git History Rewrite

**⚠️ WARNING: This is destructive. Backup first!**

```bash
# 1. Backup entire repository
cp -r agent-business agent-business-backup
cd agent-business

# 2. Install BFG Repo-Cleaner
brew install bfg
# OR download from: https://rtyley.github.io/bfg-repo-cleaner/

# 3. Create file with strings to replace
cat > passwords.txt << EOF
YOUR_REAL_NAME
your.email@gmail.com
your_phone_number
/Users/yourname
YOUR_COMPANY_NAME
EOF

# 4. Run BFG to replace all instances
bfg --replace-text passwords.txt .git

# 5. Clean up git history
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 6. Force push (CAREFUL!)
# Only do this if you're sure!
git push --force --all origin
git push --force --tags origin

# 7. Verify cleaning
git log --all --oneline | head -20
git log --all --grep="YOUR_NAME" -i
```

**Alternative: Start Fresh Repository**
```bash
# Safer option: Create new repo from current state
cd agent-business
rm -rf .git
git init
git add .
git commit -m "Initial commit"

# Create new GitHub repo (anonymous org)
# Push to new repo
git remote add origin git@github.com:fuega-ai/fuega-platform.git
git push -u origin main
```

### STEP 2: GitHub Organization Setup

```bash
# 1. Create burner email
# Use ProtonMail, Tutanota, or similar
# DO NOT use your personal email
burner_email="fuega.team.2026@protonmail.com"

# 2. Create GitHub account
# - Use burner email
# - Use anonymous username
# - DO NOT link to personal account
# - Enable 2FA with hardware key (YubiKey recommended)

# 3. Create organization
# Name: fuega-ai (or similar)
# DO NOT add personal info to bio
# No website link to personal domains

# 4. Transfer repository
# Settings → Transfer ownership → fuega-ai organization

# 5. Delete personal fork/copy
# On your personal GitHub account
```

### STEP 3: Railway Account Setup

```bash
# 1. Create new Railway account
# Email: Use same burner email as GitHub
# DO NOT link to personal Railway account

# 2. Payment method
# Option A: Privacy.com virtual card (recommended)
#   - Creates masked card numbers
#   - Hides your real card info
#   - Can set spending limits

# Option B: Prepaid credit card
#   - Buy at store with cash
#   - Register with burner address

# 3. Enable 2FA
# Use authenticator app (Authy, 1Password)

# 4. Create new project
# Import from fuega-ai/fuega-platform

# 5. Delete old project
# From personal Railway account
# Export any data first if needed
```

### STEP 4: Cloudflare Account Setup

```bash
# 1. Create new Cloudflare account
# Email: Same burner email
# DO NOT use personal Cloudflare account

# 2. Transfer domain
# Settings → Transfer domain to new account
# OR register new domain with burner info

# 3. Domain privacy protection
# Enable WHOIS privacy protection
# Verify contact info is redacted

# 4. Configure DNS
# Remove any records pointing to personal servers
# Point to Railway deployments only
```

### STEP 5: API Keys & Secrets

```bash
# 1. Anthropic API
# Create new API key
# Pay with Privacy.com card or prepaid card
# DO NOT use personal payment method

# 2. Rotate ALL existing keys
railway variables set ANTHROPIC_API_KEY=new-key-here
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set IP_SALT=$(openssl rand -base64 32)

# 3. Delete old keys
# From Anthropic dashboard
# From Railway dashboard

# 4. Update local .env
# NEVER commit .env to git
# Verify .gitignore includes .env
```

### STEP 6: Domain Registration Scrubbing

```bash
# 1. Check current WHOIS
whois fuega.ai

# 2. Enable privacy protection
# Should show registrar info, not yours
# If using Cloudflare Registrar:
#   - They automatically redact
#   - No extra cost

# 3. If exposed, update contact info
# Use PO Box or mail forwarding service
# Use burner phone number (Google Voice, Burner app)
# Use burner email

# 4. Verify privacy
whois fuega.ai | grep -i "your_real_name"
# Should return nothing
```

### STEP 7: Server Access Logs

```bash
# 1. Railway logs
# Enable log rotation
# Auto-delete after 7 days

# 2. PostgreSQL logs
# Configure to NOT log client IPs
ALTER SYSTEM SET log_hostname = off;
ALTER SYSTEM SET log_line_prefix = '%t [%p]: user=%u,db=%d ';

# 3. Application logs
# Remove IP logging from code
# See SECURITY.md for IP hashing

# 4. Cloudflare logs
# Already anonymized
# But verify no personal data in custom rules
```

---

## VERIFICATION CHECKLIST

After scrubbing, verify everything:

### Git History
```bash
# No personal email
git log --all --format='%ae' | sort -u
# Should show: team@fuega.ai or similar

# No personal name
git log --all --format='%an' | sort -u
# Should show: Fuega Team or similar

# No personal references in messages
git log --all --oneline | grep -i "yourname"
# Should return nothing

# Check all files ever committed
git log --all --name-only --pretty=format: | sort -u | grep -i "yourname"
# Should return nothing
```

### Code Search
```bash
# Search entire codebase
grep -r "YOUR_NAME" .
grep -r "personal.email" .
grep -r "555-1234" . # your phone
grep -r "/Users/yourname" .

# Check package.json
cat package.json | grep -i "author"
# Should show anonymous or team

# Check README
cat README.md | grep -i "yourname"
# Should return nothing
```

### Accounts Audit
```bash
# List all accounts used
echo "GitHub: anonymous-org-account"
echo "Railway: burner-email@proton.me"
echo "Cloudflare: burner-email@proton.me"
echo "Anthropic: burner-email@proton.me"

# Verify 2FA enabled on all
# Verify payment methods are anonymized
# Verify no personal info in profiles
```

### Domain Privacy
```bash
whois fuega.ai
# Should show:
# - Registrar privacy service
# - No personal name
# - No personal email
# - No personal phone
# - No personal address
```

### Deployment Metadata
```bash
# Check Railway environment
railway variables
# Should show only REDACTED values

# Check git remote
git remote -v
# Should show anonymous org, not personal account

# Check package locks for personal paths
cat package-lock.json | grep -i "/Users/yourname"
cat yarn.lock | grep -i "/Users/yourname"
# Should return nothing
```

---

## ONGOING OPERATIONAL SECURITY

### Daily Practices
1. **Always commit as anonymous user**
   ```bash
   git config user.name "Fuega Team"
   git config user.email "team@fuega.ai"
   ```

2. **Never log personal info**
   - No names in error logs
   - No emails in debug output
   - Hash all IPs before logging

3. **Use VPN or Tor for admin access**
   - Mask your IP when accessing Railway/Cloudflare dashboards
   - Different IP from your personal browsing

4. **Separate devices (ideal)**
   - Use different computer for fuega.ai work
   - Or at least different browser profile
   - No personal accounts signed in

### Monthly Audits
```bash
# Check for new personal info
grep -r "personal.*keyword" .

# Review git log for accidental commits
git log --since="1 month ago" --oneline

# Verify all accounts still anonymized
# Check WHOIS, Railway, GitHub, etc.

# Rotate secrets
railway variables set JWT_SECRET=$(openssl rand -base64 32)
```

---

## THREAT SCENARIOS & MITIGATIONS

### Scenario 1: Git History Leak
**Threat:** Someone clones repository, analyzes commits, finds your email  
**Mitigation:** 
- BFG cleaned history
- Force pushed to overwrite
- Old commits unreachable
- Monitor GitHub for forks

### Scenario 2: Payment Correlation
**Threat:** Anthropic/Railway payment info links to your identity  
**Mitigation:**
- Privacy.com virtual cards
- Prepaid cards bought with cash
- Burner email for billing

### Scenario 3: Code Style Analysis
**Threat:** Writing style or code patterns identify you  
**Mitigation:**
- Use consistent style guide (AI-assisted)
- Multiple contributors (or appear to be)
- Standard patterns from docs/tutorials

### Scenario 4: Timezone Correlation
**Threat:** Commit times reveal your timezone  
**Mitigation:**
- Use `GIT_COMMITTER_DATE` to randomize
- Or commit at random hours
- Batch commits, randomize timing

```bash
# Randomize commit times
GIT_AUTHOR_DATE="2026-02-20T14:00:00" \
GIT_COMMITTER_DATE="2026-02-20T14:00:00" \
git commit -m "message"
```

### Scenario 5: Domain Registration
**Threat:** WHOIS leaks your info despite privacy  
**Mitigation:**
- Use Cloudflare Registrar (auto-redacts)
- Or services with strong privacy (Njalla, Epik)
- Monitor WHOIS quarterly

### Scenario 6: Server Logs
**Threat:** Railway/Cloudflare logs your admin IP  
**Mitigation:**
- Always use VPN when accessing dashboards
- Use Tor Browser for maximum anonymity
- Never admin from personal network

---

## LEGAL DISCLAIMER

**Important:** This guide is for **privacy protection**, not illegal activity.

- You must still comply with all laws
- You must respond to valid legal requests
- Privacy ≠ immunity from law
- Consult lawyer for your jurisdiction

**fuega.ai's stance:**
- We believe in