# ── Stage 1: Build frontend ──
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json* bun.lockb* ./
RUN npm install
COPY . .
RUN npm run build

# ── Stage 2: Production ──
FROM node:20-alpine
WORKDIR /app

# Copy backend
COPY backend/package.json backend/server.js backend/db.js backend/auth.js ./
RUN npm install --production

# Copy built frontend into dist/
COPY --from=frontend /app/dist ./dist

# Environment (override at runtime)
ENV KAFKA_BROKERS=65.108.235.150:9092
ENV KAFKA_TOPIC=bridgewise.alerts.normalized
ENV KAFKA_GROUP_ID=lovable-signals-app
ENV PORT=3000

EXPOSE 3000
CMD ["node", "server.js"]
