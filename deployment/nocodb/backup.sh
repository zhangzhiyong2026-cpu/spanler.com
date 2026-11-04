#!/usr/bin/env bash
# Run on the actual server from this directory. Treat output archives as secrets.
set -euo pipefail
cd "$(dirname "$0")"
umask 077
backup_stamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_root="${SPANLER_BACKUP_DIR:-./backups}"
mkdir -p "$backup_root"
# Keep pipefail: pg_dump failure must not be mistaken for a successful gzip.
docker compose exec -T db pg_dump -U nocodb -d nocodb --format=custom > "$backup_root/nocodb-$backup_stamp.dump"
# Local attachment snapshot. Avoid uploads while taking it; see README.
docker compose exec -T nocodb tar -C /usr/app/data -czf - . > "$backup_root/attachments-$backup_stamp.tar.gz"
printf 'Backup complete in %s. Copy archives off-server securely.\n' "$backup_root"
