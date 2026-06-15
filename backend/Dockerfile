FROM node:22-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
COPY docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh && \
    chown -R expressjs:nodejs /app
USER expressjs
EXPOSE 3000
ENV NODE_ENV=production
CMD ["./docker-entrypoint.sh"]
