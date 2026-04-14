FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (dev deps needed for build)
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npx medusa build

# Remove dev dependencies to slim down image
RUN npm prune --omit=dev

# Expose port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:9000/health || exit 1

# Start Medusa
CMD ["npx", "medusa", "start"]
