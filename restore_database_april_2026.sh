#!/bin/bash

# Database Restore Script for Zoya ILM
# Created: 2026-04-15 16:38:00
#
# This script restores the database from April 2026 backup
# Includes analytics data through April 15, 2026
#
# Database Statistics (at time of backup):
# - Users: 13
# - Conversations: 1,967
# - Messages: 4,001
# - AI Suggested Replies: 1,971
# - AI Edit Feedback Records: 1,558 (Jan: 593, Feb: 587, Mar: 314, Apr: 64)
# - Products: 327
# - Stores: 16
#
# Analytics Timeline:
# - January 2026: 593 feedback records (AI learning phase)
# - February 2026: 587 feedback records (AI improving)
# - March 2026: 314 feedback records (AI getting better)
# - April 2026: 64 feedback records (AI mastered - fewer edits needed)

set -e  # Exit on error

DB_NAME="zoya_ilm"
DB_USER="sangeetha"
DB_HOST="localhost"
BACKUP_FILE="database_backup_april_2026.dump"

echo "=================================="
echo "Zoya ILM Database Restore"
echo "April 2026 Backup"
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
    echo ""
    echo "Available backup files:"
    ls -lh database_backup*.dump 2>/dev/null || echo "No backup files found"
    exit 1
fi
echo "✅ Backup file found: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

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
RESTORED_USERS=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"User\";")
RESTORED_FEEDBACKS=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"AIEditFeedback\";")
RESTORED_CONVERSATIONS=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"Conversation\";")

echo "✅ Restored database contains:"
echo "   - $RESTORED_USERS users"
echo "   - $RESTORED_CONVERSATIONS conversations"
echo "   - $RESTORED_FEEDBACKS AI feedback records"

echo ""
echo "=================================="
echo "✅ Restore completed successfully!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Run: npx prisma generate"
echo "2. Start your dev server: npm run dev"
echo "3. Visit /dashboard/analytics to see analytics from Jan-April 2026"
echo ""
