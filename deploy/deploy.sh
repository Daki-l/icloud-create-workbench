#!/usr/bin/env bash
set -euo pipefail

DIR=/opt/icloud-create-workbench

# 1. clone if absent
if [ ! -d "$DIR/.git" ]; then
  sudo mkdir -p "$DIR"
  sudo chown ubuntu:ubuntu "$DIR"
  git clone https://github.com/Daki-l/icloud-create-workbench.git "$DIR"
fi
cd "$DIR"
git log --oneline -1

# 2. .env (generate secrets once)
if [ ! -f .env ]; then
  JWT=$(openssl rand -base64 48 | tr -d '\n')
  KEY=$(openssl rand -base64 32 | tr -d '\n')
  ADM=$(openssl rand -hex 8)
  cp .env.example .env
  sed -i "s|^APP_ORIGIN=.*|APP_ORIGIN=http://140.238.34.121:4173|" .env
  sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$ADM|" .env
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT|" .env
  sed -i "s|^DATA_ENCRYPTION_KEY=.*|DATA_ENCRYPTION_KEY=$KEY|" .env
  sed -i "s|^COOKIE_SECURE=.*|COOKIE_SECURE=false|" .env
fi

echo "===== .env (non-secret values) ====="
grep -E "^(APP_ORIGIN|ADMIN_USERNAME|ADMIN_PASSWORD|COOKIE_SECURE|HOST|PORT)=" .env
echo "(JWT_SECRET / DATA_ENCRYPTION_KEY already set, hidden)"
echo

# 3. compose engine (prefer v2 plugin, fall back to v1)
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "ERROR: no docker compose found"; exit 1
fi
echo "Using: $DC ($($DC version 2>&1 | head -1))"
echo

echo "===== BUILD & UP (may take ~15 min on 1GB RAM) ====="
$DC up -d --build

echo "===== STATUS ====="
$DC ps
echo
echo "===== LOGS (last 30) ====="
$DC logs --tail=30 app || true
