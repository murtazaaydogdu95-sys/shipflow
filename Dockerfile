# ── Stage 1: Install dependencies ──────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Root dependencies
COPY package.json package-lock.json ./
RUN npm ci

# MCP server dependencies
COPY packages/mcp-server/package.json packages/mcp-server/
RUN cd packages/mcp-server && npm install

# ── Stage 2: Build application ─────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/mcp-server/node_modules ./packages/mcp-server/node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build MCP server
RUN cd packages/mcp-server && npx tsc

# Build Next.js (standalone output)
RUN npm run build

# ── Stage 3: Production runner ─────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install git (GitHub import clone), prisma CLI + tsx (entrypoint), and the
# Claude Code CLI (used by the "claude" agent adapter to run coding agents)
RUN apk add --no-cache git && \
    npm install -g prisma@6 tsx @anthropic-ai/claude-code

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Create repos directory for GitHub imports
RUN mkdir -p /app/repos && chown nextjs:nodejs /app/repos

# Writable HOME for the non-root user — git config (--global) and the Claude CLI
# (~/.claude) both need it at runtime
RUN mkdir -p /home/nextjs/.claude && chown -R nextjs:nodejs /home/nextjs
ENV HOME=/home/nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema + config + generated client (needed for db push at runtime)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy seed script
COPY --from=builder /app/prisma/seed.ts ./prisma/seed.ts

# Copy MCP server dist
COPY --from=builder /app/packages/mcp-server/dist ./packages/mcp-server/dist
COPY --from=builder /app/packages/mcp-server/package.json ./packages/mcp-server/package.json

# Copy entrypoints (app + isolated agent runner used by Phase 3 pod execution)
COPY docker-entrypoint.sh ./docker-entrypoint.sh
COPY docker-runner-entrypoint.sh ./docker-runner-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh ./docker-runner-entrypoint.sh

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
