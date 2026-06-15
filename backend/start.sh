#!/usr/bin/env bash
set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
step()    { echo -e "\n${BOLD}▸ $*${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BOLD}"
echo "╔══════════════════════════════════════════╗"
echo "║     Creator Marketplace — Backend        ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Parse flags ──────────────────────────────────────────────────────────────
MODE="dev"          # dev | prod | docker
SKIP_MIGRATE=false
RESET_DB=false
RUN_SEED=false
FRESH=false         # full Docker wipe: containers + volumes + local images

usage() {
  echo "Usage: $0 [--prod] [--docker] [--skip-migrate] [--seed] [--reset-db] [--fresh]"
  echo ""
  echo "  (no flags)       Start in development mode (tsx watch)"
  echo "  --prod           Build TypeScript and run compiled output"
  echo "  --docker         Start via Docker Compose (postgres + pgAdmin + api)"
  echo "  --skip-migrate   Skip Prisma migrate / db push"
  echo "  --seed           Run database seeder after migrations"
  echo "  --reset-db       Drop and recreate database volumes, then seed (destructive!)"
  echo "  --fresh          Full Docker reset: remove containers, volumes AND images,"
  echo "                   then rebuild everything from scratch (implies --reset-db)"
  echo ""
  echo "  Examples:"
  echo "    ./start.sh --docker            # start / update existing containers"
  echo "    ./start.sh --docker --reset-db # wipe DB data and reseed"
  echo "    ./start.sh --docker --fresh    # full clean reinstall"
  echo ""
  echo "  For database-only setup (no server start): ./db.sh"
  exit 0
}

for arg in "$@"; do
  case $arg in
    --prod)          MODE="prod" ;;
    --docker)        MODE="docker" ;;
    --skip-migrate)  SKIP_MIGRATE=true ;;
    --seed)          RUN_SEED=true ;;
    --reset-db)      RESET_DB=true; RUN_SEED=true ;;
    --fresh)         FRESH=true; RESET_DB=true; RUN_SEED=true ;;
    --help|-h)       usage ;;
    *) error "Unknown flag: $arg"; usage ;;
  esac
done

