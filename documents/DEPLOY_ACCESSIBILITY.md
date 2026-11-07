# Running Project Scripts from Anywhere

All project shell scripts live in **`src/scripts/sh/`** (as in FlashCards). That folder is on the `PATH` of the VS
Code integrated terminal, so every script in it runs from any directory by name:

```bash
cd /anywhere
deploy.sh -dev
release.sh
prod-readonly-check.sh
```

## How it works

### 1. VS Code terminal `PATH` (part of the repo)

`.vscode/settings.json` (used when the folder is opened) and `CSE340.code-workspace` (used when the workspace file
is opened) both set:

```json
"terminal.integrated.env.linux": {
  "PATH": "${workspaceFolder}/src/scripts/sh:${env:PATH}"
}
```

(and the same for `osx`). Every terminal VS Code opens for this project gets the folder on its `PATH`. This needs no
per-machine setup, and **any script added to `src/scripts/sh/` is reachable immediately**.

After changing these settings, open a **new** terminal. Existing terminals keep their old environment. If the
workspace isn't trusted, VS Code ignores `terminal.integrated.env.*`; trust the workspace to enable it.

### 2. The CSE340 terminal profile (and the `deploy` alias)

This project's terminals use the profile **CSE340 bash** (`terminal.integrated.profiles.linux` and
`terminal.integrated.defaultProfile.linux` in both settings files). It starts bash with
`--rcfile .vscode/terminal-rc.sh`, which loads `~/.bashrc` as usual, then puts CSE340's `src/scripts/sh` first on
`PATH` and defines `deploy` as CSE340's `deploy.sh`.

Every project in `~/Documents/Projects` has the same setup (its own `.vscode/terminal-rc.sh` and profile
**<project> bash**), so `deploy` / `release` always run the scripts of the project open in VS Code, from any directory.
Switching projects switches them (open a new terminal). Nothing project-specific is in `~/.bashrc`. iam-service and
heros-companion have no release script of their own: in their terminals `release` runs FlashCards'
`release.sh iam-service` / `release.sh heros-companion`. Projects without a deploy or release script print a message
instead of running another project's. (Until 2026-11-06, `~/.bashrc` put FlashCards' scripts on `PATH` for every
terminal, which made `deploy.sh` in a CSE340 terminal run FlashCards'.)

Check before releasing: `command -v deploy.sh` must print `…/CSE340/src/scripts/sh/deploy.sh`. A terminal opened
before these settings existed may still have the old environment: open a new terminal.

Outside VS Code, call the scripts by path, or add your own alias with a distinct name:

```bash
alias cse340-deploy='$HOME/Documents/Projects/CSE340/src/scripts/sh/deploy.sh'
```

## Adding a new script

1. Put it in `src/scripts/sh/` with a `.sh` extension and a `#!/bin/bash` shebang.
2. Make it executable: `chmod +x src/scripts/sh/<name>.sh` (git keeps the executable bit).
3. If it needs the project root, resolve it from the script's own location, not the current directory:

   ```bash
   SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
   PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
   cd "${PROJECT_ROOT}" || exit 1
   ```

4. Run it from anywhere in a new VS Code terminal: `<name>.sh`.

## Troubleshooting

| Symptom                                   | Fix                                                      |
| ----------------------------------------- | -------------------------------------------------------- |
| `deploy.sh: command not found` in VS Code | Open a new terminal; check that the workspace is trusted |
| `deploy` / `deploy.sh` runs the wrong one | Open a new terminal (profile CSE340 bash)                |
| `Permission denied`                       | `chmod +x src/scripts/sh/<name>.sh`                      |
| Check what will run                       | `type deploy` · `command -v deploy.sh`                   |
