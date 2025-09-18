# Multi-stage Dockerfile for GitHub Dev Agent
# Production-ready containerization with security best practices

# Build stage for backend
FROM node:18-alpine AS backend-builder

# Set working directory
WORKDIR /app/backend

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Ustawienia npm – brak package-lock + legacy peer deps
COPY .npmrc /root/.npmrc

# Copy backend package file
COPY backend/package.json ./

# Install dependencies ignoring peer deps
RUN npm install --no-package-lock --legacy-peer-deps && npm cache clean --force

# Copy backend source (excluding node_modules to preserve installed deps)
COPY backend/src ./src
COPY backend/tsconfig.json ./

# Build backend
RUN npm run build


# Build stage for frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend
RUN apk add --no-cache python3 make g++

# Ustawienia npm
COPY .npmrc /root/.npmrc

# Copy frontend package file
COPY frontend/package.json ./

RUN npm install --no-package-lock --legacy-peer-deps && npm cache clean --force

# Copy frontend source (excluding node_modules to preserve installed deps)
COPY frontend/src ./src
COPY frontend/index.html ./
COPY frontend/vite.config.ts ./
COPY frontend/tsconfig.json ./
COPY frontend/tsconfig.node.json ./

RUN npm run build


# Production stage
FROM node:18-alpine AS production

LABEL maintainer="Artur Wyroślak <artur@example.com>"
LABEL description="GitHub Development Agent with AI and MCP Integration"
LABEL version="1.0.0"

# Create non-root user with proper permissions
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Install runtime dependencies and configure system limits
RUN apk add --no-cache \
    dumb-init \
    tini \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/* \
    && echo 'fs.file-max = 2097152' >> /etc/sysctl.conf

WORKDIR /app

# Copy backend
COPY --from=backend-builder --chown=nextjs:nodejs /app/backend/dist ./backend/dist
COPY --from=backend-builder --chown=nextjs:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder --chown=nextjs:nodejs /app/backend/package.json ./backend/package.json

# Copy frontend
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/dist ./frontend/dist

# Root package.json
COPY --chown=nextjs:nodejs package.json ./

# Create directories with proper permissions and optimize for file handling
RUN mkdir -p /app/logs /app/tmp && \
    chown -R nextjs:nodejs /app && \
    chmod -R 755 /app

# Environment configuration
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV UV_THREADPOOL_SIZE=128

EXPOSE 8080

USER nextjs

# Optimize Node.js for file handling
ENV NODE_OPTIONS="--max-old-space-size=2048 --max-http-header-size=8192"

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "backend/dist/index.js"]
