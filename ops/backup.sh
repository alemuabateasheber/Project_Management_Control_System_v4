#!/bin/sh
set -eu
STAMP=$(date -u +%Y%m%d_%H%M%S)
OUT=${BACKUP_DIR:-./backups}
mkdir -p "$OUT"
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-mint}" -d "${POSTGRES_DB:-mint_aics_pmo}" -Fc > "$OUT/mint_aics_pmo_${STAMP}.dump"
find "$OUT" -type f -name '*.dump' -mtime +14 -delete
echo "Backup created: $OUT/mint_aics_pmo_${STAMP}.dump"
