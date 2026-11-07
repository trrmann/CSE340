# Startup file for this project's VS Code terminals (profile "CSE340 bash").
# Loads ~/.bashrc as usual, then makes deploy / release run THIS project's scripts from any
# directory. Every project in ~/Documents/Projects has its own copy, so switching the project
# open in VS Code (and opening a new terminal) switches the scripts too. Nothing is global.
[ -f "${HOME}/.bashrc" ] && . "${HOME}/.bashrc"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="${PROJECT_DIR}/src/scripts/sh:${PATH}"
unalias deploy release 2> /dev/null
unset -f deploy.sh release.sh 2> /dev/null
if [ -x "${PROJECT_DIR}/src/scripts/sh/deploy.sh" ]; then
    alias deploy="${PROJECT_DIR}/src/scripts/sh/deploy.sh"
else
    deploy() { echo "CSE340 has no deploy script (src/scripts/sh/deploy.sh)" >&2; return 1; }
fi
if [ -x "${PROJECT_DIR}/src/scripts/sh/release.sh" ]; then
    alias release="${PROJECT_DIR}/src/scripts/sh/release.sh"
fi
