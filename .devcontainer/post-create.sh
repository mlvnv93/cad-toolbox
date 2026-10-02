#!/usr/bin/env bash
set -euo pipefail

corepack enable

if [ -f apps/web/pnpm-lock.yaml ]; then
  cd apps/web
  corepack prepare pnpm@latest --activate
  pnpm install --frozen-lockfile
  cd ../..
fi

if [ -f requirements.txt ]; then
  python -m pip install --user -r requirements.txt
fi

if [ -f backend/requirements.txt ]; then
  python -m pip install --user -r backend/requirements.txt
fi

echo "CAD Toolbox Codespace ready. Use GitHub Copilot for implementation and Google Stitch for UI/UX design artifacts."
