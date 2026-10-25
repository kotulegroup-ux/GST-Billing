# Production Dockerfile for FinTrack GST Accounting (Node.js + SQLite + Vite)
FROM node:20-slim

WORKDIR /app

# Install build tools for native SQLite compilation
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Ensure accounting.db exists so build never fails if not committed to git
RUN test -f accounting.db || touch accounting.db

# Build the Vite frontend into dist/
RUN npm run build

# Configure runtime environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
