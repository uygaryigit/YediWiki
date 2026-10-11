#!/usr/bin/env bash
# Kuralları yerel PostgreSQL'de dener: boş veritabanı + Supabase taklidi + bütün göçler + kural testleri.
# Kullanım: supabase/tests/yerel.sh   (PG: /var/tmp/ywpg soketi, 54329 portu)
set -euo pipefail
bash "$(dirname "$0")/pg_yerel.sh"
here="$(cd "$(dirname "$0")" && pwd)"
PSQL=(psql -h "${PGHOST:-/var/tmp/ywpg}" -p "${PGPORT:-54329}" -U postgres -v ON_ERROR_STOP=1 -q -X)
"${PSQL[@]}" -d postgres -c "drop database if exists yw_test with (force)" -c "create database yw_test"
# roller küme genelidir; taklit dosyası yoksa oluşturur
"${PSQL[@]}" -d yw_test -f "$here/shim.sql"
for f in "$here"/../migrations/*.sql; do "${PSQL[@]}" -d yw_test -f "$f" > /dev/null; done
python3 "$here/gen_kurallar.py" > /dev/null
out="$("${PSQL[@]}" -d yw_test -f "$here/kurallar_testi.sql" 2>&1 || true)"
python3 - "$out" <<'PY'
import json, re, sys
m = re.search(r'SONUC:(\[.*\])', sys.argv[1], re.S)
if not m:
    print(sys.argv[1]); sys.exit(1)
res = json.loads(m.group(1))
bad = [r for r in res if not r.get('ok')]
for r in bad: print('HATA', r.get('n', ''), r['t'], '|', r.get('got'), '| chk:', r.get('chk'))
print(f"{len(res) - len(bad)}/{len(res)} geçti")
sys.exit(1 if bad else 0)
PY