# ─── Docker mode — hand off to Compose ────────────────────────────────────────
if [[ "$MODE" == "docker" ]]; then
  step "Docker Compose mode"

  # ── Pre-flight checks ────────────────────────────────────────────────────────
  if ! command -v docker &>/dev/null; then
    error "Docker is not installed. Install it from https://docs.docker.com/get-docker/"
    exit 1
  fi

  if ! docker info &>/dev/null; then
    error "Docker daemon is not running. Start Docker Desktop and try again."
    exit 1
  fi

  if [[ ! -f ".env" ]]; then
    warn ".env not found — copying from .env.example"
    cp .env.example .env
    warn "Edit .env and set real secrets, then re-run this script."
    exit 1
  fi

  # ── Teardown (if requested) ──────────────────────────────────────────────────
  if [[ "$FRESH" == true ]]; then
    step "Full reset — removing containers, volumes and local images"
    docker compose down --rmi local -v --remove-orphans 2>/dev/null || true
    success "Removed all containers, volumes and locally-built images"

    step "Rebuilding images from scratch (no cache)"
    docker compose build --no-cache
    success "Images rebuilt"

  elif [[ "$RESET_DB" == true ]]; then
    step "Resetting database — removing containers and volumes"
    docker compose down -v --remove-orphans 2>/dev/null || true
    success "Removed containers and database volumes"
  fi

  # ── Start ────────────────────────────────────────────────────────────────────
  step "Starting containers"
  docker compose up --build -d
  success "Containers started"

  # ── Health check — wait for API ───────────────────────────────────────────────
  step "Waiting for services to become healthy"
  WAIT_SECS=0
  MAX_WAIT=120   # 2 minutes

  while [[ $WAIT_SECS -lt $MAX_WAIT ]]; do
    # Use || true so grep's non-zero exit on no-match doesn't kill the script
    API_STATUS=$(docker compose ps --format '{{.Service}} {{.Health}}' 2>/dev/null \
      | grep '^api' | awk '{print $2}' || true)
    DB_STATUS=$(docker compose ps --format '{{.Service}} {{.Health}}' 2>/dev/null \
      | grep '^postgres' | awk '{print $2}' || true)

    if [[ "$API_STATUS" == "healthy" ]]; then
      echo ""
      break
    fi

    printf "\r  postgres: %-10s  api: %-10s  (%ds)" \
      "${DB_STATUS:-starting}" "${API_STATUS:-starting}" "$WAIT_SECS"

    sleep 3
    WAIT_SECS=$((WAIT_SECS + 3))
  done

  if [[ $WAIT_SECS -ge $MAX_WAIT ]]; then
    echo ""
    warn "API did not become healthy within ${MAX_WAIT}s — check logs:"
    warn "  docker compose logs api"
  fi

  # ── Wait for pgAdmin then open browser ────────────────────────────────────────
  info "Waiting for pgAdmin to be ready..."
  PG_WAIT=0
  PG_MAX=60

  while [[ $PG_WAIT -lt $PG_MAX ]]; do
    # Try curl first, then wget, then raw TCP — whatever is available on the host
    if curl -sf "http://localhost:5050/misc/ping" >/dev/null 2>&1; then
      break
    elif wget -qO- "http://localhost:5050/misc/ping" >/dev/null 2>&1; then
      break
    elif (echo >/dev/tcp/localhost/5050) 2>/dev/null; then
      break
    fi
    sleep 2
    PG_WAIT=$((PG_WAIT + 2))
  done

  if [[ $PG_WAIT -ge $PG_MAX ]]; then
    warn "pgAdmin did not respond within ${PG_MAX}s — open http://localhost:5050 manually"
  else
    success "pgAdmin is ready"
    if command -v open &>/dev/null; then
      open "http://localhost:5050"
    elif command -v xdg-open &>/dev/null; then
      xdg-open "http://localhost:5050"
    fi
  fi

  # ── Summary ──────────────────────────────────────────────────────────────────
  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}${BOLD}  Docker stack is running${NC}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "  ${GREEN}API${NC}      → http://localhost:3000"
  echo -e "  ${GREEN}Docs${NC}     → http://localhost:3000/api/docs"
  echo -e "  ${GREEN}Health${NC}   → http://localhost:3000/health"
  echo -e "  ${GREEN}pgAdmin${NC}  → http://localhost:5050"
  echo ""
  echo -e "  ${CYAN}pgAdmin login:${NC}  admin@creatorhub.com  /  admin"
  echo ""
  echo -e "  ${CYAN}Logs:${NC}  docker compose logs -f api"
  echo -e "  ${CYAN}Stop:${NC}  docker compose down"
  echo ""
  exit 0
fi

# ─── Local mode — dev or prod ─────────────────────────────────────────────────

# 1. Node.js
step "Checking Node.js"
if ! command -v node &>/dev/null; then
  error "Node.js is not installed. Install v20+ from https://nodejs.org"
  exit 1
fi
NODE_VERSION=$(node -e "process.stdout.write(process.versions.node)")
MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
if [[ "$MAJOR" -lt 18 ]]; then
  error "Node.js v18+ required. Current: v${NODE_VERSION}"
  exit 1
fi
success "Node.js v${NODE_VERSION}"

# 2. .env
step "Checking environment"
if [[ ! -f ".env" ]]; then
  warn ".env not found — copying from .env.example"
  cp .env.example .env
  warn "Generated .env with defaults. Edit secrets before production use."
fi

# Auto-generate JWT secrets if still using placeholder values
if grep -q "your-access-secret-change-in-production" .env; then
  warn "Generating random JWT secrets in .env..."
  ACCESS_SECRET=$(node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))")
  REFRESH_SECRET=$(node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))")
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' "s|your-access-secret-change-in-production|${ACCESS_SECRET}|g" .env
    sed -i '' "s|your-refresh-secret-change-in-production|${REFRESH_SECRET}|g" .env
  else
    sed -i "s|your-access-secret-change-in-production|${ACCESS_SECRET}|g" .env
    sed -i "s|your-refresh-secret-change-in-production|${REFRESH_SECRET}|g" .env
  fi
  success "JWT secrets generated"
