#!/bin/sh
set -e

# ─── Wait for DB to be reachable ────────────────────────────
if [ -n "${DATABASE_URL}" ]; then
  echo "[entrypoint] Waiting for database..."

  # Extract host:port from DATABASE_URL (mysql://user:pass@host:port/db)
  DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|')
  DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*@[^:]+:([0-9]+).*|\1|')
  DB_PORT=${DB_PORT:-3306}

  i=0
  until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
    i=$((i+1))
    if [ "$i" -ge 60 ]; then
      echo "[entrypoint] Database not reachable at ${DB_HOST}:${DB_PORT} after 60s, giving up."
      exit 1
    fi
    sleep 1
  done
  echo "[entrypoint] Database reachable at ${DB_HOST}:${DB_PORT}."
fi

# ─── Push schema ────────────────────────────────────────────
if [ "${RUN_MIGRATIONS:-true}" = "true" ] && [ -n "${DATABASE_URL}" ]; then
  echo "[entrypoint] Pushing Prisma schema to database..."
  node ./node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss
fi

# ─── Optional seed ──────────────────────────────────────────
if [ "${RUN_SEED:-false}" = "true" ] && [ -n "${DATABASE_URL}" ]; then
  echo "[entrypoint] Seeding database..."
  node ./node_modules/tsx/dist/cli.mjs prisma/seed.ts || echo "[entrypoint] Seed failed (continuing)."
fi

exec "$@"