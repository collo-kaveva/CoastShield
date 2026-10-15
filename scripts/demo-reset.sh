#!/usr/bin/env bash
# Returns the app to a clean, predictable demo state (DEVELOPMENT ONLY):
#   - deletes every business-owner account created during rehearsals (and all their data)
#   - reloads the clearly-labelled SAMPLE businesses, the demo owner and the demo admin
#   - clears security-check history and uploaded logos
# Refuses to run unless DJANGO_DEBUG=True in .env.
set -euo pipefail
cd "$(dirname "$0")/../backend"
PY=.venv/bin/python; [ -x "$PY" ] || PY=python3
$PY manage.py seed_demo --wipe-owners --reset --with-admin
$PY manage.py shell -c "from apps.cybersecurity.models import SecurityAnalysis as S; print('cleared', S.objects.all().delete()[0], 'analysis records')"
rm -rf media
echo "Demo reset complete. Owner: fatuma@example.com / demo-password   Admin: admin@example.com / demo-admin-password (SAMPLE ONLY)"
