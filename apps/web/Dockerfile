# Multi-stage Dockerfile for Next.js App Router Frontend
# Stage 1: Dependencies
FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY apps/web/package*.json ./apps/web/

RUN npm install

# Stage 2: Builder
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared-types ./packages/shared-types
COPY apps/web ./apps/web
COPY package*.json ./

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=packages/shared-types
RUN npm run build --workspace=apps/web

# Stage 3: Production Runner (Non-root user)
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["npm", "run", "start", "--workspace=apps/web"]
