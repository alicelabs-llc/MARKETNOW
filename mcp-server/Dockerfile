# syntax=docker/dockerfile:1
# ══════════════════════════════════════════════════════════════════════════════
# MarketNow MCP Server — production container (v1.15.0)
# ══════════════════════════════════════════════════════════════════════════════
# The server speaks MCP over stdio. Run it attached to stdin/stdout:
#
#   docker build -t marketnow-mcp ./mcp-server
#   docker run -i --rm marketnow-mcp            # then speak JSON-RPC on stdio
#
# Same image is published to GHCR by CI:
#
#   docker run -i --rm ghcr.io/alicelabs-llc/marketnow-mcp:latest
#
# Security posture:
#   - Multi-stage build: build deps never reach the runtime layer.
#   - Runs as the unprivileged `node` user (uid 1000), never root.
#   - Only production dependencies are installed (npm ci --omit=dev).
#   - Read-only filesystem friendly: the app writes nothing to disk.
#   - No network calls at startup (ATC verification is self-contained).
# ══════════════════════════════════════════════════════════════════════════════

FROM node:22-alpine AS deps
WORKDIR /app
# Copy manifests first so dependency layers cache independently of source.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# OCI + GHCR metadata (org.opencontainers.image.* is what `docker inspect`
# and registries display; keep in sync with package.json — CI validates it).
ARG VERSION=1.15.0
ARG VCS_URL=https://github.com/alicelabs-llc/MARKETNOW
ARG VCS_REF
LABEL org.opencontainers.image.title="MarketNow MCP Server" \
      org.opencontainers.image.description="MCP marketplace with 9,248 security-audited skills. Fail-closed ATC/1.0 trust verification. 13 marketnow_* tools over stdio." \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.url="https://marketnow.site" \
      org.opencontainers.image.source="${VCS_URL}" \
      org.opencontainers.image.vendor="AliceLabs LLC" \
      org.opencontainers.image.authors="AliceLabs LLC <info@alicelabs.site>" \
      org.opencontainers.image.ref.name="${VCS_REF:-unknown}"

# Production dependency layer (from the clean build stage).
COPY --from=deps /app/node_modules ./node_modules

# Application code. `index.js` reads ./package.json at startup for its
# version (single source of truth) so the manifest must ship with the image.
COPY package.json ./
COPY index.js ./
COPY lib/ ./lib/

# Unprivileged runtime user (built into the official node image).
USER node

# stdio MCP server: the container's PID 1 IS the protocol endpoint.
# No EXPOSE (no TCP port), no VOLUME (no writable state), no CMD args.
ENTRYPOINT ["node", "index.js"]

# Self-check: `docker run --rm --entrypoint node marketnow-mcp -e "import('./index.js')"` 
# is not meaningful for a stdio server, so the health probe used by CI is the
# scripts/docker-smoke-test.sh JSON-RPC handshake (initialize + tools/list).
