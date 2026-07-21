#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -s data/catalog.json ] && [ -s data/api.json ] && [ -s data/labs.html ]; then
  echo "data already present"
else
  bash scripts/update-data.sh
fi
