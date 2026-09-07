#!/bin/sh
set -eu

echo "Running database migrations..."
alembic upgrade head
echo "Database migrations completed. Starting API..."

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
