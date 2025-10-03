# Multi-stage build for the backend
FROM node:18-slim as backend-builder

WORKDIR /app

# Install system dependencies and Stockfish
RUN apt-get update && apt-get install -y \
    stockfish \
    && rm -rf /var/lib/apt/lists/*

# Copy backend package files
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --only=production

# Copy backend source
COPY server/ ./

# Generate Prisma client
RUN npx prisma generate

# Build backend
RUN npm run build

# Production stage
FROM node:18-slim

WORKDIR /app

# Install Stockfish and required libraries
RUN apt-get update && apt-get install -y \
    stockfish \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy built backend
COPY --from=backend-builder /app/server/dist ./server/dist
COPY --from=backend-builder /app/server/node_modules ./server/node_modules
COPY --from=backend-builder /app/server/package.json ./server/
COPY --from=backend-builder /app/server/prisma ./server/prisma

WORKDIR /app/server

EXPOSE 3001

CMD ["npm", "start"]