#!/bin/bash
################################################################################
# Read-only production check: runs src/scripts/sql/prod-readonly-checks.sql
# against the class database from .env (DB_URL), in a read-only session (any write
# is refused by PostgreSQL). Prints table names and row counts only; no row contents.
# Takes no arguments, so it can only ever run that one file.
# Modeled on FlashCards' prod-readonly-check.sh.
################################################################################
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/../../.." && pwd)"
cd "${PROJECT_ROOT}"
[ $# -eq 0 ] || { echo "prod-readonly-check: takes no arguments" >&2; exit 2; }

# Read only the values needed (.env is not valid shell: some values contain spaces).
env_value() {
    grep -E "^$1=" .env | head -1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//'
}
DB_URL="$(env_value DB_URL)"
DB_SCHEMA="$(env_value DB_SCHEMA)"
[ -n "${DB_URL}" ] || { echo "prod-readonly-check: no DB_URL in .env" >&2; exit 1; }

PGCONNECT_TIMEOUT=15 PGSSLMODE=require \
  PGOPTIONS='-c default_transaction_read_only=on' \
  psql "${DB_URL}" -X -q -v ON_ERROR_STOP=1 -v schema="${DB_SCHEMA:-public}" -P pager=off \
  -f src/scripts/sql/prod-readonly-checks.sql
