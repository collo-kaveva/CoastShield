#!/usr/bin/env bash
# Creates the local PostgreSQL role and database from the values in .env. Needs a running PostgreSQL and a superuser (default: postgres).
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
PSQL="${PSQL:-sudo -u postgres psql}"
$PSQL -v ON_ERROR_STOP=1 -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='${DB_USER}') THEN CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}' CREATEDB; END IF; END \$\$;"
$PSQL -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || $PSQL -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
echo "Database '${DB_NAME}' ready."
