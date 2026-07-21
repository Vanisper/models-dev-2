#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p data
echo "-> catalog.json"
curl -sL --fail -o data/catalog.json https://models.dev/catalog.json
echo "-> api.json"
curl -sL --fail -o data/api.json https://models.dev/api.json
echo "-> labs.html"
curl -sL --fail -o data/labs.html https://models.dev/labs
echo "done: $(ls -lh data | awk 'NR>1 {print $9, $5}' | tr '\n' ' ')"
