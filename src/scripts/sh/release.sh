#!/bin/bash

################################################################################
# Release to production with every check enforced. Nothing is pushed unless all
# the steps before it pass. (On PATH; runs from any directory.)
# Modeled on FlashCards' release.sh.
#
# Usage:
#   release.sh cse340 <branch> ["merge message"]
#       1. clean working tree; <branch> exists
#       2. production backup: SKIPPED (CSE340 has no backup step yet; see documents/DEPLOY.md)
#       3. merge <branch> into main locally (--no-ff), then on that exact result:
#          npm run verify (must change nothing), the database tests, and the preview
#          tests over HTTP against a preview server built from that merge. On any
#          failure the local merge is undone; nothing is pushed
#       4. push main: Render deploys
#       5. wait until /api/health reports the new commit, then the read-only
#          production check, compared with the numbers before
#
# A failure stops the release at that step; nothing after it runs. Logs:
# .deployment/release-<time>.log
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
LIVE_WAIT_SECONDS="${LIVE_WAIT_SECONDS:-600}"
PORT_PREVIEW=4000
CSE340_TESTS=(
    test:db
)

LOG_DIR="${PROJECT_ROOT}/.deployment"
mkdir -p "${LOG_DIR}"
LOG_FILE="${LOG_DIR}/release-$(date -u +%Y%m%dT%H%M%SZ).log"

step() { printf '\n==> %s\n' "$*" | tee -a "${LOG_FILE}"; }
fail() { printf 'release: STOPPED: %s\n' "$*" | tee -a "${LOG_FILE}" >&2; exit 1; }

prod_url() {
    grep '^RENDER_URL=' "${PROJECT_ROOT}/.env" | cut -d= -f2- || true
}

# The counts of the read-only production check (no row contents).
production_counts() {
    (cd "${PROJECT_ROOT}" && src/scripts/sh/prod-readonly-check.sh) 2> /dev/null |
        sed -n '/ source /,/rows)/p' | grep '|' | grep -v -- '---' || true
}

require_clean() {
    local dir="$1"
    [ -z "$(git -C "${dir}" status --porcelain)" ] || fail "uncommitted changes in ${dir}"
}

# The version (short commit) a health endpoint reports, or empty.
reported_version() {
    curl -s -m 70 "$1" | node -e '
        let s = "";
        process.stdin.on("data", (c) => (s += c)).on("end", () => {
            try { process.stdout.write(JSON.parse(s).version || ""); } catch { /* not JSON yet */ }
        });'
}

# Wait until <health url> reports <commit> (short); stop after LIVE_WAIT_SECONDS.
wait_until_live() {
    local url="$1" commit="${2:0:7}" waited=0 seen
    while [ "${waited}" -lt "${LIVE_WAIT_SECONDS}" ]; do
        seen="$(reported_version "${url}")"
        if [ "${seen}" = "${commit}" ]; then
            echo "live: ${url} reports ${commit} after ${waited}s" | tee -a "${LOG_FILE}"
            return 0
        fi
        sleep 15
        waited=$((waited + 15))
    done
    fail "${url} did not report ${commit} within ${LIVE_WAIT_SECONDS}s (last: ${seen:-none}); check Render's deploy log"
}

backup_production() {
    step "Production backup"
    echo "skipped: CSE340 has no backup step yet (see documents/DEPLOY.md)" | tee -a "${LOG_FILE}"
}

