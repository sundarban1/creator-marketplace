# Debian slim, not alpine — the build stage runs Playwright's Chromium
# (see scripts/prerender.mjs) which needs glibc + shared libs that alpine's
# musl makes fragile. Debian is Playwright's officially supported base.
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx playwright install --with-deps chromium
RUN npm run build:no-prerender && npm run prerender

# Runner only serves the prebuilt dist/ via server.mjs — no browser/native
# deps needed here, so alpine is fine and keeps the final image small.
FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 webserver
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.mjs ./
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev && \
    chown -R webserver:nodejs /app
USER webserver
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server.mjs"]
