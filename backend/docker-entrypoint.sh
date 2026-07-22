#!/bin/sh
set -e

echo "Waiting for database..."

while true; do
  if output=$(npx prisma migrate deploy 2>&1); then
    echo "$output"
    break
  fi

  echo "$output"

  if echo "$output" | grep -q "P3009"; then
    echo ""
    echo "prisma migrate deploy failed with P3009: a previous migration is recorded as failed"
    echo "in the database, so Prisma will not apply further migrations automatically. Retrying"
    echo "will not fix this on its own — it needs a manual decision. To resolve:"
    echo ""
    echo "  1. Open a shell on this service (or psql into the database) and check which tables exist:"
    echo "       SELECT tablename FROM pg_tables WHERE schemaname='public';"
    echo "  2. If no tables exist (the failed migration rolled back cleanly), mark it rolled back:"
    echo "       npx prisma migrate resolve --rolled-back <migration_name>"
    echo "  3. If the tables DO exist (it finished but wasn't recorded), mark it applied instead:"
    echo "       npx prisma migrate resolve --applied <migration_name>"
    echo "  4. Redeploy this service (or re-run: npx prisma migrate deploy)"
    echo ""
    exit 1
  fi

  echo "Database unavailable, retrying in 5 seconds..."
  sleep 5
done

echo "Migrations completed"

exec node dist/app.js