fi

set -a        # auto-export every variable that gets assigned
source .env
set +a        # restore normal behaviour
success "Environment loaded (NODE_ENV=${NODE_ENV:-development})"

# 3. PostgreSQL
step "Checking PostgreSQL"
DB_HOST=$(echo "${DATABASE_URL:-}" | sed -n 's|.*@\([^:/]*\).*|\1|p')
DB_PORT=$(echo "${DATABASE_URL:-}" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_PORT="${DB_PORT:-5432}"

_pg_reachable() {
  if command -v pg_isready &>/dev/null; then
    pg_isready -h "${DB_HOST:-localhost}" -p "${DB_PORT}" -q
  else
    # Fallback: try a TCP connection via /dev/tcp (bash built-in)
    (echo >/dev/tcp/"${DB_HOST:-localhost}"/"${DB_PORT}") 2>/dev/null
  fi
}

if ! _pg_reachable; then
  error "PostgreSQL is not reachable at ${DB_HOST:-localhost}:${DB_PORT}"
  echo ""
  if [[ "$RESET_DB" == true ]]; then
    echo "  You used --reset-db but postgres is not running locally."
    echo "  To reset the full Docker stack, run instead:"
    echo ""
    echo "    $0 --docker --fresh     ← wipes containers, volumes, images and rebuilds"
    echo "    $0 --docker --reset-db  ← wipes only the DB volume"
  else
    echo "  Start PostgreSQL locally, or launch the Docker stack:"
    echo ""
    echo "    $0 --docker"
  fi
  echo ""
  exit 1
fi
success "PostgreSQL is reachable at ${DB_HOST:-localhost}:${DB_PORT}"

# 4. npm install
step "Installing dependencies"
if [[ ! -d "node_modules" ]] || [[ "package.json" -nt "node_modules/.package-lock.json" ]]; then
  info "Running npm install..."
  npm install
  success "Dependencies installed"
else
  success "Dependencies already up to date"
fi

# 5. Prisma generate
step "Generating Prisma client"
npx prisma generate
success "Prisma client generated"

# 6. Database migrations
if [[ "$SKIP_MIGRATE" == false ]]; then
  step "Running database migrations"

  if [[ "$RESET_DB" == true ]]; then
    warn "Resetting database (--reset-db flag)..."
    npx prisma migrate reset --force
    success "Database reset and migrated"
  elif [[ "$NODE_ENV" == "production" ]] || [[ "$MODE" == "prod" ]]; then
    info "Production mode — running prisma migrate deploy"
    npx prisma migrate deploy
    success "Migrations deployed"
  else
    info "Development mode — running prisma migrate dev"
    npx prisma migrate dev --name init 2>/dev/null || npx prisma db push
    success "Database schema synced"
  fi
else
  warn "Skipping migrations (--skip-migrate)"
fi

# 7. Seed (only when --seed or --reset-db is passed)
if [[ "$RUN_SEED" == true ]]; then
  step "Seeding database"
  info "Running: npm run db:seed"
  npm run db:seed
  success "Database seeded"
fi

# 9. Build (prod only)
if [[ "$MODE" == "prod" ]]; then
  step "Building TypeScript"
  npm run build
  success "Build complete → dist/"
fi

# ─── Start ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${BOLD}  Starting server in ${MODE} mode...${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${CYAN}API${NC}     → http://localhost:${PORT:-3000}"
echo -e "  ${CYAN}Docs${NC}    → http://localhost:${PORT:-3000}/api/docs"
echo -e "  ${CYAN}Health${NC}  → http://localhost:${PORT:-3000}/health"
echo ""

if [[ "$MODE" == "prod" ]]; then
  exec node dist/app.js
else
  exec npx tsx watch src/app.ts
fi
