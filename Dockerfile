# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY client/ ./
COPY shared/ /app/shared/
RUN npm run build

FROM node:22-alpine
WORKDIR /app/server
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 STATIC_DIR=/app/client/dist
COPY server/package.json server/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev
COPY server/ ./
COPY shared/ /app/shared/
COPY --from=client-build /app/client/dist /app/client/dist
RUN apk add --no-cache tini
USER node
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 CMD node -e "require('http').get('http://127.0.0.1:8080/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--import", "tsx", "index.ts"]
