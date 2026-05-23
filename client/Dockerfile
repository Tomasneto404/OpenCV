# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

ARG VITE_API_URL
ARG VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY

RUN npm run build

# ── Runtime: nginx ─────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner
RUN apk add --no-cache wget tini && \
    addgroup -g 1001 -S app && \
    adduser  -u 1001 -S app -G app && \
    chown -R app:app /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && chown app:app /var/run/nginx.pid

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/healthz >/dev/null || exit 1

USER app
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["nginx", "-g", "daemon off;"]
