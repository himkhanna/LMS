#!/usr/bin/env bash
# Start the 3 core LMS backends in the background.
# Postgres must already be running: `docker compose up -d` from the repo root.
#
# Logs:   ./logs/<service>.log
# PIDs:   ./logs/<service>.pid
# Stop:   ./scripts/stop-dev.sh

set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"

export JWT_SECRET="${JWT_SECRET:-dev-only-secret-change-me-please-32+chars-needed-for-hs256}"
export BOOTSTRAP_ADMIN_EMAIL="${BOOTSTRAP_ADMIN_EMAIL:-admin@idc.local}"
export BOOTSTRAP_ADMIN_PASSWORD="${BOOTSTRAP_ADMIN_PASSWORD:-AdminPass!123}"

start() {
  local name=$1
  local dir=$2
  local pid_file="$LOG_DIR/$name.pid"
  if [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    echo "$name already running (pid $(cat "$pid_file"))"
    return
  fi
  echo "Starting $name..."
  (cd "$ROOT/services/$dir" && nohup mvn -q spring-boot:run >"$LOG_DIR/$name.log" 2>&1 &
   echo $! >"$pid_file")
  sleep 1
  echo "  pid $(cat "$pid_file") · tail: tail -f $LOG_DIR/$name.log"
}

start auth         auth-service
start course       course-service
start ai-gateway   ai-gateway-service

cat <<EOF

Three services starting. They take ~30s on first run while Spring Boot fires up.
Watch readiness:

  curl -s http://localhost:8083/actuator/health   # auth
  curl -s http://localhost:8081/actuator/health   # course
  curl -s http://localhost:8082/actuator/health   # ai-gateway

Bootstrap admin (after auth-service is up):
  email:    $BOOTSTRAP_ADMIN_EMAIL
  password: $BOOTSTRAP_ADMIN_PASSWORD

Stop everything: ./scripts/stop-dev.sh
EOF
