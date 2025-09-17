# Backend builder
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend

# Build dependencies (dla paczek wymagających kompilacji)
RUN apk add --no-cache python3 make g++

# Update npm do stabilnej wersji
RUN npm install -g npm@10

# Kopiuj package.json (bez package-lock.json)
COPY backend/package.json ./

# Instalacja zależności bez locka
RUN npm install --no-package-lock && npm cache clean --force

# Kopiuj kod źródłowy
COPY backend/ .

# Build backend
RUN npm run build


# Frontend builder
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

# Build dependencies
RUN apk add --no-cache python3 make g++

# Update npm
RUN npm install -g npm@10

# Kopiuj package.json (bez package-lock.json)
COPY frontend/package.json ./

# Instalacja zależności bez locka
RUN npm install --no-package-lock && npm cache clean --force

# Kopiuj kod źródłowy
COPY frontend/ .

# Build frontend
RUN npm run build


# Production stage
FROM node:18-alpine AS production
LABEL maintainer="Artur Wyroślak <artur@example.com>"
LABEL description="GitHub Development Agent with AI and MCP Integration"
LABEL version="1.0.0"

# Użytkownik bez root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Runtime deps
RUN apk add --no-cache dumb-init tini curl ca-certificates \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Backend build
COPY --from=backend-builder --chown=nextjs:nodejs /app/backend/dist ./backend/dist
COPY --from=backend-builder --chown=nextjs:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder --chown=nextjs:nodejs /app/backend/package.json ./backend/package.json

# Frontend build (tylko dist)
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/dist ./frontend/dist

# Root package.json (opcjonalnie)
COPY --chown=nextjs:nodejs package.json ./

# Katalogi logów/tmp
RUN mkdir -p /app/logs /app/tmp && \
    chown -R nextjs:nodejs /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

EXPOSE 8080
USER nextjs

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "backend/dist/index.js"]
