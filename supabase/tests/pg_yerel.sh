#!/usr/bin/env bash
# Yerel PostgreSQL 16 test sunucusunu (gerekirse kurup) başlatır: soket /var/tmp/ywpg, port 54329.
set -euo pipefail
B=${YW_PGDIR:-/var/tmp/ywpg}; BIN=/usr/lib/postgresql/16/bin
if psql -h "$B" -p 54329 -U postgres -tA -c 'select 1' >/dev/null 2>&1; then exit 0; fi
if [ ! -f "$B/data/PG_VERSION" ]; then
  mkdir -p "$B/data" && chown -R postgres:postgres "$B" && chmod 700 "$B/data"
  su postgres -s /bin/bash -c "$BIN/initdb -D $B/data -U postgres -A trust --encoding=UTF8 --locale=C.UTF-8 > $B/initdb.log 2>&1"
fi
su postgres -s /bin/bash -c "$BIN/pg_ctl -D $B/data -o '-p 54329 -k $B -c wal_level=logical' -l $B/pg.log -w start" >/dev/null
