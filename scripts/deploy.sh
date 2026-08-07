#!/bin/bash
# ==============================================================================
# SentinelAI — Full Deploy + SSL Script
# Run on the droplet as the deploy user AFTER bootstrap.sh
# Usage: ./scripts/deploy.sh your-domain.com
# ==============================================================================
set -euo pipefail

DOMAIN="${1:-}"
APP_DIR="/opt/sentinelai"

COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${COLOR_GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${COLOR_YELLOW}[WARN]${NC}  $1"; }
err()  { echo -e "${COLOR_RED}[ERROR]${NC} $1"; exit 1; }

[[ -z "$DOMAIN" ]] && err "Usage: ./scripts/deploy.sh your-domain.com"
[[ ! -f "$APP_DIR/.env" ]] && err ".env file not found. Copy .env.example to .env and fill in secrets first."

# ── Validate required env vars ────────────────────────────────────────────────
log "Validating environment..."
source "$APP_DIR/.env"
[[ -z "${JWT_SECRET_KEY:-}" ]]      && err "JWT_SECRET_KEY is not set in .env"
[[ -z "${META_VERIFY_TOKEN:-}" ]]   && err "META_VERIFY_TOKEN is not set in .env"
[[ -z "${POSTGRES_PASSWORD:-}" ]]   && err "POSTGRES_PASSWORD is not set in .env"

# ── Patch nginx config with real domain ──────────────────────────────────────
log "Patching nginx config with domain: $DOMAIN..."
sed -i "s/YOUR_DOMAIN_HERE/$DOMAIN/g" "$APP_DIR/nginx.prod.conf"
# Update CORS origins in .env
sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=https://$DOMAIN|" "$APP_DIR/.env"

# ── Step 1: Start just nginx on HTTP for certbot challenge ────────────────────
log "Starting nginx on HTTP for Let's Encrypt ACME challenge..."
cd "$APP_DIR"

# Temporarily use a plain HTTP-only nginx to get the cert
docker run -d --name nginx_certbot_temp \
  -p 80:80 \
  -v "$APP_DIR/nginx.prod.conf:/etc/nginx/nginx.conf:ro" \
  -v certbot_www:/var/www/certbot \
  nginx:alpine || warn "nginx_certbot_temp may already be running"

# ── Step 2: Get SSL certificate ───────────────────────────────────────────────
log "Obtaining Let's Encrypt certificate for $DOMAIN..."
docker stop nginx_certbot_temp 2>/dev/null || true
docker rm nginx_certbot_temp 2>/dev/null || true

certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --email "admin@$DOMAIN" \
  -d "$DOMAIN" \
  --http-01-port 80

log "SSL certificate obtained!"

# Copy certs to Docker volumes
docker volume create certbot_conf 2>/dev/null || true
docker volume create certbot_www 2>/dev/null || true
# Symlink system certbot certs into docker volume mount point
mkdir -p /opt/certbot_conf
cp -rL /etc/letsencrypt /opt/certbot_conf/ 2>/dev/null || true

# ── Step 3: Build and launch all services ─────────────────────────────────────
log "Building and launching all Docker services..."
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml --env-file .env pull
docker compose -f docker-compose.prod.yml --env-file .env build --no-cache
docker compose -f docker-compose.prod.yml --env-file .env up -d

# ── Step 4: Initialize database ───────────────────────────────────────────────
log "Initializing database..."
sleep 10  # wait for postgres to be healthy
docker compose -f docker-compose.prod.yml exec backend python init_db.py || warn "DB init may have already run"

# ── Step 5: Health check ──────────────────────────────────────────────────────
log "Running health check..."
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/health" || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
    log "✅ Health check passed!"
else
    warn "Health check returned HTTP $HTTP_CODE — check logs with: docker compose -f docker-compose.prod.yml logs"
fi

# ── Step 6: Set up auto-renewal cron ─────────────────────────────────────────
log "Setting up SSL auto-renewal..."
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && docker compose -f $APP_DIR/docker-compose.prod.yml exec nginx nginx -s reload") | crontab -

log ""
log "🚀 DEPLOYMENT COMPLETE!"
log "   App URL:    https://$DOMAIN"
log "   API docs:   https://$DOMAIN/docs"
log "   Health:     https://$DOMAIN/health"
log ""
log "Useful commands:"
log "  docker compose -f docker-compose.prod.yml logs -f          # live logs"
log "  docker compose -f docker-compose.prod.yml ps               # service status"
log "  docker compose -f docker-compose.prod.yml restart backend  # restart a service"
