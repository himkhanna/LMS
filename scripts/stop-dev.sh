#!/usr/bin/env bash
# Stop services started by start-dev.sh.
set -euo pipefail

cd "$(dirname "$0")/.."
LOG_DIR="./logs"

for name in auth course ai-gateway; do
  pid_file="$LOG_DIR/$name.pid"
  if [[ -f "$pid_file" ]]; then
    pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      echo "Stopping $name (pid $pid)..."
      # Spring Boot forks a child; kill the process group.
      pkill -P "$pid" 2>/dev/null || true
      kill "$pid" 2>/dev/null || true
    else
      echo "$name not running"
    fi
    rm -f "$pid_file"
  else
    echo "$name has no pid file"
  fi
done
echo "Done. Postgres containers are untouched. Run 'docker compose down' to stop them too."
