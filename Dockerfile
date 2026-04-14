FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install --omit=dev

# Copy source code
COPY . .

# Build the application
RUN npx medusa build

# Expose port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:9000/health || exit 1

# Start Medusa
CMD ["npx", "medusa", "start"]
