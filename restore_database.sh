#!/bin/bash

# Zoya ILM Database Restore Script
# This script helps restore the database backup on a new machine

echo "==================================="
echo "Zoya ILM Database Restore Script"
echo "==================================="
echo ""

# Check if backup files exist
if [ ! -f "database_backup.sql" ] && [ ! -f "database_backup.dump" ]; then
    echo "❌ Error: No backup files found!"
    echo "Please ensure database_backup.sql or database_backup.dump exists in the current directory."
    exit 1
fi

# Prompt for database connection details
read -p "Enter PostgreSQL host (default: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Enter PostgreSQL username: " DB_USER
if [ -z "$DB_USER" ]; then
    echo "❌ Error: Username is required"
    exit 1
fi

read -p "Enter database name (default: zoya_ilm): " DB_NAME
DB_NAME=${DB_NAME:-zoya_ilm}

echo ""
echo "==================================="
echo "Restore Options:"
echo "1. Restore from database_backup.dump (binary format - recommended)"
echo "2. Restore from database_backup.sql (SQL format)"
echo "==================================="
read -p "Choose option (1 or 2): " RESTORE_OPTION

echo ""
echo "Starting database restore..."
echo ""

if [ "$RESTORE_OPTION" = "1" ]; then
    if [ ! -f "database_backup.dump" ]; then
        echo "❌ Error: database_backup.dump not found!"
        exit 1
    fi
    echo "Restoring from database_backup.dump..."
    pg_restore -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c database_backup.dump
elif [ "$RESTORE_OPTION" = "2" ]; then
    if [ ! -f "database_backup.sql" ]; then
        echo "❌ Error: database_backup.sql not found!"
        exit 1
    fi
    echo "Restoring from database_backup.sql..."
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" < database_backup.sql
else
    echo "❌ Error: Invalid option selected"
    exit 1
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database restored successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Update your .env file with database credentials"
    echo "2. Run: npx prisma generate"
    echo "3. Run: npm run dev"
else
    echo ""
    echo "❌ Database restore failed. Please check the error messages above."
    exit 1
fi
