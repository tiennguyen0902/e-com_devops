# ==========================================
# E-COMMERCE BACKEND DOCKERFILE
# ==========================================

# Node.js runtime
FROM node:24-alpine

# Production environment
ENV NODE_ENV=production
ENV PORT=3000

# Application directory
WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev --no-audit --no-fund \
    && npm cache clean --force

# Copy backend source
COPY --chown=node:node src ./src

# Run as non-root user
USER node

# Application internal port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s \
            --timeout=5s \
            --start-period=30s \
            --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start backend
CMD ["node", "src/server.js"]