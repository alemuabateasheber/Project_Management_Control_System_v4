# PostgreSQL restore

Stop application writes first, then restore into the target database:

```bash
docker compose stop api web
cat backups/mint_aics_pmo_YYYYMMDD_HHMMSS.dump | docker compose exec -T db pg_restore -U mint -d mint_aics_pmo --clean --if-exists
# Run migrations if the backup predates the current release
docker compose up -d api web
```

Always test a restore in a non-production environment before relying on the backup for disaster recovery.
