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

# Configure git for agent operations (pull/push/commit).
# The GitHub import strips the token from the remote URL, so authenticate via an
# insteadOf rewrite using a PAT (GIT_GITHUB_TOKEN). No-op if the token is unset.
if [ -n "$GIT_GITHUB_TOKEN" ]; then
  git config --global url."https://x-access-token:${GIT_GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"
fi
# Commit identity (agents run `git commit`) and trust mounted repo dirs
git config --global user.email "${GIT_AUTHOR_EMAIL:-agent@codepylot.dev}"
git config --global user.name "${GIT_AUTHOR_NAME:-CodePylot Agent}"
git config --global --add safe.directory '*'

echo "Starting Codepylot..."
exec node server.js
