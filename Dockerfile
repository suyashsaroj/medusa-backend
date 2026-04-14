FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (leverage Docker cache)
COPY package.json package-lock.json* ./
RUN npm ci --quiet --no-audit --no-fund

# Copy source code
COPY . .

# Build the application
RUN npx medusa build

# Stage 2: Runtime
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --quiet --no-audit --no-fund

# Copy necessary artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.medusa ./.medusa
COPY --from=builder /app/medusa-config.ts ./medusa-config.ts
COPY --from=builder /app/package.json ./package.json

# Expose port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:9000/health || exit 1

# Start Medusa
CMD ["npx", "medusa", "start"]

