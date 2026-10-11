#!/bin/sh
PORT="${PORT:-8080}"
npx next start -H 0.0.0.0 -p "$PORT" &
server=$!
if npx prisma migrate deploy && npx tsx prisma/seed.ts; then
  echo "database ready"
else
  echo "database prepare failed" >&2
fi
wait "$server"
