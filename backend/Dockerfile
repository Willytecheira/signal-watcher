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

# Install SQLite and supercronic (lightweight cron for containers)
RUN apk add --no-cache sqlite \
    && wget -q https://github.com/aptible/supercronic/releases/download/v0.2.29/supercronic-linux-amd64 -O /usr/local/bin/supercronic \
    && chmod +x /usr/local/bin/supercronic

# Copy backend
COPY backend/package.json backend/server.js backend/db.js backend/auth.js backend/webhooks.js backend/groups.js backend/external-users.js ./

# Copy backup script and crontab
COPY backend/backup.sh ./backup.sh
RUN chmod +x ./backup.sh

# Create crontab file (every 6 hours)
RUN echo "0 */6 * * * /app/backup.sh >> /var/log/backup.log 2>&1" > /app/crontab

RUN npm install --production

# Copy built frontend into dist/
COPY --from=frontend /app/dist ./dist

# Environment (override at runtime)
ENV KAFKA_BROKERS=65.108.235.150:9092
ENV KAFKA_TOPIC=bridgewise.alerts.normalized
ENV KAFKA_GROUP_ID=lovable-signals-app
ENV PORT=3000

EXPOSE 3000

# Start supercronic in background + node server
CMD ["sh", "-c", "supercronic /app/crontab & node server.js"]
