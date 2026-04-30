#!/usr/bin/env bash
# Bring up the full BrainKB deployment (backend + UI) on a single host.
#
# Order of operations:
#   1. Sanity-check docker / compose are installed and the daemon is up.
#   2. Create the shared `brainkb-network` if it does not yet exist.
#   3. Start the backend stack from BrainKB/docker-compose.unified.yml.
#   4. Wait for the backend's health to go green.
#   5. Build + start the UI stack (this repo) — picks up NEXT_PUBLIC_* from
#      the host environment so the client bundle gets baked with public
#      URLs the user's browser can actually reach (NOT docker hostnames).
#
# Usage (run from anywhere):
#       ./bin/up.sh                       # auto-detect ../BrainKB
#       ./bin/up.sh --with-proxy          # also start the nginx reverse proxy
#       BRAINKB_DIR=/srv/brainkb ./bin/up.sh
#
# Customise paths/ports/timeouts via env vars at the top of the script.
# All NEXT_PUBLIC_* values you `export` before running are forwarded into
# the UI build args by docker-compose.yml.

set -euo pipefail

# ── Args ─────────────────────────────────────────────────────────────────
WITH_PROXY=0
for arg in "$@"; do
  case "$arg" in
    --with-proxy) WITH_PROXY=1 ;;
    -h|--help)
      sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

# ── Paths ────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BRAINKB_DIR="${BRAINKB_DIR:-$(cd "${UI_DIR}/../BrainKB" 2>/dev/null && pwd || true)}"
NETWORK_NAME="${BRAINKB_NETWORK:-brainkb-network}"
HEALTH_TIMEOUT_SECS="${HEALTH_TIMEOUT_SECS:-300}"
# Probe usermanagement_service (:8004) by default — that's the supervisor
# program the UI auth flow blocks on. Port 8000 (Django token manager) is
# the unified container's own Docker healthcheck but doesn't tell us
# anything about whether the UI's dependencies are actually up. Override
# with BACKEND_HEALTH_URL=... if you want a different probe.
BACKEND_HEALTH_URL="${BACKEND_HEALTH_URL:-http://localhost:${USERMANAGEMENT_SERVICE_PORT:-8004}/api/auth/providers}"

# ── Logging helpers ──────────────────────────────────────────────────────
log()  { printf '\033[36m[up]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[up]\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[31m[up]\033[0m %s\n' "$*" >&2; exit 1; }

# ── 1. Sanity checks ─────────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || fail "docker not found in PATH"
docker info >/dev/null 2>&1 || fail "docker daemon is not reachable (is it running?)"

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  fail "neither 'docker compose' (v2) nor 'docker-compose' (v1) is available"
fi
log "using compose command: ${COMPOSE[*]}"

[ -n "${BRAINKB_DIR}" ] && [ -d "${BRAINKB_DIR}" ] \
  || fail "BrainKB backend repo not found. Set BRAINKB_DIR=/path/to/BrainKB"
[ -f "${BRAINKB_DIR}/docker-compose.unified.yml" ] \
  || fail "${BRAINKB_DIR}/docker-compose.unified.yml is missing"
[ -f "${UI_DIR}/docker-compose.yml" ] \
  || fail "${UI_DIR}/docker-compose.yml is missing"

# Warn loudly if NEXT_PUBLIC_* still default to localhost — the UI bundle
# will be baked with whatever .env.local says, and `localhost` URLs won't
# work for any browser hitting the deployment from outside the host.
if [ -z "${NEXT_PUBLIC_USER_MANAGEMENT_API_BASE:-}" ] \
&& [ -z "${NEXT_PUBLIC_ML_SERVICE_API_BASE:-}" ]; then
  warn "no NEXT_PUBLIC_* overrides exported — the UI will bake .env.local"
  warn "values (likely http://localhost:*) into the client bundle."
  warn "For an AWS / remote deploy, export the public URLs first, e.g.:"
  warn "    export NEXT_PUBLIC_USER_MANAGEMENT_API_BASE=https://api.example.com"
  warn "    export NEXT_PUBLIC_ML_SERVICE_API_BASE=https://api.example.com"
  warn "    export NEXTAUTH_URL=https://app.example.com"
fi

# ── 2. Shared network ────────────────────────────────────────────────────
if docker network inspect "${NETWORK_NAME}" >/dev/null 2>&1; then
  log "network '${NETWORK_NAME}' already exists"
else
  log "creating network '${NETWORK_NAME}'"
  docker network create "${NETWORK_NAME}" >/dev/null
fi

# ── 3. Backend ───────────────────────────────────────────────────────────
log "starting backend (${BRAINKB_DIR})"
( cd "${BRAINKB_DIR}" && "${COMPOSE[@]}" -f docker-compose.unified.yml up -d )

# ── 4. Wait for backend health ───────────────────────────────────────────
log "waiting up to ${HEALTH_TIMEOUT_SECS}s for backend at ${BACKEND_HEALTH_URL}"
deadline=$(( $(date +%s) + HEALTH_TIMEOUT_SECS ))
while :; do
  if curl -sSf -o /dev/null --max-time 5 "${BACKEND_HEALTH_URL}"; then
    log "backend is up"
    break
  fi
  if [ "$(date +%s)" -ge "${deadline}" ]; then
    warn "backend did not become healthy within ${HEALTH_TIMEOUT_SECS}s"
    warn "continuing anyway — check 'docker compose logs' if the UI fails"
    break
  fi
  sleep 3
done

# ── 5. UI (+ optional nginx proxy) ───────────────────────────────────────
UI_COMPOSE_ARGS=(-f docker-compose.yml)
if [ "${WITH_PROXY}" = "1" ]; then
  [ -f "${UI_DIR}/docker-compose.proxy.yml" ] \
    || fail "--with-proxy requested but docker-compose.proxy.yml is missing"
  [ -f "${UI_DIR}/nginx/nginx.conf" ] \
    || fail "--with-proxy requested but nginx/nginx.conf is missing"
  UI_COMPOSE_ARGS+=(-f docker-compose.proxy.yml)
  log "building + starting UI + proxy (${UI_DIR})"
else
  log "building + starting UI (${UI_DIR})"
fi
( cd "${UI_DIR}" && "${COMPOSE[@]}" "${UI_COMPOSE_ARGS[@]}" up -d --build )

log "all stacks are up. Status:"
( cd "${BRAINKB_DIR}" && "${COMPOSE[@]}" -f docker-compose.unified.yml ps )
( cd "${UI_DIR}"      && "${COMPOSE[@]}" "${UI_COMPOSE_ARGS[@]}" ps )
