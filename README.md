# NodeBB Safe Updater

A conservative utility that keeps a NodeBB forum up to date safely.

This repository includes a CLI update tool and a NodeBB admin plugin with a one-click update action.

## Features

- Verifies the target directory using Git itself (including linked worktrees).
- Refuses to run on a dirty working tree unless explicitly allowed.
- Creates a backup outside the target repository before updating.
- Fetches the selected branch and only fast-forwards it; existing local commits are not reset.
- Runs `npm install`, `yarn install`, or `pnpm install` when the project has a `package.json`.
- Restricts the NodeBB update endpoint to administrators and prevents overlapping updates.

## Install as a NodeBB plugin

1. Copy the repository into your NodeBB plugin directory, for example `plugins/nodebb-safe-updater/`.
2. Configure the environment variables for the NodeBB server as needed:

   ```bash
   export NODEBB_DIRECTORY=/srv/nodebb
   export NODEBB_BRANCH=main
   export NODEBB_REMOTE=origin
   export NODEBB_ALLOW_DIRTY=false
   export NODEBB_SKIP_INSTALL=false
   # Optional; must be outside NODEBB_DIRECTORY
   export NODEBB_BACKUP_ROOT=/var/backups/nodebb-safe-updater
   ```

3. Restart NodeBB, then open **Admin → Plugins → NodeBB Safe Updater**.

The admin page is `/admin/plugins/nodebb-safe-updater`; its update endpoint is `/api/v3/plugins/nodebb-safe-updater/update`. Both are protected by NodeBB's admin middleware.

## Standalone web updater

Run `npm start` to start the optional standalone updater. It binds to `127.0.0.1` by default, serves the UI at `/`, and accepts updates at `/api/update`. The UI uses a per-process token and cross-origin requests are rejected. Do not expose this service publicly; use a trusted reverse proxy and appropriate access controls if remote access is required.

Configuration:

```bash
export NODEBB_DIRECTORY=/srv/nodebb
export NODEBB_UPDATER_PORT=3000
export NODEBB_UPDATER_HOST=127.0.0.1
# Optional; an ephemeral token is generated when omitted
export NODEBB_UPDATER_TOKEN='use-a-long-random-secret'
```

## CLI usage

Update the current directory:

```bash
node src/index.js
```

Update a specific installation:

```bash
node src/index.js --directory /srv/nodebb --branch main --remote origin
```

Allow a dirty working tree or skip dependency installation:

```bash
node src/index.js --directory /srv/nodebb --allow-dirty
node src/index.js --directory /srv/nodebb --skip-install
```

## Safety notes

The updater aborts on a dirty repository by default, creates a backup before updating, and uses `git pull --ff-only`. `--allow-dirty` permits the update to proceed with local changes; review the backup and working tree carefully before using it. Backup folders must be outside the target repository.

## Example result

```json
{
  "ok": true,
  "directory": "/srv/nodebb",
  "branch": "main",
  "remote": "origin",
  "backupDir": "/tmp/nodebb-safe-updater/nodebb-backup-2026-10-24T12-00-00-000Z",
  "statusBefore": "",
  "statusAfter": "",
  "packageManager": "npm"
}
```
