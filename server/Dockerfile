# syntax=docker/dockerfile:1.7
FROM node:22-alpine
WORKDIR /app/server
ENV NODE_ENV=production HOST=0.0.0.0
COPY server/package.json server/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev
COPY server/ ./
COPY shared/ /app/shared/
RUN apk add --no-cache tini && mkdir -p /app/server/keys && chown -R node:node /app/server/keys
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD node -e "require('http').get('http://127.0.0.1:3001/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--import", "tsx", "index.ts"]
