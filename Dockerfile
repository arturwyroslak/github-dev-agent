# Multi-stage Dockerfile for GitHub Dev Agent
# Production-ready containerization with security best practices

# Build stage for backend
FROM node:18-alpine AS backend-builder

# Set working directory
WORKDIR /app/backend

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies with frozen lockfile
RUN npm ci --only=production && npm cache clean --force

# Copy backend source
COPY backend/ .

# Build backend
RUN npm run build

# Build stage for frontend
FROM node:18-alpine AS frontend-builder

# Set working directory
WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Copy frontend source
COPY frontend/ .

# Build frontend for production
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Set labels for better maintenance
LABEL maintainer="Artur Wyroślak <artur@example.com>"
LABEL description="GitHub Development Agent with AI and MCP Integration"
LABEL version="1.0.0"

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    tini \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy built backend from builder stage
COPY --from=backend-builder --chown=nextjs:nodejs /app/backend/dist ./backend/dist
COPY --from=backend-builder --chown=nextjs:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder --chown=nextjs:nodejs /app/backend/package.json ./backend/package.json

# Copy built frontend from builder stage
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/dist ./frontend/dist

# Copy root package.json
COPY --chown=nextjs:nodejs package.json ./

# Create necessary directories
RUN mkdir -p /app/logs /app/tmp && \
    chown -R nextjs:nodejs /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Expose port
EXPOSE 8080

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Use tini as init system for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "backend/dist/index.js"]
