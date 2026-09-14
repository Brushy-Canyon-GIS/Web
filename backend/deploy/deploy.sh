#!/usr/bin/env bash
#
# Deploy the FastAPI backend on the EC2 instance.
#
# Pulls the production branch, restarts the service, waits for it to actually
# serve, and verifies the API works from the outside. If any check fails the
# previous commit is restored and the service restarted, so a bad deploy is
# never left running.
#
# The checks exist because /health alone has lied to us: it reported healthy
# while every layer request returned 401 and browsers rejected the responses
# for carrying two Access-Control-Allow-Origin headers.
#
#   ./backend/deploy/deploy.sh              # deploy production
#   ./backend/deploy/deploy.sh --check      # run verification only, change nothing
#   ./backend/deploy/deploy.sh --force      # redeploy even if already current
#
set -euo pipefail

REPO="${REPO:-/home/ubuntu/geology-backend}"
BRANCH="${BRANCH:-production}"
SERVICE="${SERVICE:-fastapi}"
VENV="${VENV:-$REPO/backend/venv}"
REQUIREMENTS="${REQUIREMENTS:-$REPO/requirements.txt}"

BASE_URL="${BASE_URL:-https://api.outcropanalog.com}"
ORIGIN="${ORIGIN:-https://outcropanalog.com}"

# Largest layer, used to prove a deploy did not silently truncate responses.
LAYER="${LAYER:-fan_geology}"
MIN_FEATURES="${MIN_FEATURES:-2000}"

READY_TIMEOUT="${READY_TIMEOUT:-60}"

CHECK_ONLY=0
FORCE=0
for arg in "$@"; do
  case "$arg" in
    --check|--check-only) CHECK_ONLY=1 ;;
    --force) FORCE=1 ;;
    -h|--help) awk 'NR>1 && /^#/ {sub(/^# ?/,""); print; next} NR>1 {exit}' "$0"; exit 0 ;;
    *) echo "unknown argument: $arg" >&2; exit 2 ;;
  esac
done

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
log()   { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
ok()    { green "    ok    $*"; }
bad()   { red   "    FAIL  $*"; }

# ---------------------------------------------------------------- checks ----

# Each check prints its own result and returns non-zero on failure.

check_health() {
  local body
  body="$(curl -fsS -m 10 "$BASE_URL/health" 2>/dev/null || true)"
  if [[ "$body" == *'"database":"connected"'* ]]; then
    ok "health: $body"
  else
    bad "health: ${body:-no response}"
    return 1
  fi
}

check_layer_open() {
  local code
  code="$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$BASE_URL/api/v1/geologic/$LAYER?limit=1" || true)"
  if [[ "$code" == "200" ]]; then
    ok "layer request without auth header: 200"
  else
    bad "layer request without auth header: $code (401 means auth is on but the frontend sends no key)"
    return 1
  fi
}

check_single_cors_header() {
  local count
  count="$(curl -sI -m 10 -H "Origin: $ORIGIN" "$BASE_URL/health" \
           | grep -ic '^access-control-allow-origin:' || true)"
  if [[ "$count" == "1" ]]; then
    ok "exactly one Access-Control-Allow-Origin header"
  else
    bad "$count Access-Control-Allow-Origin headers (browsers reject anything but 1)"
    return 1
  fi
}

check_not_truncated() {
  local n
  n="$(curl -fsS -m 60 "$BASE_URL/api/v1/geologic/$LAYER" \
       | python3 -c 'import sys,json; print(len(json.load(sys.stdin).get("features",[])))' 2>/dev/null || echo 0)"
  if (( n >= MIN_FEATURES )); then
    ok "$LAYER returned $n features (>= $MIN_FEATURES)"
  else
    bad "$LAYER returned $n features, expected at least $MIN_FEATURES — limit clamp may be truncating"
    return 1
  fi
}

check_bound_to_loopback() {
  local listeners
  listeners="$(ss -tln 2>/dev/null | awk '$4 ~ /:8000$/ {print $4}' || true)"
  if [[ -z "$listeners" ]]; then
    bad "nothing is listening on port 8000"
    return 1
  fi
  if grep -q '0\.0\.0\.0:8000\|\*:8000' <<<"$listeners"; then
    bad "gunicorn is bound to 0.0.0.0:8000 — reachable directly, bypassing nginx and TLS"
    return 1
  fi
  ok "port 8000 bound to loopback only ($listeners)"
}