# Preview tests over HTTP: start a preview server from the checked-out merge, test it, stop it.
run_preview_over_http() {
    step "test:preview (HTTP, preview server on port ${PORT_PREVIEW})"
    if lsof -i :"${PORT_PREVIEW}" &> /dev/null; then
        kill -9 $(lsof -t -i :"${PORT_PREVIEW}") 2> /dev/null || true
        sleep 1
    fi
    (cd "${PROJECT_ROOT}" && PORT=${PORT_PREVIEW} NODE_ENV=preview DB_READ_ONLY=false node --env-file=.env server.js) >> "${LOG_FILE}" 2>&1 &
    local pid=$!
    local waited=0
    until curl -sf "http://localhost:${PORT_PREVIEW}/api/health" > /dev/null 2>&1; do
        sleep 1
        waited=$((waited + 1))
        [ "${waited}" -lt 90 ] || { kill "${pid}" 2> /dev/null || true; fail "preview server did not become healthy (see ${LOG_FILE})"; }
    done
    if ! (cd "${PROJECT_ROOT}" && TEST_BASE_URL="http://localhost:${PORT_PREVIEW}" npm run -s test:preview) >> "${LOG_FILE}" 2>&1; then
        kill "${pid}" 2> /dev/null || true
        grep -E '✅|❌|FAILED' "${LOG_FILE}" | tail -8
        fail "test:preview failed (see ${LOG_FILE})"
    fi
    kill "${pid}" 2> /dev/null || true
    grep -E 'ALL TESTS PASSED|Passed:' "${LOG_FILE}" | tail -2
}

run_cse340_checks() {
    step "Format and lint (npm run verify); it must change nothing"
    (cd "${PROJECT_ROOT}" && npm run -s verify) >> "${LOG_FILE}" 2>&1 || fail "verify failed (see ${LOG_FILE})"
    require_clean "${PROJECT_ROOT}"
    for test_name in "${CSE340_TESTS[@]}"; do
        step "${test_name}"
        if ! (cd "${PROJECT_ROOT}" && npm run -s "${test_name}") >> "${LOG_FILE}" 2>&1; then
            grep -E '✗|ALL TESTS PASSED|TESTS FAILED' "${LOG_FILE}" | tail -5
            fail "${test_name} failed (see ${LOG_FILE})"
        fi
        grep -E 'Passed:' "${LOG_FILE}" | tail -1
    done
    run_preview_over_http
}

release_cse340() {
    local branch="${1:-}" message="${2:-}"
    [ -n "${branch}" ] || fail "usage: release.sh cse340 <branch> [\"merge message\"]"
    cd "${PROJECT_ROOT}"
    require_clean "${PROJECT_ROOT}"
    git rev-parse --verify --quiet "${branch}" > /dev/null || fail "no branch ${branch}"
    [ "${branch}" != "main" ] || fail "release a branch, not main itself"

    backup_production
    step "Production before"
    local before
    before="$(production_counts)"
    echo "${before}" | tee -a "${LOG_FILE}"

    step "Merge ${branch} into main (locally) and check the result"
    git checkout -q main
    git pull -q --ff-only
    local base
    base="$(git rev-parse HEAD)"
    git merge -q --no-ff "${branch}" -m "${message:-Release ${branch}}

Released with release.sh: npm run verify, the database tests and the
preview tests passed on this merge before it was pushed (log ${LOG_FILE##*/}).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" ||
        { git merge --abort 2> /dev/null || true; fail "${branch} does not merge cleanly into main"; }
    # Undo the local merge if any check fails (nothing has been pushed yet).
    trap 'git -C "${PROJECT_ROOT}" reset -q --hard "${base}"; echo "release: local merge undone" >&2' EXIT
    run_cse340_checks
    trap - EXIT

    step "Push main"
    git push -q origin main
    local commit
    commit="$(git rev-parse HEAD)"
    echo "pushed ${commit:0:7}" | tee -a "${LOG_FILE}"

    step "Waiting for production to run ${commit:0:7}"
    wait_until_live "$(prod_url)/api/health" "${commit}"

    step "Production after"
    local after
    after="$(production_counts)"
    echo "${after}" | tee -a "${LOG_FILE}"
    if [ "${before}" != "${after}" ]; then
        echo "note: production numbers changed during the release (people may be using it):" | tee -a "${LOG_FILE}"
        diff <(echo "${before}") <(echo "${after}") | tee -a "${LOG_FILE}" || true
    fi
    step "Released ${branch} as ${commit:0:7}"
}

case "${1:-}" in
    cse340) release_cse340 "${2:-}" "${3:-}" ;;
    *)
        sed -n '4,22p' "$0" | sed 's/^# \{0,1\}//'
        exit 2
        ;;
esac
