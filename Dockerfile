FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (leverage Docker layer cache)
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund && \
    npm install @rollup/rollup-linux-x64-musl --no-audit --no-fund

# Copy source code
COPY . .

# Build the Medusa application
RUN npx medusa build

# ─── Production Stage ─────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# Copy necessary files from builder
# We copy node_modules and the built outputs
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist/public ./public
COPY --from=builder /app/.medusa ./.medusa

COPY --from=builder /app/medusa-config.ts ./medusa-config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src ./src

EXPOSE 9000

# Improved Healthcheck for cold starts
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=5 \
  CMD wget --quiet --tries=1 --spider http://localhost:9000/health || exit 1

# Start Medusa with automated migrations
CMD ["sh", "-c", "npx medusa db:migrate && npx medusa start"]

