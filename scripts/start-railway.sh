#!/bin/sh
set -eu
npx prisma migrate deploy
npx tsx prisma/seed.ts
exec npx next start -H 0.0.0.0 -p "${PORT:-8080}"
