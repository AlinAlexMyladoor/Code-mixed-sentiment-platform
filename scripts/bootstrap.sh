#!/bin/bash
# ==============================================================================
# SentinelAI — DigitalOcean Droplet Bootstrap Script
# Run as root on a fresh Ubuntu 24.04 droplet
# Usage: curl -sL <raw-url-of-this-script> | bash
# ==============================================================================
set -euo pipefail

COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${COLOR_GREEN}[SETUP]${NC} $1"; }
warn() { echo -e "${COLOR_YELLOW}[WARN]${NC}  $1"; }
err()  { echo -e "${COLOR_RED}[ERROR]${NC} $1"; exit 1; }

# ── 1. System update ──────────────────────────────────────────────────────────
log "Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Install Docker ─────────────────────────────────────────────────────────
log "Installing Docker..."
apt-get install -y -qq apt-transport-https ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable docker
systemctl start docker
log "Docker installed: $(docker --version)"

# ── 3. Create deploy user ─────────────────────────────────────────────────────
if ! id "deploy" &>/dev/null; then
    log "Creating deploy user..."
    useradd -m -s /bin/bash deploy
    usermod -aG docker deploy
    # Copy SSH keys from root
    mkdir -p /home/deploy/.ssh
    cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys 2>/dev/null || true
    chown -R deploy:deploy /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    chmod 600 /home/deploy/.ssh/authorized_keys
fi

# ── 4. Firewall ───────────────────────────────────────────────────────────────
log "Configuring UFW firewall..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload

# ── 5. Certbot (for Let's Encrypt HTTPS) ─────────────────────────────────────
log "Installing Certbot..."
apt-get install -y -qq certbot

# ── 6. App directory ──────────────────────────────────────────────────────────
log "Creating app directory..."
mkdir -p /opt/sentinelai
chown deploy:deploy /opt/sentinelai

log ""
log "✅ Bootstrap complete!"
log ""
log "Next steps (run as deploy user):"
log "  1. su - deploy"
log "  2. cd /opt/sentinelai"
log "  3. git clone https://github.com/AlinAlexMyladoor/Code-mixed-sentiment-platform.git ."
log "  4. cp .env.example .env && nano .env  (fill in secrets)"
log "  5. ./scripts/deploy.sh your-domain.com"
