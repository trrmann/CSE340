# CSE340 Deploy Scripts

> Modeled on FlashCards' deployment strategy (`../FlashCards/documents/DEPLOY.md`). Same scripts, flags, ports,
> logging and release gate; the differences for CSE340 are listed under
> [Differences from FlashCards](#differences-from-flashcards).

> **Location:** `src/scripts/sh/`. That folder is on the VS Code terminal `PATH`, so run `deploy.sh …` or
> `release.sh …` from any directory. See [DEPLOY_ACCESSIBILITY.md](./DEPLOY_ACCESSIBILITY.md).

One-command deployments to dev, preview, prod, or all environments.

## Releasing to production: `release.sh` (preferred)

`release.sh` releases with every check enforced; nothing is pushed unless every step before it passes.

```bash
release.sh cse340 <branch> ["merge message"]   # Render deploys from main
```

`release.sh cse340 <branch>`:

1. Stops on uncommitted changes, a missing branch, or `main` itself.
2. Production backup: **skipped** (CSE340 has no backup step yet; see below).
3. Records the read-only production numbers (`prod-readonly-check.sh`: row counts only).
4. Merges the branch into `main` locally (`--no-ff`) and, on that exact merge, runs `npm run verify` (must change
   nothing), the database tests (`npm run test:db`), then starts a preview server from the merge and runs the preview
   tests over HTTP (`npm run test:preview`). On any failure the local merge is undone and nothing is pushed.
5. Pushes `main`, waits until `/api/health` reports the pushed commit (`version`, from Render's `RENDER_GIT_COMMIT`),
   and shows the read-only production numbers before and after.

Every run is logged to `.deployment/release-<time>.log`.

**Letting an assistant release without asking each time:** allow only `"Bash(release.sh cse340:*)"` in
`.claude/settings.local.json`, and no `"Bash(git push origin main)"` rule, so releases can only go through the checks.

## Quick Start

```bash
deploy.sh -dev              # Development (local server on 5000)
deploy.sh -preview          # Preview (local server on 4000, full quality gate)
deploy.sh -preview --remote # Preview with the class database READ-ONLY
deploy.sh -prod             # Production (push main; Render auto-deploys)
deploy.sh -all              # dev -> preview -> prod, pausing between each
```

## What It Does

### For Each Deployment

1. **Checks prerequisites**: Node.js, npm, git; `.env` and `server.js` in the project root.
2. **Checks git status**: current branch; warns about uncommitted changes.
3. **Checks dependencies**: runs `npm install` if `node_modules` is missing.
4. **Runs checks** (non-blocking): lint.
5. **Deploys**
   - Dev: starts `NODE_ENV=development npm run dev` on localhost:5000 and waits for `/api/health`.
   - Preview: **strict** `npm run format` + `npm run lint` (abort on failure), starts `NODE_ENV=preview npm run dev`
     on localhost:4000, runs `npm run test:preview` (abort on failure), then `npm run test:db` (abort on failure;
     skipped with `--remote`). The server keeps running.
   - Prod: Prettier, auto-commit of formatting changes, push to GitHub `main` (triggers Render auto-deploy).
6. **Opens the browser**: dev http://localhost:5000, preview http://localhost:4000, prod `RENDER_URL` from `.env`.
7. **Logs everything** to `.deployment/last-run.log` (only the last run is kept; git-ignored).

## Environments

| Environment         | Server         | Database                               | Writes                    |
| ------------------- | -------------- | -------------------------------------- | ------------------------- |
| `-dev`              | localhost:5000 | class database (`DB_URL`)              | yes, like `npm run dev`   |
| `-preview`          | localhost:4000 | class database (`DB_URL`)              | yes                       |
| `-preview --remote` | localhost:4000 | class database, `DB_READ_ONLY=true`    | **refused by PostgreSQL** |
| `-prod`             | Render         | class database (Render's internal URL) | yes                       |

`-all` runs dev, preview and prod in sequence and pauses between them (press Enter).

## Quality gate

| Command                | What it checks                                                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run verify`       | Prettier (`npm run format`) then ESLint (`npm run lint`); config copied from FlashCards                                                                     |
| `npm run test:preview` | Every page: HTTP 200, Lighthouse, HTML validation, CSS analysis, memory, Core Web Vitals (needs a running server)                                           |
| `npm run test:db`      | Provisioning order 1-4, reruns, partial rebuilds, `truncateAll` / `dropAll` order, prerequisite and order errors, `src/setup.sql` in sync with provisioning |

Lighthouse and HTML validation findings are **warnings** (reported, not blocking), as in FlashCards; any **failure**
stops a preview or release.

`npm run test:db` uses only the class database: it works in temporary schemas named `cse340_test_*`, which are
dropped afterwards (also when a test fails). The app's own schema is never touched.

## Health endpoint

`GET /api/health` answers **503** until the database is provisioned and reachable, then **200** with:

```json
{
  "status": "healthy",
  "version": "abc1234",
  "schema": "public",
  "readOnly": false,
  "timestamp": "…"
}
```

`version` is the deployed commit (`RENDER_GIT_COMMIT`, set by Render; `null` locally). `release.sh` waits for it to
match the pushed commit.

## Read-only checks

```bash
prod-readonly-check.sh
```

Runs `src/scripts/sql/prod-readonly-checks.sql` against the class database in a read-only session: which tables
exist, row counts per table, and the session's rights. No row contents. Takes no arguments.

## Requirements

- `.env` with `DB_URL` (class database), optional `DB_SCHEMA` (default `public`), and `RENDER_URL`
  (`https://cse340-qdjd.onrender.com`; enables the production health check and browser open).
- `server.js`, a git repository with the GitHub remote.
- `lsof`, `curl`, `psql` (port cleanup, health checks, read-only check).

## Stopping Services

```bash
kill $(lsof -t -i :5000)   # dev
kill $(lsof -t -i :4000)   # preview
```

This stops the server process; the `nodemon` watcher that started it can keep running in the background. To stop
it too: `pkill -f "nodemon"` (stops every nodemon on the machine), or close the terminal it was started from.

## Differences from FlashCards

| FlashCards                                                                 | CSE340                                                                                           |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Dev/preview use a local PostgreSQL cluster (`platform-db`), `pull-prod.sh` | Only the class database (`DB_URL`); no local cluster, no extra databases                         |
| `-preview --remote` = production read-only                                 | `-preview --remote` = class database read-only (`DB_READ_ONLY=true`); database tests skipped     |
| Pre-release backup (`backup.sh`, `backup-login.sh`, `restore.sh`)          | **No backup yet** (no admin account until W05); `deploy.sh -prod` and `release.sh` log "skipped" |
| Local-database test suites (round trip, IAM, start-up, clean-up, …)        | `npm run test:db` in temporary schemas of the class database                                     |
| `render-build.sh` (private GitHub packages)                                | Not needed: no private packages; Render's build command stays `npm install`                      |
| `release.sh flashcards / iam-service / heros-companion`                    | `release.sh cse340`                                                                              |
| Server ports from `PORT_DEV` / `PORT_PREVIEW`                              | The scripts export `PORT` (CSE340's server reads `PORT`)                                         |
| Auto-format commit credits Copilot                                         | Auto-format commit has no co-author line                                                         |

## Troubleshooting

| Symptom                        | Fix                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `deploy.sh: command not found` | Open a new VS Code terminal; trust the workspace (see DEPLOY_ACCESSIBILITY)  |
| `Permission denied`            | `chmod +x src/scripts/sh/<name>.sh`                                          |
| Port 5000/4000 in use          | The script kills the old process; otherwise `lsof -i :5000`, `kill -9 <PID>` |
| Server never becomes healthy   | `curl localhost:5000/api/health` shows the error; check `DB_URL` in `.env`   |
| Preview tests fail             | `.deployment/last-run.log` has the full test output                          |
| `git push failed` in prod      | Check the branch and remote, commit, then rerun `deploy.sh -prod`            |

## Exit Codes

- `0` - Successful deployment
- `1` - Error (logged to `.deployment/last-run.log`)
