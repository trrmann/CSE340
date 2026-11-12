# Render environment management

The project includes a small Node.js CLI for checking and managing Render service environment variables. It reads `RENDER_API_KEY` (or `RENDER_API_TOKEN`) from the project-root `.env` file, the process environment, or the local `secret-tool` keyring entry (`service=render-api`, `key=render-api`). Keep the API key in the ignored local `.env`; never commit it or put it in a Render service's own environment.

Run commands from this project directory:

```sh
npm run render:setup
npm run render:env -- check-token
npm run render:env -- services
npm run render:env -- list
npm run render:env -- check
npm run test:render-env
```

`list` masks values. This project defaults to the `CSE340` Render service; select another service by name or ID with `--service`.

```sh
npm run render:env -- get --key DB_URL
npm run render:env -- set --key SOME_KEY --value "$SOME_VALUE"
npm run render:env -- remove --key UNUSED_KEY --service service-name
npm run render:env -- generate-secret --bytes 32
```

`set` and `remove` write to Render. Check the target service and key before using them; environment changes can affect a running deployment. Avoid placing secret values directly in shell history. `generate-secret` prints a value to stdout and does not upload it. `check` uses this project's configured required-key list; use `--required-key KEY` to check additional keys.
