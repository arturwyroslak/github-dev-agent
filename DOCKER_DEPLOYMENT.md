# Docker Deployment Guide

This guide provides multiple deployment options for the GitHub Dev Agent, specifically addressing common issues with platforms like Dokploy.

## 🚨 Common Issues Fixed

### 1. Network Overlap Error
```
failed to create network: Pool overlaps with other one on this address space
```
**Solution**: Removed hardcoded network subnet configuration to let Docker manage IP allocation automatically.

### 2. Too Many Open Files Error
```
tail: inotify cannot be used, reverting to polling: Too many open files
```
**Solution**: Added proper ulimit configurations for file descriptors in all services.

## 📦 Deployment Options

### Option 1: Simple Deployment (Recommended for Dokploy)

Use the simplified configuration that avoids network conflicts:

```bash
docker compose -f docker-compose.simple.yml up -d
```

**Features:**
- No custom network configuration (uses default bridge)
- Proper file descriptor limits (65536)
- Resource limits and logging configuration
- Essential services only (app, postgres, redis)
- Optimized for platform deployment

### Option 2: Full Production Deployment

Use the full configuration with all monitoring and proxy services:

```bash
docker compose up -d
```

**Features:**
- Custom network with automatic IP allocation
- Nginx reverse proxy
- Prometheus monitoring
- Grafana dashboards
- Redis optimization

### Option 3: Production with Override

Use base configuration with production optimizations:

```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d
```

## 🛠️ Configuration Details

### File Descriptor Limits
All services are configured with:
```yaml
ulimits:
  nofile:
    soft: 65536
    hard: 65536
  nproc:
    soft: 65536
    hard: 65536
```

### Resource Limits
Production deployments include:
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '0.5'
      memory: 512M
```

### Environment Variables

Required environment variables:
```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
JWT_SECRET=your_jwt_secret_minimum_32_chars
ENCRYPTION_KEY=your_encryption_key_exactly_32_chars
```

## 🔧 Platform-Specific Instructions

### Dokploy Deployment

1. **Upload docker-compose.simple.yml** to your Dokploy project
2. **Set environment variables** in Dokploy dashboard:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `JWT_SECRET`
   - `ENCRYPTION_KEY`
3. **Deploy** using the Dokploy interface

### Manual Docker Deployment

```bash
# Clone the repository
git clone https://github.com/arturwyroslak/github-dev-agent.git
cd github-dev-agent

# Copy environment file and configure
cp .env.example .env
# Edit .env with your values

# Deploy with simple configuration
docker compose -f docker-compose.simple.yml up -d

# Check status
docker compose -f docker-compose.simple.yml ps
docker compose -f docker-compose.simple.yml logs -f app
```

## 📊 Health Checks

All services include health checks:

- **App**: `curl -f http://localhost:8080/health`
- **PostgreSQL**: `pg_isready -U postgres -d github_dev_agent`
- **Redis**: `redis-cli -a github_redis_pass ping`

## 🔍 Troubleshooting

### Network Issues
If you still encounter network overlap errors:
1. Stop all containers: `docker compose down`
2. Remove networks: `docker network prune`
3. Use simple configuration: `docker compose -f docker-compose.simple.yml up -d`

### File Descriptor Issues
If you encounter "too many open files":
1. Check system limits: `ulimit -n`
2. Increase system limits if needed
3. Verify ulimits in container: `docker exec <container> ulimit -n`

### Memory Issues
If containers are killed due to memory:
1. Check available memory: `free -h`
2. Adjust resource limits in docker-compose files
3. Monitor usage: `docker stats`

## 📈 Monitoring

Access monitoring services (full deployment only):
- **Application**: http://localhost:8080
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/github_grafana_pass)

## 🔐 Security Notes

1. **Change default passwords** in production
2. **Use environment variables** for secrets
3. **Enable HTTPS** with proper certificates
4. **Restrict network access** to monitoring endpoints
5. **Regularly update** container images

## 🚀 Performance Optimization

### Node.js Optimization
The application is configured with:
```env
NODE_OPTIONS=--max-old-space-size=1536 --max-http-header-size=8192
UV_THREADPOOL_SIZE=128
```

### Redis Optimization
Redis is configured with:
```
--maxmemory 256mb
--maxmemory-policy allkeys-lru
```

### PostgreSQL Optimization
PostgreSQL uses:
```
--encoding=UTF-8 --lc-collate=C --lc-ctype=C
```