FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (leverage Docker layer cache)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy source code
COPY . .

# Build the Medusa application (outputs to .medusa/server/)
RUN npx medusa build

# Install production dependencies inside the build output
RUN cd .medusa/server && npm install --omit=dev --no-audit --no-fund

# ─── Production Stage ─────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app/server
ENV NODE_ENV=production

# Copy the self-contained build output from .medusa/server/
COPY --from=builder /app/.medusa/server ./

EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget --quiet --tries=1 --spider http://localhost:9000/health || exit 1

# Start Medusa from the build output directory
CMD ["npx", "medusa", "start"]
