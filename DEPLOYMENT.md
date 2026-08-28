# Production deployment guide

## 1. Secrets

Create `.env` from `.env.example`. Set `JWT_SECRET`, `ADMIN_PASSWORD`, database credentials, and production `CORS_ORIGINS`. Never commit `.env`.

## 2. Database

The API container runs `alembic upgrade head` before starting FastAPI. Migration files are in `backend/alembic/versions`.

## 3. HTTPS

Place Nginx, Apache, Traefik, or an enterprise reverse proxy in front of ports 5173/8000. Expose only HTTPS externally.

## 4. Backups

Use `ops/backup.sh` from a scheduled host/CI job. Keep encrypted off-host copies and periodically perform restore tests.

## 5. Email reports

Set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD and SMTP_FROM. Scheduled reports run hourly and honor daily/weekly/monthly due dates.

## 6. Operational controls

Monitor `/api/health`, container restarts, PostgreSQL storage, CPU/memory, report volume, authentication failures, and audit-log growth.
