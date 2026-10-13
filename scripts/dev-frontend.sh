#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../frontend"
npm install
VITE_DATA_MODE="${VITE_DATA_MODE:-api}" npm run dev
