#!/usr/bin/env bash
# Applique les migrations sur une base Postgres locale jetable, avec une
# imitation de l'environnement Supabase, puis lance les vérifications.
# Usage : npm run test:db  (PGHOST/PGUSER/... selon ton Postgres local)
set -euo pipefail
cd "$(dirname "$0")/../.."
DB="horizon_test_$$"
PSQL=(psql -v ON_ERROR_STOP=1 -q -X)
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT
"${PSQL[@]}" -d "$DB" -f supabase/tests/stub_supabase.sql
for f in supabase/migrations/*.sql; do
  echo "→ $f"
  "${PSQL[@]}" -d "$DB" -f "$f"
done
"${PSQL[@]}" -d "$DB" -f supabase/tests/rls_and_signals.sql
# Import Routine Tracker : appliqué deux fois, mêmes comptes.
IMPORT_SQL="$(mktemp)"
node scripts/import-routine-tracker.mjs --user 00000000-0000-0000-0000-00000000000a --fixture tests/fixtures/routine-tracker.json > "$IMPORT_SQL"
"${PSQL[@]}" -d "$DB" -v import_sql="$IMPORT_SQL" -f supabase/tests/import_check.sql
rm -f "$IMPORT_SQL"
