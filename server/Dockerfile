# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Dependencies installed in their own layer for caching.
FROM base AS deps
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Final image — copies source + deps. The server runs TypeScript directly
# via `tsx` (no separate build step needed).
FROM base AS runner
RUN apk add --no-cache tini

# Non-root user — server doesn't need root.
RUN addgroup -g 1001 -S app && \
    adduser  -u 1001 -S app -G app

COPY --from=deps --chown=app:app /app/node_modules ./node_modules
COPY --chown=app:app . .

# Persistent directories — must be writable by the app user.
RUN mkdir -p /app/data /app/keys && chown -R app:app /app/data /app/keys
VOLUME ["/app/data", "/app/keys"]

USER app
EXPOSE 3001

# Use Node's built-in HTTP client so the image doesn't need wget/curl.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health',r=>process.exit(r.statusCode!==200))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npx", "tsx", "index.ts"]
