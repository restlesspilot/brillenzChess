# Multi-stage build for the backend
FROM node:18-alpine as backend-builder

WORKDIR /app

# Install system dependencies including Stockfish
RUN apk add --no-cache stockfish

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
FROM node:18-alpine

WORKDIR /app

# Install Stockfish in production image
RUN apk add --no-cache stockfish

# Copy built backend
COPY --from=backend-builder /app/server/dist ./server/dist
COPY --from=backend-builder /app/server/node_modules ./server/node_modules
COPY --from=backend-builder /app/server/package.json ./server/
COPY --from=backend-builder /app/server/prisma ./server/prisma

WORKDIR /app/server

EXPOSE 3001

CMD ["npm", "start"]