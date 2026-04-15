#!/bin/bash

# Database Restore Script for Zoya ILM
# Created: 2026-04-14 12:01:09
#
# This script restores the database from the latest backup
#
# Database Statistics (at time of backup):
# - Users: 13
# - Conversations: 1,967
# - Messages: 4,001
# - AI Suggested Replies: 1,971
# - AI Edit Feedback Records: 1,180
# - Products: 327
# - Stores: 16

set -e  # Exit on error

DB_NAME="zoya_ilm"
DB_USER="sangeetha"
DB_HOST="localhost"
BACKUP_FILE="database_backup_latest.dump"

echo "=================================="
echo "Zoya ILM Database Restore"
echo "=================================="
echo ""
echo "⚠️  WARNING: This will DROP the existing database and restore from backup!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "Checking if backup file exists..."
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file '$BACKUP_FILE' not found!"
    exit 1
fi
echo "✅ Backup file found: $BACKUP_FILE"

echo ""
echo "Dropping existing database (if exists)..."
dropdb -h "$DB_HOST" -U "$DB_USER" --if-exists "$DB_NAME"
echo "✅ Database dropped"

echo ""
echo "Creating new database..."
createdb -h "$DB_HOST" -U "$DB_USER" "$DB_NAME"
echo "✅ Database created"

echo ""
echo "Restoring from backup..."
pg_restore -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -v "$BACKUP_FILE"
echo "✅ Database restored successfully!"

echo ""
echo "Verifying restoration..."
RESTORED_COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"User\";")
echo "✅ Found $RESTORED_COUNT users in restored database"

echo ""
echo "=================================="
echo "✅ Restore completed successfully!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Run: npx prisma generate"
echo "2. Start your dev server: npm run dev"
echo ""
