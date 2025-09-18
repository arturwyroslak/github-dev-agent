#!/bin/bash

# Docker Configuration Test Script
# This script validates Docker configurations and checks for common deployment issues

set -e

echo "🔍 Testing Docker configurations for GitHub Dev Agent..."
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_config() {
    local file=$1
    local description=$2
    
    echo -n "Testing $description... "
    
    if docker compose -f "$file" config --quiet 2>/dev/null; then
        echo -e "${GREEN}✓ PASS${NC}"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        return 1
    fi
}

# Check if Docker is running
echo -n "Checking Docker daemon... "
if docker info >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${RED}✗ Docker daemon not running${NC}"
    exit 1
fi

# Check Docker Compose version
echo -n "Checking Docker Compose... "
if docker compose version >/dev/null 2>&1; then
    version=$(docker compose version --short 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✓ Available (v$version)${NC}"
else
    echo -e "${RED}✗ Docker Compose not available${NC}"
    exit 1
fi

echo

# Test configurations
failed=0

test_config "docker-compose.yml" "Main configuration" || failed=$((failed + 1))
test_config "docker-compose.simple.yml" "Simple configuration (recommended for Dokploy)" || failed=$((failed + 1))

if [ -f "docker-compose.production.yml" ]; then
    echo -n "Testing Production override... "
    if docker compose -f docker-compose.yml -f docker-compose.production.yml config --quiet 2>/dev/null; then
        echo -e "${GREEN}✓ PASS${NC}"
    else
        echo -e "${RED}✗ FAIL${NC}"
        failed=$((failed + 1))
    fi
fi

echo

# Check for common issues
echo "🔧 Checking for common deployment issues..."

# Check available memory
echo -n "Checking available memory... "
if command -v free >/dev/null 2>&1; then
    available_mem=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    if [ "$available_mem" -gt 1024 ]; then
        echo -e "${GREEN}✓ ${available_mem}MB available${NC}"
    else
        echo -e "${YELLOW}⚠ Only ${available_mem}MB available (recommended: >1GB)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Cannot check (non-Linux system)${NC}"
fi

# Check file descriptor limits
echo -n "Checking file descriptor limits... "
if command -v ulimit >/dev/null 2>&1; then
    fd_limit=$(ulimit -n)
    if [ "$fd_limit" -ge 8192 ]; then
        echo -e "${GREEN}✓ $fd_limit (good)${NC}"
    else
        echo -e "${YELLOW}⚠ $fd_limit (recommended: ≥8192)${NC}"
        echo "  Consider increasing with: ulimit -n 65536"
    fi
else
    echo -e "${YELLOW}⚠ Cannot check${NC}"
fi

# Check for existing networks that might conflict
echo -n "Checking for network conflicts... "
conflicting_networks=$(docker network ls --filter name=github --format "{{.Name}}" | wc -l)
if [ "$conflicting_networks" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $conflicting_networks existing github-* networks${NC}"
    echo "  Use docker-compose.simple.yml to avoid conflicts"
else
    echo -e "${GREEN}✓ No conflicts detected${NC}"
fi

echo

# Summary
if [ $failed -eq 0 ]; then
    echo -e "${GREEN}🎉 All configurations are valid!${NC}"
    echo
    echo "Recommended deployment commands:"
    echo "  Simple (Dokploy):     docker compose -f docker-compose.simple.yml up -d"
    echo "  Full production:      docker compose up -d"
    echo "  With overrides:       docker compose -f docker-compose.yml -f docker-compose.production.yml up -d"
    echo
    echo "For detailed instructions, see: DOCKER_DEPLOYMENT.md"
else
    echo -e "${RED}❌ $failed configuration(s) failed validation${NC}"
    echo "Please check the errors above and fix the configurations."
    exit 1
fi

echo
echo "✨ Ready for deployment!"