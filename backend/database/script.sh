#!/bin/sh

# Self-repair permission if needed (optional safety net)
# chmod +x "$0"

DB_FILE="./database/database.db"
SCHEMA_FILE="./database/schema.sql"

if [ ! -f "$DB_FILE" ]; then
  echo "Creating SQLite database..."
  sqlite3 "$DB_FILE" < "$SCHEMA_FILE"
else
  echo "Database already exists. Skipping."
fi