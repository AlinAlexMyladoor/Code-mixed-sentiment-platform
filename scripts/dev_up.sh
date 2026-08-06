#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Starting infrastructure (Postgres, Redis, MongoDB)..."
docker compose -f "$ROOT/docker-compose.yml" up -d

echo "Initializing database..."
cd "$ROOT/backend"
python init_db.py

echo "Done. Run in separate terminals:"
echo "  cd backend && uvicorn main:app --reload --port 8000"
echo "  cd backend && python worker.py"
echo "  cd frontend && npm run dev"
