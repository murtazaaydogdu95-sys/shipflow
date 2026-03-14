#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."

# Wait for PostgreSQL using Node.js TCP check (no pg client needed)
until node -e "
const net = require('net');
const socket = new net.Socket();
socket.setTimeout(1000);
socket.connect(5432, 'postgres', () => { socket.destroy(); process.exit(0); });
socket.on('error', () => process.exit(1));
socket.on('timeout', () => { socket.destroy(); process.exit(1); });
" 2>/dev/null; do
  echo "PostgreSQL not ready, retrying in 2s..."
  sleep 2
done

echo "PostgreSQL is ready!"

# Push schema (creates tables if they don't exist)
echo "Running prisma db push..."
npx prisma db push --skip-generate

echo "Starting ShipFlow..."
exec node server.js
