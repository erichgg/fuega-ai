#!/usr/bin/env bash
# Fuega AI — Deployment Quick Reference
# ======================================
#
# FRONTEND (Cloudflare Pages — auto-deploys from git)
#   Root directory: frontend
#   Build command:  npm run build
#   Output dir:     dist
#   Env var:        VITE_API_URL=https://fuega-api.up.railway.app/api
#
# WEBSITE (Cloudflare Pages — auto-deploys from git)
#   Root directory: website
#   Build command:  (none — static files)
#   Output dir:     . (root of website/)
#
# BACKEND (Railway)
#   Uses Dockerfile.api via railway.toml
#   Railway env vars (set in dashboard):
#     ANTHROPIC_API_KEY=sk-ant-...
#     DATABASE_URL=postgresql+asyncpg://...  (auto from Railway PostgreSQL add-on)
#     REDIS_URL=redis://...                  (auto from Railway Redis add-on)
#     ENVIRONMENT=production
#     JWT_SECRET_KEY=<generate with: openssl rand -hex 32>
#     CORS_ORIGINS=["https://your-app.pages.dev","https://app.fuega.ai"]
#     STRIPE_SECRET_KEY=sk_live_...           (when ready)
#     STRIPE_WEBHOOK_SECRET=whsec_...         (when ready)

set -euo pipefail

echo "=== Fuega AI Deploy ==="

# Backend: deploy to Railway
if command -v railway &> /dev/null; then
  echo "Deploying backend to Railway..."
  railway up
else
  echo "Railway CLI not installed. Install: npm i -g @railway/cli"
  echo "Then run: railway login && railway up"
fi

echo ""
echo "Frontend & Website deploy automatically via Cloudflare Pages on git push."
echo "Done."
