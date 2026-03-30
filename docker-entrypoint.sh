#!/bin/sh
set -e

# Extract PostgreSQL host from DATABASE_URL, fallback to 'postgres' (Docker Compose default)
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
DB_HOST=${DB_HOST:-postgres}
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_PORT=${DB_PORT:-5432}

echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."

# Wait for PostgreSQL using Node.js TCP check (no pg client needed)
until node -e "
const net = require('net');
const socket = new net.Socket();
socket.setTimeout(1000);
socket.connect(${DB_PORT}, '${DB_HOST}', () => { socket.destroy(); process.exit(0); });
socket.on('error', () => process.exit(1));
socket.on('timeout', () => { socket.destroy(); process.exit(1); });
" 2>/dev/null; do
  echo "PostgreSQL not ready, retrying in 2s..."
  sleep 2
done

echo "PostgreSQL is ready!"

# Remove prisma.config.ts in production to avoid module resolution errors
rm -f /app/prisma.config.ts

# Push schema (creates tables if they don't exist)
echo "Running prisma db push..."
npx prisma db push --skip-generate --schema prisma/schema.prisma

echo "Starting Codepylot..."
exec node server.js
