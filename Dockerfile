FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (leverage Docker layer cache)
COPY package.json package-lock.json* ./
RUN npm install --prefer-offline --no-audit --no-fund

# Copy source code
COPY . .

# Build backend only — skip admin dashboard (saves ~5 min)
# Admin can be served separately or via Medusa's hosted admin
ENV DISABLE_MEDUSA_ADMIN=true
RUN npx medusa build

# ─── Production Stage ─────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# Copy package.json and node_modules from builder (single install)
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Copy built output
COPY --from=builder /app/.medusa ./.medusa
COPY --from=builder /app/medusa-config.ts ./medusa-config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Prune dev dependencies to slim down image
RUN npm prune --omit=dev --no-audit --no-fund 2>/dev/null; true

EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:9000/health || exit 1

CMD ["npx", "medusa", "start"]