run_checks() {
  local failed=0
  check_health              || failed=1
  check_layer_open          || failed=1
  check_single_cors_header  || failed=1
  check_not_truncated       || failed=1
  check_bound_to_loopback   || failed=1
  return $failed
}

# ------------------------------------------------------------- lifecycle ----

wait_for_ready() {
  # systemctl returns as soon as the unit is active, which is well before
  # gunicorn has imported pandas/matplotlib and started serving.
  local deadline=$((SECONDS + READY_TIMEOUT))
  while (( SECONDS < deadline )); do
    if curl -fsS -m 5 "$BASE_URL/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

restart_service() {
  sudo systemctl restart "$SERVICE"
  if ! wait_for_ready; then
    bad "service did not answer within ${READY_TIMEOUT}s"
    sudo journalctl -u "$SERVICE" -n 40 --no-pager || true
    return 1
  fi
}

rollback() {
  local sha="$1"
  log "ROLLING BACK to $sha"
  git -C "$REPO" reset --hard "$sha"
  if restart_service && run_checks; then
    green "rollback complete — previous version restored and verified"
  else
    red "ROLLBACK DID NOT RESTORE A WORKING SERVICE — manual intervention needed"
    red "  sudo journalctl -u $SERVICE -n 60 --no-pager"
  fi
}

# ------------------------------------------------------------------ main ----

if (( CHECK_ONLY )); then
  log "Verification only — nothing will be changed"
  if run_checks; then green "all checks passed"; exit 0; else red "checks failed"; exit 1; fi
fi

log "Preflight"
[[ -d "$REPO/.git" ]] || { red "no git repo at $REPO"; exit 1; }
sudo -n true 2>/dev/null || { red "needs sudo for systemctl — run 'sudo -v' first"; exit 1; }

if [[ -n "$(git -C "$REPO" status --porcelain)" ]]; then
  red "working tree at $REPO is dirty — someone edited files on the instance:"
  git -C "$REPO" status --short
  red "commit, stash, or discard those changes before deploying"
  exit 1
fi
ok "working tree clean, sudo available"

PREV_SHA="$(git -C "$REPO" rev-parse HEAD)"
PREV_REQ_HASH="$(sha256sum "$REQUIREMENTS" 2>/dev/null | cut -d' ' -f1 || echo none)"
echo "    current: $(git -C "$REPO" log --oneline -1)"

log "Fetching $BRANCH"
git -C "$REPO" fetch --quiet origin "$BRANCH"
BEHIND="$(git -C "$REPO" rev-list --count "HEAD..origin/$BRANCH")"

if [[ "$BEHIND" == "0" && $FORCE -eq 0 ]]; then
  ok "already up to date with origin/$BRANCH"
  log "Verifying current deployment"
  if run_checks; then green "all checks passed"; exit 0; else red "checks failed on the running version"; exit 1; fi
fi
echo "    $BEHIND commit(s) to apply:"
git -C "$REPO" log --oneline "HEAD..origin/$BRANCH" | sed 's/^/      /'

log "Pulling"
git -C "$REPO" pull --ff-only --quiet origin "$BRANCH"
NEW_SHA="$(git -C "$REPO" rev-parse HEAD)"
ok "now at $(git -C "$REPO" log --oneline -1)"

NEW_REQ_HASH="$(sha256sum "$REQUIREMENTS" 2>/dev/null | cut -d' ' -f1 || echo none)"
if [[ "$PREV_REQ_HASH" != "$NEW_REQ_HASH" ]]; then
  log "requirements.txt changed — installing"
  "$VENV/bin/pip" install --quiet -r "$REQUIREMENTS" || {
    bad "pip install failed"
    rollback "$PREV_SHA"
    exit 1
  }
  ok "dependencies installed"
fi

log "Restarting $SERVICE"
if ! restart_service; then
  rollback "$PREV_SHA"
  exit 1
fi
ok "service is answering"

log "Verifying deployment"
if run_checks; then
  green ""
  green "deployed $PREV_SHA -> $NEW_SHA and verified"
  exit 0
else
  red ""
  red "verification failed after deploying $NEW_SHA"
  rollback "$PREV_SHA"
  exit 1
fi
