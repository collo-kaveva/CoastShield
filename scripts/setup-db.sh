#!/usr/bin/env bash
# Creates the local PostgreSQL role and database from the DB_* values in .env.
# Needs a running PostgreSQL and a superuser. Override how psql is run with PSQL, e.g.  PSQL="psql -U postgres -h localhost"
# .env is read as plain text (never executed), so any characters in other values (like the secret key) are safe.
set -euo pipefail
cd "$(dirname "$0")/.."
get() { grep -E "^$1=" .env | head -1 | cut -d= -f2-; }
DB_NAME=$(get DB_NAME); DB_USER=$(get DB_USER); DB_PASSWORD=$(get DB_PASSWORD)
[ -n "$DB_NAME" ] && [ -n "$DB_USER" ] && [ -n "$DB_PASSWORD" ] || { echo "DB_NAME, DB_USER and DB_PASSWORD must be set in .env" >&2; exit 1; }
case "$DB_NAME$DB_USER" in *[!A-Za-z0-9_]*) echo "DB_NAME and DB_USER may contain only letters, digits and underscores" >&2; exit 1;; esac
case "$DB_PASSWORD" in *"'"*) echo "DB_PASSWORD must not contain a single quote" >&2; exit 1;; esac
PSQL="${PSQL:-sudo -u postgres psql}"
$PSQL -v ON_ERROR_STOP=1 -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='${DB_USER}') THEN CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}' CREATEDB; END IF; END \$\$;"
$PSQL -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || $PSQL -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
echo "Database '${DB_NAME}' ready."
