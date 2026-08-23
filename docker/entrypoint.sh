#!/bin/sh
set -e

if [ -f prisma/schema.prisma ] && [ -d prisma/migrations ]; then
    echo "Running Prisma migrations..."
    pnpm prisma migrate deploy
else
    echo "Skipping Prisma migrations (schema or migrations directory missing)."
fi

exec node dist/main
