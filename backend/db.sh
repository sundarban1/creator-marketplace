#!/usr/bin/env bash
# db.sh — Run Prisma migrations and/or seed the database
# Usage: ./db.sh [--migrate-only] [--seed-only] [--reset] [--prod]
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
echo "║     Creator Marketplace — DB Setup       ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Flags ────────────────────────────────────────────────────────────────────
RUN_MIGRATE=true
RUN_SEED=true
RESET=false
PROD=false

usage() {
  echo "Usage: $0 [--migrate-only] [--seed-only] [--reset] [--prod] [--help]"
  echo ""
  echo "  (no flags)       Run migrations then seed  (default)"
  echo "  --migrate-only   Run migrations only, skip seeding"
  echo "  --seed-only      Run seeder only, skip migrations"
  echo "  --reset          Drop all tables, re-migrate, then seed  (destructive!)"
  echo "  --prod           Use 'prisma migrate deploy' instead of 'migrate dev'"
  echo ""
  echo "Examples:"
  echo "  ./db.sh                   # first-time setup: migrate + seed"
  echo "  ./db.sh --migrate-only    # schema changes only"
  echo "  ./db.sh --seed-only       # re-seed without touching schema"
  echo "  ./db.sh --reset           # nuke and redo everything"
  exit 0
}

for arg in "$@"; do
  case $arg in
    --migrate-only) RUN_SEED=false ;;
    --seed-only)    RUN_MIGRATE=false ;;
    --reset)        RESET=true ;;
    --prod)         PROD=true ;;
    --help|-h)      usage ;;
    *) error "Unknown flag: $arg"; usage ;;
  esac
done

# ─── 1. Node.js ───────────────────────────────────────────────────────────────
step "Checking Node.js"
if ! command -v node &>/dev/null; then
  error "Node.js is not installed. Install v18+ from https://nodejs.org"
  exit 1
fi
NODE_VER=$(node -e "process.stdout.write(process.versions.node)")
MAJOR="${NODE_VER%%.*}"
if [[ "$MAJOR" -lt 18 ]]; then
  error "Node.js v18+ required. Current: v${NODE_VER}"
  exit 1
fi
success "Node.js v${NODE_VER}"

# ─── 2. Environment (.env) ────────────────────────────────────────────────────
step "Checking environment"
if [[ ! -f ".env" ]]; then
  if [[ ! -f ".env.example" ]]; then
    error ".env.example not found. Cannot create .env."
    exit 1
  fi
  warn ".env not found — copying from .env.example"
  cp .env.example .env
  warn "Edit .env and set real secrets, then re-run."
fi

# Auto-generate JWT secrets if still placeholder
if grep -q "your-access-secret-change-in-production" .env; then
  warn "Generating random JWT secrets..."
  A=$(node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))")
  R=$(node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))")
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' "s|your-access-secret-change-in-production|${A}|g" .env
    sed -i '' "s|your-refresh-secret-change-in-production|${R}|g" .env
  else
    sed -i "s|your-access-secret-change-in-production|${A}|g" .env
    sed -i "s|your-refresh-secret-change-in-production|${R}|g" .env
  fi
  success "JWT secrets generated"
fi

set -a        # auto-export every variable that gets assigned
source .env
set +a        # restore normal behaviour
success "Environment loaded (NODE_ENV=${NODE_ENV:-development})"

# ─── 3. PostgreSQL check ──────────────────────────────────────────────────────
step "Checking PostgreSQL"
if command -v pg_isready &>/dev/null; then
  DB_HOST=$(echo "${DATABASE_URL:-}" | sed -n 's|.*@\([^:/]*\).*|\1|p')
  DB_PORT=$(echo "${DATABASE_URL:-}" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
  DB_PORT="${DB_PORT:-5432}"

  if ! pg_isready -h "${DB_HOST:-localhost}" -p "${DB_PORT}" -q; then
    error "PostgreSQL is not reachable at ${DB_HOST:-localhost}:${DB_PORT}"
    echo ""
    echo "  Start it with Docker:"
    echo "    docker run -d --name marketplace_postgres \\"
    echo "      -e POSTGRES_USER=postgres \\"
    echo "      -e POSTGRES_PASSWORD=postgres \\"
    echo "      -e POSTGRES_DB=creatormarket \\"
    echo "      -p 5432:5432 postgres:16-alpine"
    exit 1
  fi
  success "PostgreSQL reachable at ${DB_HOST:-localhost}:${DB_PORT}"
else
  warn "pg_isready not found — skipping connectivity check"
fi

# ─── 4. Dependencies ──────────────────────────────────────────────────────────
step "Installing dependencies"
if [[ ! -d "node_modules" ]] || [[ "package.json" -nt "node_modules/.package-lock.json" ]]; then
  npm install --silent
  success "Dependencies installed"
else
  success "Dependencies up to date"
fi

# ─── 5. Prisma generate ───────────────────────────────────────────────────────
step "Generating Prisma client"
npx --yes prisma generate
success "Prisma client generated"

# ─── 6. Migrate ───────────────────────────────────────────────────────────────
if [[ "$RUN_MIGRATE" == true ]]; then
  step "Running database migrations"

  if [[ "$RESET" == true ]]; then
    warn "⚠️  Resetting database — all data will be lost!"
    read -r -p "    Continue? [y/N] " confirm
    if [[ "${confirm,,}" != "y" ]]; then
      warn "Aborted."
      exit 0
    fi
    npx --yes prisma migrate reset --force
    success "Database reset and re-migrated"
    # After a reset, seeding is implied — keep RUN_SEED true
  elif [[ "$PROD" == true ]] || [[ "${NODE_ENV:-development}" == "production" ]]; then
    info "Production mode — running: prisma migrate deploy"
    npx --yes prisma migrate deploy
    success "Migrations deployed"
  else
    info "Development mode — running: prisma migrate dev"
    npx --yes prisma migrate dev --name init 2>/dev/null || npx --yes prisma db push
    success "Schema synced"
  fi
else
  warn "Skipping migrations (--seed-only)"
fi

# ─── 7. Seed ──────────────────────────────────────────────────────────────────
if [[ "$RUN_SEED" == true ]]; then
  step "Seeding database"
  info "Running: npm run db:seed"
  npm run db:seed
  success "Database seeded"
else
  warn "Skipping seed (--migrate-only)"
fi

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${BOLD}  Database setup complete!${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
if [[ "$RUN_SEED" == true ]]; then
  echo -e "  ${CYAN}Admin login:${NC}"
  echo -e "    Email:    admin@creatorhub.com"
  echo -e "    Password: Admin@123456"
  echo ""
fi
echo -e "  Start the server: ${CYAN}./start.sh${NC}"
echo -e "  Prisma Studio:    ${CYAN}npx prisma studio${NC}"
echo ""
