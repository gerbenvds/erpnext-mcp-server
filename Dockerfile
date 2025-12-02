# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev, --ignore-scripts since tsconfig.json isn't copied yet)
RUN npm ci --ignore-scripts

# Copy source files
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only (--ignore-scripts to skip prepare hook that requires tsc)
RUN npm ci --omit=dev --ignore-scripts

# Copy built files from builder
COPY --from=builder /app/build ./build

# Expose the default port
EXPOSE 3000

# Run the HTTP server
CMD ["node", "build/http-server.js"]

