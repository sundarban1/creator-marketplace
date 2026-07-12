#!/bin/sh
set -e

echo "Waiting for database..."

until npx prisma migrate deploy; do
  echo "Database unavailable, retrying in 5 seconds..."
  sleep 5
done

echo "Migrations completed"

exec node dist/app.js