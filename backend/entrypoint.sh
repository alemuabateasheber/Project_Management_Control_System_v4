#!/bin/sh
# Run migrations, but continue if they fail (e.g., if indexes already exist)
alembic upgrade head || echo "Migration failed or already applied, continuing..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
