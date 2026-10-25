# Production Dockerfile for FinTrack GST Accounting (Node.js + SQLite + Vite)
FROM node:20-slim AS builder

WORKDIR /app

# Install build tools for native SQLite compilation
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production Runtime
FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/accounting.db ./accounting.db
COPY --from=builder /app/src ./src

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
