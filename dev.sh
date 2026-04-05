#!/bin/bash
#
# dev.sh — Start the entire Phone Assistant stack in one shot.
#
# Services started:
#   1. Docker  (Postgres + Redis)
#   2. Backend (Fastify on :3000)
#   3. App     (Next.js authenticated app on :3001)
#   4. Web     (Next.js marketing site on :3003)
#   5. ngrok   (tunnel to :3000 for Twilio webhooks)
#
# Usage:
#   ./dev.sh          Start everything
#   ./dev.sh --no-ngrok   Start without ngrok
#
# Press Ctrl+C to stop all services.

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# ── Colors ────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Flags ─────────────────────────────────────────────────────────
SKIP_NGROK=false
NGROK_URL=""
for arg in "$@"; do
  case "$arg" in
    --no-ngrok) SKIP_NGROK=true ;;
  esac
done

# ── Cleanup on exit ───────────────────────────────────────────────
PIDS=()

cleanup() {
  echo ""
  echo -e "${BOLD}${YELLOW}⏹  Shutting down all services...${NC}"

  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null
      wait "$pid" 2>/dev/null
    fi
  done

  echo -e "${GREEN}✓  All services stopped.${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# ── Helper: prefix output with colored label ──────────────────────
run_with_label() {
  local label="$1"
  local color="$2"
  shift 2
  "$@" 2>&1 | while IFS= read -r line; do
    echo -e "${color}[${label}]${NC} $line"
  done
}

get_ngrok_url() {
  local response
  local url

  response="$(curl -sS http://127.0.0.1:4040/api/tunnels 2>/dev/null || true)"
  if [ -z "$response" ]; then
    return 1
  fi

  url="$(printf '%s' "$response" | tr -d '\n' | sed -nE 's/.*"public_url":"(https:[^"]+)".*/\1/p' | head -n 1)"
  if [ -z "$url" ]; then
    return 1
  fi

  printf '%s\n' "$url"
}

wait_for_ngrok_url() {
  local attempts="${1:-20}"
  local delay="${2:-1}"
  local url=""

  for _ in $(seq 1 "$attempts"); do
    if url="$(get_ngrok_url)"; then
      printf '%s\n' "$url"
      return 0
    fi
    sleep "$delay"
  done

  return 1
}

# ── Banner ────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${MAGENTA}╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}${MAGENTA}║   📞  Phone Assistant Dev Server    ║${NC}"
echo -e "${BOLD}${MAGENTA}╚══════════════════════════════════════╝${NC}"
echo ""

# ── 1. Docker ─────────────────────────────────────────────────────
echo -e "${BLUE}▸ Starting Docker services (Postgres + Redis)...${NC}"
docker compose up -d 2>&1 | while IFS= read -r line; do
  echo -e "${BLUE}[docker]${NC} $line"
done

# Wait for Postgres to be ready
echo -e "${BLUE}[docker]${NC} Waiting for Postgres..."
for i in $(seq 1 30); do
  if docker exec phone-assistant-db pg_isready -U postgres >/dev/null 2>&1; then
    echo -e "${GREEN}[docker]${NC} ✓ Postgres is ready"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo -e "${RED}[docker]${NC} ✗ Postgres failed to start"
    exit 1
  fi
  sleep 1
done

# Wait for Redis to be ready
for i in $(seq 1 15); do
  if docker exec phone-assistant-redis redis-cli ping >/dev/null 2>&1; then
    echo -e "${GREEN}[docker]${NC} ✓ Redis is ready"
    break
  fi
  if [ "$i" -eq 15 ]; then
    echo -e "${RED}[docker]${NC} ✗ Redis failed to start"
    exit 1
  fi
  sleep 1
done
echo ""

# ── 2. Backend ────────────────────────────────────────────────────
echo -e "${GREEN}▸ Starting Backend (Fastify :3000)...${NC}"
run_with_label "backend" "$GREEN" bun run --watch src/server.ts &
PIDS+=($!)
sleep 2

# ── 3. App (authenticated) ───────────────────────────────────────
echo -e "${CYAN}▸ Starting App (Next.js :3001)...${NC}"
(cd apps/app && run_with_label "app" "$CYAN" npx next dev --port 3001) &
PIDS+=($!)

# ── 4. Web (marketing) ───────────────────────────────────────────
echo -e "${MAGENTA}▸ Starting Web (Next.js :3003)...${NC}"
(cd apps/web && run_with_label "web" "$MAGENTA" npx next dev --port 3003) &
PIDS+=($!)

# ── 5. ngrok ──────────────────────────────────────────────────────
if [ "$SKIP_NGROK" = false ]; then
  if command -v ngrok >/dev/null 2>&1; then
    echo -e "${YELLOW}▸ Starting ngrok tunnel (:3000)...${NC}"
    run_with_label "ngrok" "$YELLOW" ngrok http 3000 --log stdout --log-level info &
    PIDS+=($!)

    echo -e "${YELLOW}[ngrok]${NC} Waiting for public URL..."
    if NGROK_URL="$(wait_for_ngrok_url 20 1)"; then
      echo -e "${GREEN}[ngrok]${NC} ✓ Public URL: ${NGROK_URL}"
    else
      echo -e "${YELLOW}[ngrok]${NC} ! ngrok started, but the public URL could not be fetched from http://127.0.0.1:4040/api/tunnels"
    fi
  else
    echo -e "${RED}[ngrok]${NC} ✗ ngrok is not installed or not on your PATH"
    SKIP_NGROK=true
  fi
else
  echo -e "${YELLOW}▸ Skipping ngrok (--no-ngrok flag)${NC}"
fi

# ── Ready ─────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}══════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}  ✓ All services are starting up!${NC}"
echo -e "${BOLD}${GREEN}══════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}Backend${NC}   →  http://localhost:3000"
echo -e "  ${BOLD}App${NC}       →  http://localhost:3001"
echo -e "  ${BOLD}Web${NC}       →  http://localhost:3003"
if [ "$SKIP_NGROK" = false ]; then
  if [ -n "$NGROK_URL" ]; then
    echo -e "  ${BOLD}ngrok${NC}     →  ${NGROK_URL}"
    echo -e "  ${BOLD}Webhook${NC}   →  ${NGROK_URL}/webhooks/twilio/voice"
  else
    echo -e "  ${BOLD}ngrok${NC}     →  URL unavailable (check [ngrok] logs above)"
  fi
fi
echo -e "  ${BOLD}Postgres${NC}  →  localhost:5432"
echo -e "  ${BOLD}Redis${NC}     →  localhost:6379"
echo ""
echo -e "  Press ${BOLD}Ctrl+C${NC} to stop everything."
echo ""

# Wait for all background processes
wait
