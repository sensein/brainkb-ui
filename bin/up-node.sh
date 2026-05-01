#!/usr/bin/env bash
# Non-Docker UI deploy for an AWS / VPS box.
#
# Builds the Next.js app from the current checkout and runs it under PM2 on
# the host's Node runtime — useful when you don't want to deal with Docker
# layer-cache + NEXT_PUBLIC_* baking issues.
#
# Pair this with:
#   - The BrainKB backend running separately (Docker-compose.unified.yml or
#     its own systemd / PM2 setup).
#   - An nginx / ALB in front terminating TLS and forwarding to the port
#     this app listens on (default 3000, override via PORT).
#
# Usage (run from anywhere):
#       ./bin/up-node.sh                       # build + (re)start
#       ./bin/up-node.sh --status              # print PM2 status + exit
#       ./bin/up-node.sh --logs                # tail PM2 logs
#       ./bin/up-node.sh --stop                # stop the app
#       ./bin/up-node.sh --restart             # restart without rebuild
#       ./bin/up-node.sh --no-install          # skip `npm install`
#
# Customise via env vars:
#   PM2_APP_NAME=brainkb-ui     PM2 process label (default: brainkb-ui)
#   PORT=3000                   Port `next start` binds
#   NODE_ENV=production         Forwarded to next start
#   USE_NPM_CI=1                Use `npm ci` instead of `npm install --force`
#   SKIP_BUILD=1                Don't run `npm run build` (useful in CI)
#
# Idempotent: re-running rebuilds and reloads PM2 in place. PM2's `startup`
# integration is left to the operator (run `pm2 startup` once to install
# the systemd hook so PM2 restarts on reboot).

set -euo pipefail

# ── Args ─────────────────────────────────────────────────────────────────
ACTION="deploy"
RUN_INSTALL=1
for arg in "$@"; do
  case "$arg" in
    --status)     ACTION="status" ;;
    --logs)       ACTION="logs" ;;
    --stop)       ACTION="stop" ;;
    --restart)    ACTION="restart" ;;
    --no-install) RUN_INSTALL=0 ;;
    -h|--help)
      sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

# ── Config ───────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_NAME="${PM2_APP_NAME:-brainkb-ui}"
PORT="${PORT:-3000}"
NODE_ENV_VALUE="${NODE_ENV:-production}"

# ── Logging helpers ──────────────────────────────────────────────────────
log()  { printf '\033[36m[deploy]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[deploy]\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[31m[deploy]\033[0m %s\n' "$*" >&2; exit 1; }

# ── Tooling sanity checks ────────────────────────────────────────────────
command -v node >/dev/null 2>&1 || fail "node not found in PATH (need >= 18.18 for Next.js 14)"
command -v npm  >/dev/null 2>&1 || fail "npm not found in PATH"

NODE_MAJOR="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
if [ "${NODE_MAJOR}" -lt 18 ]; then
  fail "Node ${NODE_MAJOR} is too old. Install Node 18 or newer (e.g. via nvm)."
fi

if ! command -v pm2 >/dev/null 2>&1; then
  log "pm2 not found — installing globally (this needs sudo or root)"
  if ! npm install -g pm2; then
    fail "pm2 install failed. Try: 'sudo npm install -g pm2' (or use nvm so npm i -g doesn't need sudo)."
  fi
fi

cd "${UI_DIR}"

# ── Maintenance actions ──────────────────────────────────────────────────
case "${ACTION}" in
  status)
    pm2 list
    pm2 show "${APP_NAME}" 2>/dev/null || warn "PM2 process '${APP_NAME}' is not running"
    exit 0
    ;;
  logs)
    exec pm2 logs "${APP_NAME}"
    ;;
  stop)
    pm2 stop  "${APP_NAME}" 2>/dev/null || warn "no '${APP_NAME}' to stop"
    pm2 delete "${APP_NAME}" 2>/dev/null || true
    pm2 save --force >/dev/null 2>&1 || true
    exit 0
    ;;
  restart)
    pm2 restart "${APP_NAME}" --update-env || fail "PM2 restart failed (run with no flags to deploy fresh)"
    exit 0
    ;;
esac

# ── Deploy: env file ─────────────────────────────────────────────────────
if [ ! -f "${UI_DIR}/.env.local" ]; then
  fail ".env.local missing in ${UI_DIR}. Copy from a teammate or .env.deploy.example and fill it in."
fi

if ! grep -q '^NEXTAUTH_URL=' "${UI_DIR}/.env.local" \
   || [ -z "$(grep '^NEXTAUTH_URL=' "${UI_DIR}/.env.local" | cut -d= -f2-)" ]; then
  warn "NEXTAUTH_URL is missing or empty in .env.local — auth pages will fail."
fi

# Surface critical NEXT_PUBLIC_* vars at deploy time so we don't silently
# bake "" into the client bundle. Each is only a warning, not a hard fail.
for v in \
  NEXT_PUBLIC_USER_MANAGEMENT_API_BASE \
  NEXT_PUBLIC_ML_SERVICE_API_BASE \
  NEXT_PUBLIC_API_QUERY_ENDPOINT ; do
  if ! grep -qE "^${v}=." "${UI_DIR}/.env.local"; then
    warn "${v} is missing or empty in .env.local — pages that depend on it will 'environment variable is not set' at runtime."
  fi
done

# ── Deploy: install ──────────────────────────────────────────────────────
if [ "${RUN_INSTALL}" = "1" ]; then
  if [ "${USE_NPM_CI:-0}" = "1" ] && [ -f "${UI_DIR}/package-lock.json" ]; then
    log "running npm ci"
    npm ci
  else
    log "running npm install --force (override with USE_NPM_CI=1)"
    npm install --force
  fi
else
  log "skipping npm install (--no-install)"
fi

# ── Deploy: build ────────────────────────────────────────────────────────
if [ "${SKIP_BUILD:-0}" = "1" ]; then
  log "skipping build (SKIP_BUILD=1)"
else
  log "running npm run build (NEXT_PUBLIC_* values from .env.local get baked in here)"
  NODE_ENV="${NODE_ENV_VALUE}" npm run build
fi

# ── Deploy: PM2 (re)start ────────────────────────────────────────────────
# `pm2 startOrReload` would be ideal but needs an ecosystem file; use the
# explicit reload-or-start dance so this works without one.
if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  log "reloading PM2 process '${APP_NAME}' (zero-downtime)"
  PORT="${PORT}" NODE_ENV="${NODE_ENV_VALUE}" \
    pm2 reload "${APP_NAME}" --update-env
else
  log "starting PM2 process '${APP_NAME}' on :${PORT}"
  PORT="${PORT}" NODE_ENV="${NODE_ENV_VALUE}" \
    pm2 start npm --name "${APP_NAME}" -- start
fi

pm2 save --force >/dev/null

log "deploy complete. Status:"
pm2 list

cat <<'EOF'

Next steps (one-time):
  - Run `pm2 startup` and follow the printed command, so PM2 + your apps
    survive reboots via systemd.
  - Front this with nginx / ALB so port 3000 isn't exposed publicly.
  - To follow logs:    ./bin/up-node.sh --logs
  - To restart only:   ./bin/up-node.sh --restart
EOF
