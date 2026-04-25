# ---------- Stage 1: build ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Alpine needs these for bcrypt native builds.
RUN apk add --no-cache python3 make g++ openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 60000 && \
    npm config set fetch-retry-maxtimeout 600000 && \
    npm config set fetch-timeout 600000 && \
    npm install --no-audit --no-fund --prefer-offline

COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate
RUN npm run build

# ---------- Stage 2: production ----------
FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

# OpenSSL is needed at runtime by Prisma.
RUN apk add --no-cache openssl && \
    addgroup -S app && adduser -S app -G app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Uploads live in a volume owned by app.
RUN mkdir -p /data/uploads && chown -R app:app /data /app

USER app

EXPOSE 4000

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -q -O- http://localhost:4000/health || exit 1

CMD ["node", "dist/server.js"]
