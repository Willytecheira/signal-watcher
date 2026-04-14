#!/bin/bash
# SQLite backup script — runs via cron
# Keeps last 7 daily backups

BACKUP_DIR="/data/backups"
DB_PATH="/data/signals.db"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Use SQLite online backup (safe even while DB is in use)
sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/signals_$DATE.db'"

# Remove backups older than 7 days
find "$BACKUP_DIR" -name "signals_*.db" -mtime +7 -delete

echo "[$(date)] Backup completed: signals_$DATE.db"
