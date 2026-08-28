#!/bin/sh
set -eu

# Backup verification script for MInT AICS PMO Control System
# This script validates PostgreSQL backup file integrity

BACKUP_FILE="${1:-}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.dump>"
    echo "Example: $0 backups/mint_aics_pmo_20260821_120000.dump"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Verifying backup: $BACKUP_FILE"
echo "================================"

# Check file size
FILE_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null)
if [ "$FILE_SIZE" -lt 1000 ]; then
    echo "❌ FAIL: Backup file is too small ($FILE_SIZE bytes)"
    exit 1
fi
echo "✓ File size: $FILE_SIZE bytes"

# Check if it's a valid PostgreSQL custom format dump
if ! pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1; then
    echo "❌ FAIL: Invalid PostgreSQL dump format"
    exit 1
fi
echo "✓ Valid PostgreSQL dump format"

# List archive contents
echo ""
echo "Archive contents:"
pg_restore --list "$BACKUP_FILE" | head -20

# Count tables in backup
TABLE_COUNT=$(pg_restore --list "$BACKUP_FILE" | grep -c "TABLE" || echo "0")
echo ""
echo "✓ Tables found in backup: $TABLE_COUNT"

# Expected tables for PMO system
EXPECTED_TABLES="users records audit_logs approvals report_schedules report_runs notifications"
MISSING_TABLES=0
for table in $EXPECTED_TABLES; do
    if ! pg_restore --list "$BACKUP_FILE" | grep -q "public.$table"; then
        echo "⚠ WARNING: Expected table '$table' not found in backup"
        MISSING_TABLES=$((MISSING_TABLES + 1))
    fi
done

if [ "$MISSING_TABLES" -eq 0 ]; then
    echo "✓ All expected tables present"
fi

echo ""
echo "================================"
echo "Backup verification: PASSED"
echo "Backup file: $BACKUP_FILE"
echo "File size: $FILE_SIZE bytes"
echo "Tables: $TABLE_COUNT"
